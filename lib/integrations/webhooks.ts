// ─── Generic Webhook Delivery ──────────────────────────────────────────────
// Delivers signed payloads to any HTTPS endpoint.
// Signature uses HMAC-SHA256 so the receiver can verify authenticity.
// Same pattern used by Stripe, GitHub, and Twilio webhooks.

import crypto from 'crypto';

export interface WebhookPayload {
  event: string;           // e.g. 'scan.threat_detected'
  timestamp: string;       // ISO 8601
  organizationId: string;
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret: string;          // Used to sign the payload
  events: string[];        // Which events to send
  isActive: boolean;
}

// ── Event types ────────────────────────────────────────────────────────────
export const WEBHOOK_EVENTS = [
  { value: 'scan.completed',        label: 'Scan completed (any risk level)' },
  { value: 'scan.threat_detected',  label: 'Threat detected (HIGH or CRITICAL)' },
  { value: 'incident.created',      label: 'Incident created' },
  { value: 'incident.resolved',     label: 'Incident resolved' },
  { value: 'cloud.issues_found',    label: 'Cloud security issues found' },
  { value: 'member.joined',         label: 'Team member joined' },
  { value: 'compliance.score_changed', label: 'Compliance score changed' },
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number]['value'];

// ── Delivery ───────────────────────────────────────────────────────────────
export async function deliverWebhook(
  config: WebhookConfig,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ success: boolean; statusCode?: number; error?: string; durationMs: number }> {
  const start = Date.now();

  // Only deliver if event is subscribed
  if (!config.events.includes(event) && !config.events.includes('*')) {
    return { success: true, durationMs: 0 }; // Silently skip
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    organizationId: data.organizationId as string,
    data,
  };

  const body = JSON.stringify(payload);

  // HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', config.secret)
    .update(body)
    .digest('hex');

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zyphorix-Event': event,
        'X-Zyphorix-Signature': `sha256=${signature}`,
        'X-Zyphorix-Timestamp': payload.timestamp,
        'X-Zyphorix-Delivery': crypto.randomUUID(),
        'User-Agent': 'ZyphorixGuard-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    return {
      success: res.ok,
      statusCode: res.status,
      error: res.ok ? undefined : `HTTP ${res.status}`,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message ?? 'Delivery failed',
      durationMs: Date.now() - start,
    };
  }
}

// ── Signature verification helper (for receivers to use) ───────────────────
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Generate a secure webhook secret ──────────────────────────────────────
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}
