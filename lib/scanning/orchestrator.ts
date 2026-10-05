import { db } from '@/lib/db';
import { recordScanUsage } from '@/lib/billing';
import { createNotification } from '@/lib/notifications';
import { writeAuditLog } from '@/lib/audit';
import { alertThreatDetected } from '@/lib/integrations/dispatcher';
import { aggregateRiskScores, scoreToLevel } from './providers/base';
import { UrlHeuristicProvider } from './providers/url-heuristic';
import { EmailHeuristicProvider } from './providers/email-heuristic';
import { FileStaticProvider } from './providers/file-static';
import { DomainIpProvider } from './providers/domain-ip';
import { generateReport } from './report-generator';
import type { ScanProvider, ScanInput, ScanProviderResult } from './providers/base';
import crypto from 'crypto';

// ─── Provider registry ─────────────────────────────────────────────────────
const PROVIDERS: ScanProvider[] = [
  new UrlHeuristicProvider(),
  new EmailHeuristicProvider(),
  new FileStaticProvider(),
  new DomainIpProvider(),
];

function getProviders(type: ScanInput['type']): ScanProvider[] {
  return PROVIDERS.filter(p => p.supportedTypes.includes(type));
}

// ─── Main orchestrator function ────────────────────────────────────────────

export interface OrchestratorInput {
  organizationId: string;
  createdById: string;
  type: 'URL' | 'EMAIL' | 'FILE' | 'DOMAIN_IP';
  input: string;
  filename?: string;
  mimeType?: string;
  orgName: string;
}

export interface OrchestratorResult {
  scanId: string;
  riskScore: number;
  riskLevel: string;
  classification: string;
  summary: string;
  findingsCount: number;
  durationMs: number;
}

export async function runScan(params: OrchestratorInput): Promise<OrchestratorResult> {
  const startTime = Date.now();

  // Hash input for deduplication (same org + same input = cache for 5 min)
  const inputHash = crypto.createHash('sha256')
    .update(`${params.organizationId}:${params.type}:${params.input.substring(0, 1000)}`)
    .digest('hex');

  // Create scan record in QUEUED state
  const scan = await db.scan.create({
    data: {
      organizationId: params.organizationId,
      createdById: params.createdById,
      type: params.type,
      status: 'QUEUED',
      input: params.input.substring(0, 10000), // cap at 10KB
      inputHash,
      engineVersion: 'zyphorix-v2.1',
      startedAt: new Date(),
    },
  });

  // Update to RUNNING
  await db.scan.update({ where: { id: scan.id }, data: { status: 'RUNNING' } });

  try {
    const scanInput: ScanInput = {
      type: params.type,
      value: params.input,
      filename: params.filename,
      mimeType: params.mimeType,
    };

    // Run all applicable providers in parallel
    const providers = getProviders(params.type);
    const providerResults = await Promise.allSettled(
      providers.map(p => p.analyze(scanInput))
    );

    const successfulResults: ScanProviderResult[] = providerResults
      .filter((r): r is PromiseFulfilledResult<ScanProviderResult> => r.status === 'fulfilled')
      .map(r => r.value);

    if (successfulResults.length === 0) {
      throw new Error('All scan providers failed');
    }

    // Aggregate results
    const riskScore = aggregateRiskScores(successfulResults.map(r => r.riskScore));
    const riskLevel = scoreToLevel(riskScore);
    const classification = successfulResults.sort((a, b) => b.riskScore - a.riskScore)[0].classification;
    const allFindings = successfulResults.flatMap(r => r.findings);
    const summary = allFindings.length === 0
      ? `No threats detected. The ${params.type} appears clean.`
      : `Detected ${allFindings.length} indicator(s): ${allFindings.slice(0, 2).map(f => f.title).join(', ')}.`;

    // Generate structured report
    const report = await generateReport({
      scanType: params.type,
      input: params.input,
      riskScore,
      riskLevel,
      classification,
      providerResults: successfulResults,
      orgName: params.orgName,
    });

    const durationMs = Date.now() - startTime;

    // Persist all results atomically
    await db.$transaction(async (tx) => {
      // Update scan record
      await tx.scan.update({
        where: { id: scan.id },
        data: {
          status: 'COMPLETED',
          riskScore,
          riskLevel: riskLevel as any,
          classification,
          summary,
          completedAt: new Date(),
          durationMs,
        },
      });

      // Save findings
      if (allFindings.length > 0) {
        await tx.scanFinding.createMany({
          data: allFindings.map(f => ({
            scanId: scan.id,
            title: f.title,
            description: f.description,
            severity: f.severity as any,
            category: f.category,
            indicator: f.indicator,
            mitreAttack: f.mitreAttack,
            evidence: f.evidence,
          })),
        });
      }

      // Save report
      await tx.scanReport.create({
        data: {
          scanId: scan.id,
          executiveSummary: report.executiveSummary,
          technicalDetails: report.technicalDetails as any,
          recommendations: report.recommendations as any,
          aiExplanation: report.aiExplanation,
          mitreMapping: report.mitreMapping as any,
        },
      });
    });

    // Record usage
    await recordScanUsage(params.organizationId);


    // Fire integrations (Slack/webhook) for high-severity findings
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      alertThreatDetected(params.organizationId, {
        scanType: params.type,
        riskLevel,
        riskScore,
        summary,
        scanId: scan.id,
      }).catch(() => {});
    }

    // Notify on high-severity findings (fire and forget)
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      createNotification({
        organizationId: params.organizationId,
        type: 'THREAT_DETECTED',
        title: `${riskLevel} threat detected`,
        message: summary,
        severity: riskLevel as any,
        actionUrl: `/scans/${scan.id}`,
      }).catch(() => {});
    }

    // Audit log
    await writeAuditLog({
      organizationId: params.organizationId,
      userId: params.createdById,
      action: 'SCAN_COMPLETED',
      resource: 'scan',
      resourceId: scan.id,
      metadata: { type: params.type, riskLevel, riskScore },
    });

    return { scanId: scan.id, riskScore, riskLevel, classification, summary, findingsCount: allFindings.length, durationMs };

  } catch (error) {
    // Mark scan as failed
    await db.scan.update({
      where: { id: scan.id },
      data: { status: 'FAILED', completedAt: new Date(), durationMs: Date.now() - startTime },
    }).catch(() => {});
    throw error;
  }
}
