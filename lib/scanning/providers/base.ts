// ─── Scanner Provider Interface ────────────────────────────────────────────
// Every scan provider implements this interface. The orchestrator calls
// all applicable providers in parallel, then aggregates results.

export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScanFindingResult {
  title: string;
  description: string;
  severity: RiskLevel;
  category: string;        // e.g. "PHISHING", "MALWARE", "SUSPICIOUS_REDIRECT"
  indicator?: string;      // The specific indicator (domain, header, hash, etc.)
  mitreAttack?: string;    // e.g. "T1566.001"
  evidence?: Record<string, unknown>;
}

export interface ScanProviderResult {
  providerName: string;
  version?: string;
  riskScore: number;        // 0–100
  riskLevel: RiskLevel;
  classification: string;   // Short human label: "Phishing URL", "Clean", etc.
  findings: ScanFindingResult[];
  metadata?: Record<string, unknown>;
}

export type ScanInput = {
  type: 'URL' | 'EMAIL' | 'FILE' | 'DOMAIN_IP';
  value: string;            // Raw input: URL string, email text, file content (base64), domain/IP
  filename?: string;        // For FILE scans
  mimeType?: string;        // For FILE scans
};

export interface ScanProvider {
  name: string;
  version: string;
  supportedTypes: ScanInput['type'][];
  analyze(input: ScanInput): Promise<ScanProviderResult>;
}

// ─── Risk level utilities ──────────────────────────────────────────────────

export const RISK_SCORE_THRESHOLDS = {
  SAFE:     [0, 20],
  LOW:      [21, 40],
  MEDIUM:   [41, 65],
  HIGH:     [66, 85],
  CRITICAL: [86, 100],
} as const;

export function scoreToLevel(score: number): RiskLevel {
  if (score <= 20) return 'SAFE';
  if (score <= 40) return 'LOW';
  if (score <= 65) return 'MEDIUM';
  if (score <= 85) return 'HIGH';
  return 'CRITICAL';
}

export function levelToScore(level: RiskLevel): number {
  const map: Record<RiskLevel, number> = { SAFE:10, LOW:30, MEDIUM:55, HIGH:75, CRITICAL:95 };
  return map[level];
}

// ─── Aggregate scores from multiple providers ──────────────────────────────
// Strategy: take the maximum risk score. If multiple providers agree on HIGH+,
// boost slightly. Never lower the final score below the highest provider score.

export function aggregateRiskScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  const max = Math.max(...scores);
  const highCount = scores.filter(s => s >= 66).length;
  const boost = highCount > 1 ? Math.min(5 * (highCount - 1), 10) : 0;
  return Math.min(100, max + boost);
}
