// ─── Generic Webhook Integration ───────────────────────────────────────────
// Sends signed JSON payloads to any HTTP endpoint.
// Signing: HMAC-SHA256 of the request body using the integration secret.
// Signature header: X-Zyphorix-Signature: sha256=<hex>
// Verifying: https://docs.zyphorix.com/webhooks/verifying

import crypto from 'crypto';
import type { AlertPayload } from './types';

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  durationMs: number;
}

export async function sendWebhook(
  webhookUrl: string,
  payload: AlertPayload,
  secret?: string
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  const body = JSON.stringify({
    id: crypto.randomUUID(),
    event: payload.event,
    timestamp: payload.timestamp,
    data: {
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      riskScore: payload.riskScore,
      organization: { name: payload.orgName, slug: payload.orgSlug },
      url: payload.url,
      metadata: payload.metadata,
    },
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ZyphorixGuard-Webhook/1.0',
    'X-Zyphorix-Event': payload.event,
    'X-Zyphorix-Timestamp': payload.timestamp,
  };

  // Sign the payload if a secret is configured
  if (secret) {
    const sig = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    headers['X-Zyphorix-Signature'] = `sha256=${sig}`;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    return {
      success: res.ok,
      statusCode: res.status,
      error: res.ok ? undefined : `HTTP ${res.status}`,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'TimeoutError' ? 'Request timed out (10s)' : err.message,
      durationMs: Date.now() - startTime,
    };
  }
}

export async function sendDiscordAlert(
  webhookUrl: string,
  payload: AlertPayload
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  const colors: Record<string, number> = {
    CRITICAL: 0xdc2626, HIGH: 0xef4444, MEDIUM: 0xf59e0b, LOW: 0x10b981, SAFE: 0x10b981,
  };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zyphorix.com';

  const body = JSON.stringify({
    username: 'Zyphorix Guard',
    avatar_url: `${appUrl}/icon.png`,
    embeds: [{
      title: payload.title,
      description: payload.message,
      color: payload.severity ? (colors[payload.severity] ?? 0x6366f1) : 0x6366f1,
      fields: [
        ...(payload.severity ? [{ name: 'Severity', value: payload.severity, inline: true }] : []),
        ...(payload.riskScore !== undefined ? [{ name: 'Risk Score', value: `${payload.riskScore}/100`, inline: true }] : []),
        { name: 'Organization', value: payload.orgName, inline: true },
      ],
      url: payload.url ? `${appUrl}${payload.url}` : undefined,
      footer: { text: 'Zyphorix Guard — AI-Powered Cybersecurity' },
      timestamp: payload.timestamp,
    }],
  });

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10000),
    });
    return { success: res.ok, statusCode: res.status, durationMs: Date.now() - startTime };
  } catch (err: any) {
    return { success: false, error: err.message, durationMs: Date.now() - startTime };
  }
}
