// ─── Integration Dispatcher ────────────────────────────────────────────────
// Central hub that routes alert payloads to the correct provider.
// Called by the scan orchestrator, incident routes, and cloud sync.
// Fires and forgets — never blocks the main request path.

import { db } from '@/lib/db';
import { sendSlackAlert } from './slack';
import { sendWebhook, sendDiscordAlert } from './webhook';
import type { AlertPayload, TriggerEvent } from './types';

export async function dispatchAlert(
  organizationId: string,
  event: TriggerEvent,
  payload: Omit<AlertPayload, 'event' | 'orgName' | 'orgSlug'>
): Promise<void> {
  try {
    // Load active integrations for this org that subscribe to this event
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, slug: true },
    });
    if (!org) return;

    const integrations = await db.integration.findMany({
      where: {
        organizationId,
        isActive: true,
        events: { has: event },
      },
    });

    if (integrations.length === 0) return;

    const fullPayload: AlertPayload = {
      ...payload,
      event,
      orgName: org.name,
      orgSlug: org.slug,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    };

    // Dispatch to all active integrations concurrently
    await Promise.allSettled(
      integrations.map(async (integration) => {
        let result: { success: boolean; error?: string };

        try {
          switch (integration.provider) {
            case 'SLACK':
              result = await sendSlackAlert(integration.webhookUrl, fullPayload);
              break;
            case 'DISCORD':
              const discordResult = await sendDiscordAlert(integration.webhookUrl, fullPayload);
              result = { success: discordResult.success, error: discordResult.error };
              break;
            case 'WEBHOOK':
            case 'TEAMS':
            default:
              const webhookResult = await sendWebhook(
                integration.webhookUrl,
                fullPayload,
                integration.secret ?? undefined
              );
              result = { success: webhookResult.success, error: webhookResult.error };
              break;
          }

          // Update last used / last error
          await db.integration.update({
            where: { id: integration.id },
            data: {
              lastUsedAt: new Date(),
              lastError: result.success ? null : (result.error ?? 'Unknown error'),
            },
          });
        } catch (err: any) {
          await db.integration.update({
            where: { id: integration.id },
            data: { lastError: err.message ?? 'Dispatch failed' },
          }).catch(() => {});
        }
      })
    );
  } catch (err: any) {
    // Never throw — dispatcher is fire-and-forget
    console.error('[Dispatcher] Error:', err.message);
  }
}

// ── Convenience helpers called from scan orchestrator etc. ─────────────────

export async function alertThreatDetected(
  organizationId: string,
  opts: {
    scanType: string;
    riskLevel: string;
    riskScore: number;
    summary: string;
    scanId: string;
  }
) {
  const event = opts.riskLevel === 'CRITICAL' ? 'CRITICAL_THREAT' : 'THREAT_DETECTED';
  await dispatchAlert(organizationId, event, {
    title: `${opts.riskLevel} threat detected — ${opts.scanType} scan`,
    message: opts.summary,
    severity: opts.riskLevel,
    riskScore: opts.riskScore,
    url: `/scans/${opts.scanId}`,
    timestamp: new Date().toISOString(),
  });
}

export async function alertIncidentCreated(
  organizationId: string,
  opts: {
    title: string;
    severity: string;
    incidentId: string;
  }
) {
  const isP1 = opts.severity === 'P1_CRITICAL';
  const event = isP1 ? 'INCIDENT_P1' : 'INCIDENT_CREATED';
  await dispatchAlert(organizationId, event, {
    title: `New incident: ${opts.title}`,
    message: `A ${opts.severity.replace('_', ' ')} severity incident has been opened and requires attention.`,
    severity: isP1 ? 'CRITICAL' : opts.severity.startsWith('P2') ? 'HIGH' : 'MEDIUM',
    url: `/incidents/${opts.incidentId}`,
    timestamp: new Date().toISOString(),
  });
}

export async function alertCloudIssue(
  organizationId: string,
  opts: {
    connectionName: string;
    accountId: string;
    criticalCount: number;
    highCount: number;
    riskScore: number;
    connectionId: string;
  }
) {
  await dispatchAlert(organizationId, 'CLOUD_ISSUE_FOUND', {
    title: `Cloud security issues found — ${opts.connectionName}`,
    message: `AWS account ${opts.accountId} scan complete. Found ${opts.criticalCount} critical and ${opts.highCount} high severity issues.`,
    severity: opts.criticalCount > 0 ? 'CRITICAL' : 'HIGH',
    riskScore: opts.riskScore,
    url: `/cloud/${opts.connectionId}`,
    timestamp: new Date().toISOString(),
  });
}
