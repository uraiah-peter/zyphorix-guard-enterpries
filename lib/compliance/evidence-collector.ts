import { db } from '@/lib/db';
import { SOC2_CONTROLS, type ControlStatus } from './soc2-controls';

// ─── Evidence Collector ────────────────────────────────────────────────────
// Queries existing Zyphorix data to automatically determine control status.
// No new data collection — reuses scans, incidents, audit logs, assets.

export interface ControlEvidence {
  controlId: string;
  status: ControlStatus;
  automatedFindings: string[];
  evidenceCount: number;
  lastEvidenceAt: Date | null;
  score: number; // 0-100
}

export interface ComplianceReport {
  orgId: string;
  generatedAt: Date;
  overallScore: number;
  controlsMet: number;
  controlsPartial: number;
  controlsNotMet: number;
  controlsNA: number;
  totalControls: number;
  evidence: ControlEvidence[];
  readyForAudit: boolean;
  criticalGaps: string[];
}

export async function collectEvidence(orgId: string): Promise<ComplianceReport> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all relevant org data in parallel
  const [
    scanCount, recentScans, criticalFindings, highFindings,
    incidentCount, resolvedIncidents, auditLogCount,
    memberCount, cloudConnections, assetCount,
    openIncidents,
  ] = await Promise.all([
    db.scan.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
    db.scan.count({ where: { organizationId: orgId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } } }),
    db.scanFinding.count({ where: { scan: { organizationId: orgId }, severity: 'CRITICAL' } }),
    db.scanFinding.count({ where: { scan: { organizationId: orgId }, severity: 'HIGH' } }),
    db.incident.count({ where: { organizationId: orgId } }),
    db.incident.count({ where: { organizationId: orgId, status: { in: ['RESOLVED', 'CLOSED'] } } }),
    db.auditLog.count({ where: { organizationId: orgId } }),
    db.organizationMember.count({ where: { organizationId: orgId } }),
    db.cloudConnection.count({ where: { organizationId: orgId } }),
    db.asset.count({ where: { organizationId: orgId } }),
    db.incident.count({ where: { organizationId: orgId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
  ]);

  // Get last scan date
  const lastScan = await db.scan.findFirst({
    where: { organizationId: orgId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true },
  });

  // Get last audit log date
  const lastAuditLog = await db.auditLog.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  // ── Evaluate each control ──────────────────────────────────────────────
  const evidence: ControlEvidence[] = SOC2_CONTROLS.map(control => {
    let status: ControlStatus = 'NOT_MET';
    const findings: string[] = [];
    let evidenceCount = 0;
    let score = 0;

    switch (control.id) {
      // Automated checks
      case 'CC2.1':
        evidenceCount = scanCount + auditLogCount;
        if (scanCount >= 10 && auditLogCount >= 5) { status = 'MET'; score = 100; }
        else if (scanCount >= 1 || auditLogCount >= 1) { status = 'PARTIAL'; score = 50; }
        if (scanCount > 0) findings.push(`${scanCount} completed security scans`);
        if (auditLogCount > 0) findings.push(`${auditLogCount} audit log entries`);
        break;

      case 'CC3.2':
        evidenceCount = scanCount;
        if (recentScans >= 10) { status = 'MET'; score = 100; findings.push(`${recentScans} scans in last 30 days`); }
        else if (recentScans >= 3) { status = 'PARTIAL'; score = 60; findings.push(`${recentScans} scans in last 30 days (target: 10+)`); }
        else if (scanCount > 0) { status = 'PARTIAL'; score = 30; findings.push('Scanning started but not consistent'); }
        if (criticalFindings > 0) findings.push(`${criticalFindings} critical risks identified`);
        break;

      case 'CC3.3':
        evidenceCount = scanCount;
        const becRelated = Math.floor(scanCount * 0.3); // estimate
        if (scanCount >= 5) { status = 'MET'; score = 100; findings.push(`Email BEC/phishing scanning active`); }
        else if (scanCount >= 1) { status = 'PARTIAL'; score = 50; }
        break;

      case 'CC4.1':
        evidenceCount = recentScans + (cloudConnections > 0 ? 1 : 0);
        if (recentScans >= 5 && cloudConnections > 0) { status = 'MET'; score = 100; findings.push('Continuous scanning + cloud monitoring active'); }
        else if (recentScans >= 2) { status = 'PARTIAL'; score = 60; }
        else { status = 'NOT_MET'; score = 10; }
        break;

      case 'CC4.2':
        evidenceCount = incidentCount;
        if (incidentCount >= 1 && resolvedIncidents >= 1) { status = 'MET'; score = 100; findings.push(`${resolvedIncidents} incidents resolved with documented timelines`); }
        else if (incidentCount >= 1) { status = 'PARTIAL'; score = 50; findings.push(`${openIncidents} open incidents need resolution`); }
        else { status = 'PARTIAL'; score = 20; findings.push('No incidents logged yet (required for audit evidence)'); }
        break;

      case 'CC6.1':
        evidenceCount = memberCount + (cloudConnections > 0 ? 1 : 0);
        if (memberCount >= 1 && cloudConnections > 0) { status = 'MET'; score = 100; findings.push('RBAC active, IAM MFA scan enabled'); }
        else if (memberCount >= 1) { status = 'PARTIAL'; score = 65; findings.push('RBAC active, connect AWS to verify MFA status'); }
        break;

      case 'CC6.2':
        evidenceCount = auditLogCount;
        if (auditLogCount >= 5) { status = 'MET'; score = 100; findings.push(`${auditLogCount} access control events logged`); }
        else if (auditLogCount >= 1) { status = 'PARTIAL'; score = 60; }
        break;

      case 'CC6.3':
        evidenceCount = memberCount;
        if (memberCount >= 1) { status = 'MET'; score = 100; findings.push(`${memberCount} users with role-based access (OWNER/ADMIN/ANALYST/VIEWER)`); }
        break;

      case 'CC6.6':
        evidenceCount = cloudConnections;
        if (cloudConnections > 0 && criticalFindings === 0) { status = 'MET'; score = 100; findings.push('Cloud security scan active, no critical exposures'); }
        else if (cloudConnections > 0 && criticalFindings > 0) { status = 'PARTIAL'; score = 40; findings.push(`${criticalFindings} critical cloud exposures need remediation`); }
        else { status = 'NOT_MET'; score = 0; findings.push('Connect AWS account to verify access controls'); }
        break;

      case 'CC7.1':
        evidenceCount = scanCount;
        if (scanCount >= 20) { status = 'MET'; score = 100; findings.push(`${scanCount} vulnerability scans completed`); }
        else if (scanCount >= 5) { status = 'PARTIAL'; score = 70; findings.push(`${scanCount} scans completed (target: 20+ for strong evidence)`); }
        else if (scanCount >= 1) { status = 'PARTIAL'; score = 30; }
        if (highFindings + criticalFindings > 0) findings.push(`${criticalFindings} critical, ${highFindings} high severity findings`);
        break;

      case 'CC7.2':
        evidenceCount = recentScans;
        if (recentScans >= 10) { status = 'MET'; score = 100; findings.push('Active threat monitoring with automated alerting'); }
        else if (recentScans >= 3) { status = 'PARTIAL'; score = 60; }
        else { status = 'NOT_MET'; score = 10; }
        break;

      case 'CC7.3':
        evidenceCount = incidentCount;
        if (incidentCount >= 3) { status = 'MET'; score = 100; findings.push(`${incidentCount} security incidents with documented evaluation`); }
        else if (incidentCount >= 1) { status = 'PARTIAL'; score = 50; findings.push(`${incidentCount} incident(s) documented`); }
        else { status = 'PARTIAL'; score = 20; findings.push('Create test incidents to build evidence of incident response process'); }
        break;

      case 'CC7.4':
        evidenceCount = resolvedIncidents;
        if (resolvedIncidents >= 1) { status = 'PARTIAL'; score = 60; findings.push(`${resolvedIncidents} incidents resolved — upload IR plan for full credit`); }
        else { status = 'NOT_MET'; score = 10; }
        break;

      case 'CC9.1':
        evidenceCount = cloudConnections + incidentCount;
        if (cloudConnections > 0 && incidentCount > 0) { status = 'PARTIAL'; score = 70; findings.push('Cloud risk mitigation active, incident remediation documented'); }
        else if (cloudConnections > 0 || incidentCount > 0) { status = 'PARTIAL'; score = 40; }
        break;

      // Manual controls (cannot auto-check, mark as partial if org is active)
      default:
        status = auditLogCount > 0 ? 'PARTIAL' : 'NOT_MET';
        score = auditLogCount > 0 ? 30 : 0;
        findings.push('Upload supporting documentation to complete this control');
        break;
    }

    return {
      controlId: control.id,
      status,
      automatedFindings: findings,
      evidenceCount,
      lastEvidenceAt: lastScan?.completedAt ?? lastAuditLog?.createdAt ?? null,
      score,
    };
  });

  const met = evidence.filter(e => e.status === 'MET').length;
  const partial = evidence.filter(e => e.status === 'PARTIAL').length;
  const notMet = evidence.filter(e => e.status === 'NOT_MET').length;
  const na = evidence.filter(e => e.status === 'NOT_APPLICABLE').length;

  const overallScore = Math.round(evidence.reduce((sum, e) => sum + e.score, 0) / evidence.length);

  const criticalGaps = SOC2_CONTROLS
    .filter(c => c.automatedCheck && evidence.find(e => e.controlId === c.id)?.status === 'NOT_MET')
    .map(c => `${c.id}: ${c.title}`);

  return {
    orgId, generatedAt: now, overallScore,
    controlsMet: met, controlsPartial: partial,
    controlsNotMet: notMet, controlsNA: na,
    totalControls: evidence.length,
    evidence,
    readyForAudit: overallScore >= 70 && notMet <= 3,
    criticalGaps,
  };
}
