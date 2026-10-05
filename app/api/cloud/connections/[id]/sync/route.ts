export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { assumeRole, makeIAMClient, makeS3Client, makeEC2Client } from '@/lib/cloud/aws/client';
import { analyzeIAM } from '@/lib/cloud/aws/iam-analyzer';
import { analyzeS3 } from '@/lib/cloud/aws/s3-analyzer';
import { analyzeSecurityGroups } from '@/lib/cloud/aws/security-group';
import { calculateCloudRiskScore, summarizeFindings } from '@/lib/cloud/risk-scorer';
import { createNotification } from '@/lib/notifications';
import { writeAuditLog } from '@/lib/audit';

interface P { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { id } = await params;

    const conn = await db.cloudConnection.findUnique({ where: { id } });
    if (!conn) return apiError('NOT_FOUND', 'Connection not found', 404);
    await requirePermission(conn.organizationId, session.user.id, 'cloud:connect');

    if (!conn.isActive) return apiError('VALIDATION_ERROR', 'Connection is disabled', 400);

    // Atomically claim the sync slot (once per 15 minutes per connection).
    // Using updateMany with the staleness condition in the WHERE clause —
    // rather than reading lastSyncedAt then writing it much later after the
    // scan completes — closes a race where two concurrent sync requests
    // could both read a stale lastSyncedAt and both proceed, doubling AWS
    // API calls/costs and creating duplicate scan records.
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const claim = await db.cloudConnection.updateMany({
      where: {
        id: conn.id,
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: fifteenMinAgo } }],
      },
      data: { lastSyncedAt: new Date() },
    });
    if (claim.count === 0) {
      const minsSinceSync = conn.lastSyncedAt ? (Date.now() - conn.lastSyncedAt.getTime()) / 60000 : 0;
      return apiError(
        'RATE_LIMITED',
        `Cloud scan was run ${Math.round(minsSinceSync)} minutes ago. Please wait ${Math.round(15 - minsSinceSync)} more minutes.`,
        429
      );
    }

    const startTime = Date.now();

    // Create scan record
    const org = await db.organization.findUnique({ where: { id: conn.organizationId }, select: { name: true } });
    const scan = await db.scan.create({
      data: {
        organizationId: conn.organizationId,
        createdById: session.user.id,
        type: 'CLOUD',
        status: 'RUNNING',
        input: `AWS Account: ${conn.accountId} | Region: ${conn.region ?? 'us-east-1'}`,
        engineVersion: 'zyphorix-cloud-v1.0',
        startedAt: new Date(),
      },
    });

    try {
      // Assume the customer's IAM role
      const creds = await assumeRole(conn.credentialsRef);
      const region = conn.region ?? 'us-east-1';

      const iamClient = makeIAMClient(creds);
      const s3Client = makeS3Client(creds, region);
      const ec2Client = makeEC2Client(creds, region);

      // Run all analyzers in parallel
      const [iamResult, s3Result, sgResult] = await Promise.allSettled([
        analyzeIAM(iamClient),
        analyzeS3(s3Client),
        analyzeSecurityGroups(ec2Client, region),
      ]);

      const allFindings = [
        ...(iamResult.status === 'fulfilled' ? iamResult.value.findings : []),
        ...(s3Result.status === 'fulfilled' ? s3Result.value.findings : []),
        ...(sgResult.status === 'fulfilled' ? sgResult.value.findings : []),
      ];

      const allAssets = [
        ...(iamResult.status === 'fulfilled' ? iamResult.value.assets : []),
        ...(s3Result.status === 'fulfilled' ? s3Result.value.assets : []),
        ...(sgResult.status === 'fulfilled' ? sgResult.value.assets : []),
      ];

      const riskScore = calculateCloudRiskScore(allFindings);
      const summary = summarizeFindings(allFindings);
      const durationMs = Date.now() - startTime;

      // Persist everything in one transaction
      await db.$transaction(async (tx) => {
        // Update scan
        await tx.scan.update({
          where: { id: scan.id },
          data: {
            status: 'COMPLETED',
            riskScore,
            riskLevel: riskScore >= 86 ? 'CRITICAL' : riskScore >= 66 ? 'HIGH' : riskScore >= 41 ? 'MEDIUM' : riskScore >= 21 ? 'LOW' : 'SAFE',
            classification: `AWS Cloud Security Scan — ${summary.total} finding(s)`,
            summary: `Scanned AWS account ${conn.accountId}. Found ${summary.critical} critical, ${summary.high} high, ${summary.medium} medium findings.`,
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
              indicator: f.resourceId,
              evidence: f.evidence as any,
            })),
          });
        }

        // Save report
        await tx.scanReport.create({
          data: {
            scanId: scan.id,
            executiveSummary: `Cloud security analysis of AWS account ${conn.accountId} completed. Risk score: ${riskScore}/100. ${summary.critical} critical and ${summary.high} high severity findings require immediate attention.`,
            technicalDetails: { summary, servicesAnalyzed: ['IAM', 'S3', 'EC2'], accountId: conn.accountId, region } as any,
            recommendations: summary.topFindings as any,
            aiExplanation: `This cloud security scan analyzed IAM configuration, S3 bucket exposure, and EC2 security groups for AWS account ${conn.accountId}. ${allFindings.filter(f => f.severity === 'CRITICAL').length > 0 ? `Critical issues were found that require immediate remediation: ${allFindings.filter(f => f.severity === 'CRITICAL').slice(0, 2).map(f => f.title).join(', ')}.` : 'No critical issues were detected.'} Review all findings and prioritize remediation by severity.`,
          },
        });

        // Update connection sync time
        await tx.cloudConnection.update({
          where: { id: conn.id },
          data: { lastSyncedAt: new Date() },
        });

        // Add discovered assets to inventory (deduplicate by value)
        for (const asset of allAssets.slice(0, 100)) {
          const existing = await tx.asset.findFirst({
            where: { organizationId: conn.organizationId, value: asset.value },
          });
          if (!existing) {
            await tx.asset.create({
              data: {
                organizationId: conn.organizationId,
                type: 'CLOUD_RESOURCE',
                name: asset.name,
                value: asset.value,
                tags: ['aws', conn.name.toLowerCase().replace(/\s+/g, '-')],
                lastScannedAt: new Date(),
              },
            });
          }
        }
      });

      // Notify on high-risk findings
      if (riskScore >= 66 || summary.critical > 0) {
        await createNotification({
          organizationId: conn.organizationId,
          type: 'CLOUD_ISSUE_FOUND',
          title: `Cloud security issues found in ${conn.name}`,
          message: `${summary.critical} critical, ${summary.high} high severity findings in AWS account ${conn.accountId}.`,
          severity: summary.critical > 0 ? 'CRITICAL' : 'HIGH',
          actionUrl: `/cloud/${conn.id}`,
        });
      }

      await writeAuditLog({
        organizationId: conn.organizationId,
        userId: session.user.id,
        action: 'SCAN_COMPLETED',
        resource: 'cloud_scan',
        resourceId: scan.id,
        metadata: { connectionId: conn.id, accountId: conn.accountId, findingsCount: allFindings.length, riskScore },
      });

      return apiSuccess({
        scanId: scan.id,
        riskScore,
        findingsCount: allFindings.length,
        summary,
        durationMs,
      });

    } catch (scanErr: any) {
      // Mark scan failed
      await db.scan.update({
        where: { id: scan.id },
        data: { status: 'FAILED', completedAt: new Date(), durationMs: Date.now() - startTime },
      }).catch(() => {});

      const msg = scanErr.message ?? 'Cloud scan failed';
      if (msg.includes('AccessDenied') || msg.includes('is not authorized')) {
        return apiError('CLOUD_AUTH_ERROR', 'Access denied. Ensure the IAM role has the correct trust policy and permissions.', 403);
      }
      if (msg.includes('NoSuchEntity') || msg.includes('InvalidClientTokenId')) {
        return apiError('CLOUD_AUTH_ERROR', 'Invalid AWS credentials or role ARN. Please check your connection configuration.', 401);
      }
      return apiError('CLOUD_SCAN_ERROR', msg, 500);
    }
  } catch (e) { return handleApiError(e); }
}
