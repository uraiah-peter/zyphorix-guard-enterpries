export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { z } from 'zod';
import crypto from 'crypto';

// ── Log Ingestion Endpoint ─────────────────────────────────────────────────
// Accepts structured logs from any source via HTTP POST with API key auth.
// Ships your app logs, server logs, auth events → Zyphorix for analysis.
// Rate: 1,000 events/minute per org (enforced by API key plan)

const logSchema = z.object({
  source: z.string().min(1).max(64),      // 'nginx', 'app', 'auth', 'firewall'
  level: z.enum(['debug','info','warn','error','critical']),
  message: z.string().min(1).max(10000),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const batchSchema = z.object({
  logs: z.array(logSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    // Auth via API key (Bearer token)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED', 'API key required. Pass: Authorization: Bearer zg_your_key', 401);
    }

    const rawKey = authHeader.slice(7);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await db.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      select: { organizationId: true, permissions: true, id: true },
    });

    if (!apiKey) return apiError('UNAUTHORIZED', 'Invalid or revoked API key', 401);

    // Parse body — supports single log or batch
    const body = await req.json();
    const isBatch = Array.isArray(body.logs);

    let logs: z.infer<typeof logSchema>[] = [];

    if (isBatch) {
      const parsed = batchSchema.safeParse(body);
      if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid batch', 400, parsed.error.flatten());
      logs = parsed.data.logs;
    } else {
      const parsed = logSchema.safeParse(body);
      if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid log entry', 400, parsed.error.flatten());
      logs = [parsed.data];
    }

    // Persist logs
    await db.logEntry.createMany({
      data: logs.map(log => ({
        organizationId: apiKey.organizationId,
        source: log.source,
        level: log.level,
        message: log.message,
        metadata: log.metadata ?? null,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
      })),
    });

    // Update API key last used
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    // Background: check for critical log patterns
    const criticalLogs = logs.filter(l => l.level === 'critical' || l.level === 'error');
    if (criticalLogs.length > 0) {
      checkLogPatternsBackground(apiKey.organizationId, criticalLogs);
    }

    return apiSuccess({ ingested: logs.length, organizationId: apiKey.organizationId });
  } catch(e) { return handleApiError(e); }
}

// Background pattern detection — never blocks the response
async function checkLogPatternsBackground(
  orgId: string,
  logs: z.infer<typeof logSchema>[]
): Promise<void> {
  try {
    const THREAT_PATTERNS = [
      { pattern: /failed.*login|authentication.*fail|invalid.*password/i, title: 'Authentication failure detected in logs', severity: 'MEDIUM' },
      { pattern: /sql.*injection|xss.*attack|csrf.*token/i, title: 'Web attack pattern detected in logs', severity: 'HIGH' },
      { pattern: /unauthorized.*access|permission.*denied.*admin/i, title: 'Unauthorized access attempt in logs', severity: 'HIGH' },
      { pattern: /malware|ransomware|trojan|backdoor/i, title: 'Malware reference detected in logs', severity: 'CRITICAL' },
      { pattern: /data.*exfil|unusual.*download|large.*transfer/i, title: 'Possible data exfiltration in logs', severity: 'HIGH' },
    ];

    for (const log of logs) {
      for (const { pattern, title, severity } of THREAT_PATTERNS) {
        if (pattern.test(log.message)) {
          await db.notification.create({
            data: {
              organizationId: orgId,
              type: 'THREAT_DETECTED',
              title,
              message: `Pattern detected in ${log.source} logs: "${log.message.slice(0,120)}"`,
              severity: severity as any,
              actionUrl: '/logs',
            },
          });
          break; // One notification per log entry
        }
      }
    }
  } catch {}
}
