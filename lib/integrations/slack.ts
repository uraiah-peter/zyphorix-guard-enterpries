// ─── Slack Integration ─────────────────────────────────────────────────────
// Sends rich Block Kit messages to Slack via Incoming Webhooks.
// No Slack app installation needed — user just creates an incoming webhook.
// Setup: https://api.slack.com/messaging/webhooks

import type { AlertPayload } from './types';

// Severity → Slack color sidebar
const SEV_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH:     '#ef4444',
  MEDIUM:   '#f59e0b',
  LOW:      '#10b981',
  SAFE:     '#10b981',
};

// Severity → emoji
const SEV_EMOJI: Record<string, string> = {
  CRITICAL: '🚨',
  HIGH:     '⚠️',
  MEDIUM:   '🔶',
  LOW:      '✅',
  SAFE:     '✅',
};

const EVENT_EMOJI: Record<string, string> = {
  THREAT_DETECTED:   '🛡️',
  CRITICAL_THREAT:   '🚨',
  INCIDENT_CREATED:  '📋',
  INCIDENT_P1:       '🔴',
  CLOUD_ISSUE_FOUND: '☁️',
  SCAN_COMPLETED:    '🔍',
  MEMBER_JOINED:     '👤',
  WEEKLY_DIGEST:     '📊',
};

export async function sendSlackAlert(
  webhookUrl: string,
  payload: AlertPayload
): Promise<{ success: boolean; error?: string }> {
  const color = payload.severity ? (SEV_COLORS[payload.severity] ?? '#6366f1') : '#6366f1';
  const sevEmoji = payload.severity ? (SEV_EMOJI[payload.severity] ?? '🔔') : '🔔';
  const eventEmoji = EVENT_EMOJI[payload.event] ?? '🔔';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zyphorix.com';
  const deepLink = payload.url ? `${appUrl}${payload.url}` : `${appUrl}/org/${payload.orgSlug}/dashboard`;

  const blocks = [
    // Header
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${eventEmoji} ${payload.title}`,
        emoji: true,
      },
    },
    // Main content
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: payload.message,
      },
    },
    // Metadata fields
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Organization*\n${payload.orgName}`,
        },
        ...(payload.severity ? [{
          type: 'mrkdwn',
          text: `*Severity*\n${sevEmoji} ${payload.severity}`,
        }] : []),
        ...(payload.riskScore !== undefined ? [{
          type: 'mrkdwn',
          text: `*Risk Score*\n${payload.riskScore}/100`,
        }] : []),
        {
          type: 'mrkdwn',
          text: `*Time*\n${new Date(payload.timestamp).toLocaleString()}`,
        },
      ],
    },
    // Action button
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in Zyphorix Guard', emoji: true },
          url: deepLink,
          style: 'primary',
        },
      ],
    },
    // Divider
    { type: 'divider' },
    // Footer
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Zyphorix Guard — AI-Powered Cybersecurity | <${appUrl}|Open dashboard>`,
        },
      ],
    },
  ];

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            blocks,
            fallback: `${payload.title}: ${payload.message}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Slack returned ${res.status}: ${text}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

// Test message for verifying webhook setup
export async function sendSlackTestMessage(
  webhookUrl: string,
  orgName: string
): Promise<{ success: boolean; error?: string }> {
  return sendSlackAlert(webhookUrl, {
    event: 'THREAT_DETECTED',
    orgName,
    orgSlug: '',
    title: '✅ Zyphorix Guard connected successfully',
    message: `Your Slack integration for *${orgName}* is working. You'll receive security alerts here when threats are detected, incidents are created, or cloud issues are found.`,
    severity: 'LOW',
    timestamp: new Date().toISOString(),
  });
}
