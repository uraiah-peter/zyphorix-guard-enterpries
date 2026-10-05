// ─── Integration Types ─────────────────────────────────────────────────────

export type IntegrationProvider = 'SLACK' | 'WEBHOOK' | 'DISCORD' | 'TEAMS';

export type TriggerEvent =
  | 'THREAT_DETECTED'        // Any scan returns HIGH or CRITICAL
  | 'CRITICAL_THREAT'        // Scan returns CRITICAL only
  | 'INCIDENT_CREATED'       // New incident opened
  | 'INCIDENT_P1'            // P1 Critical incident opened
  | 'CLOUD_ISSUE_FOUND'      // Cloud security scan finds issue
  | 'SCAN_COMPLETED'         // Any scan completes (verbose mode)
  | 'MEMBER_JOINED'          // Team member joined org
  | 'WEEKLY_DIGEST';         // Weekly security summary

export interface Integration {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  name: string;
  webhookUrl: string;
  events: TriggerEvent[];
  isActive: boolean;
  secret?: string;           // HMAC signing secret for webhook verification
  lastUsedAt?: Date | null;
  lastError?: string | null;
  createdAt: Date;
}

export interface AlertPayload {
  event: TriggerEvent;
  orgName: string;
  orgSlug: string;
  title: string;
  message: string;
  severity?: string;
  riskScore?: number;
  url?: string;              // Deep link back to Zyphorix
  timestamp: string;
  metadata?: Record<string, unknown>;
}
