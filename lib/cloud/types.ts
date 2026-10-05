// ─── Cloud Security Shared Types ──────────────────────────────────────────

export type CloudSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type CloudFindingCategory =
  | 'IAM_MISCONFIGURATION'
  | 'S3_EXPOSURE'
  | 'OPEN_PORT'
  | 'PUBLIC_ACCESS'
  | 'ENCRYPTION_DISABLED'
  | 'LOGGING_DISABLED'
  | 'MFA_DISABLED'
  | 'EXCESSIVE_PERMISSIONS'
  | 'ROOT_ACCESS'
  | 'KEY_ROTATION';

export interface CloudFinding {
  id: string;               // Unique within a scan run
  service: string;          // 'IAM' | 'S3' | 'EC2' | 'RDS' etc.
  resourceType: string;     // 'AWS::IAM::User' | 'AWS::S3::Bucket' etc.
  resourceId: string;       // ARN or resource identifier
  resourceName: string;     // Human-readable name
  title: string;
  description: string;
  severity: CloudSeverity;
  category: CloudFindingCategory;
  recommendation: string;
  evidence: Record<string, unknown>;
  region?: string;
}

export interface CloudScanResult {
  connectionId: string;
  accountId: string;
  provider: 'AWS';
  scannedAt: Date;
  durationMs: number;
  findings: CloudFinding[];
  assetsDiscovered: CloudAsset[];
  riskScore: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    servicesScanned: string[];
  };
}

export interface CloudAsset {
  type: string;
  name: string;
  value: string; // ARN or identifier
  region?: string;
}

// Severity → numeric score for aggregation
export const CLOUD_SEV_SCORES: Record<CloudSeverity, number> = {
  CRITICAL: 95,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
  INFO: 5,
};
