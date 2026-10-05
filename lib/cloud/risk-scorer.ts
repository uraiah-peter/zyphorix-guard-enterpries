import type { CloudFinding, CloudSeverity } from './types';

const SEV_WEIGHT: Record<CloudSeverity, number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 8,
  LOW: 2,
  INFO: 0,
};

// ─── Cloud Risk Score Calculator ──────────────────────────────────────────
// Produces a 0-100 risk score from a set of cloud findings.
// Algorithm: weighted sum of findings, capped at 100, normalized.

export function calculateCloudRiskScore(findings: CloudFinding[]): number {
  if (findings.length === 0) return 0;

  const rawScore = findings.reduce((sum, f) => sum + (SEV_WEIGHT[f.severity] ?? 0), 0);

  // Normalize: 100 = having 2 CRITICAL findings or 5 HIGH findings
  const normalized = Math.min(100, Math.round((rawScore / 80) * 100));
  return normalized;
}

export function summarizeFindings(findings: CloudFinding[]) {
  return {
    critical: findings.filter(f => f.severity === 'CRITICAL').length,
    high:     findings.filter(f => f.severity === 'HIGH').length,
    medium:   findings.filter(f => f.severity === 'MEDIUM').length,
    low:      findings.filter(f => f.severity === 'LOW').length,
    total:    findings.length,
    servicesScanned: [...new Set(findings.map(f => f.service))],
    topFindings: findings
      .sort((a, b) => (SEV_WEIGHT[b.severity] ?? 0) - (SEV_WEIGHT[a.severity] ?? 0))
      .slice(0, 5)
      .map(f => ({ title: f.title, severity: f.severity, service: f.service })),
  };
}
