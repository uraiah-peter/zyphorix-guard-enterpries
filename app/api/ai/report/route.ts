export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { aiProvider } from '@/lib/ai/providers/registry';
import { buildOrgContext } from '@/lib/ai/context-builder';
import { z } from 'zod';

const reportRequestSchema = z.object({
  orgId: z.string().min(1),
  reportType: z.enum(['executive', 'technical', 'compliance']).default('executive'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const body = await req.json();
    const parsed = reportRequestSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
    const { orgId, reportType } = parsed.data;

    await requirePermission(orgId, session.user.id, 'report:read');

    const sub = await db.subscription.findUnique({ where: { organizationId: orgId }, select: { plan: true } });
    if (sub?.plan === 'FREE') return apiError('PLAN_LIMIT_EXCEEDED', 'Report generation requires Starter plan or higher.', 402);

    const orgContext = await buildOrgContext(orgId);

    // Extended stats for the report
    const [totalScans, thirtyDayScans, criticalCount, openIncidents] = await Promise.all([
      db.scan.count({ where: { organizationId: orgId } }),
      db.scan.count({ where: { organizationId: orgId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      db.scanFinding.count({ where: { scan: { organizationId: orgId }, severity: 'CRITICAL' } }),
      db.incident.count({ where: { organizationId: orgId, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
    ]);

    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `Generate a professional ${reportType} cybersecurity report for the following organization.

CONTEXT:
${orgContext}

ADDITIONAL STATISTICS:
- Total scans to date: ${totalScans}
- Scans in last 30 days: ${thirtyDayScans}
- Critical findings detected: ${criticalCount}
- Open incidents requiring attention: ${openIncidents}
- Report date: ${reportDate}

Generate a structured report with these sections:
1. Executive Summary (2-3 sentences for leadership)
2. Security Posture Assessment (current state, key risks)
3. Threat Activity (what was detected, patterns observed)
4. Open Incidents Summary (if any)
5. Recommended Priority Actions (top 3-5 items, ranked by urgency)
6. Compliance & Risk Notes

Format the report professionally. Be specific about findings. Keep it under 600 words total.`;

    const report = await aiProvider.complete({
      messages: [
        { role: 'system', content: 'You are a senior cybersecurity analyst generating a formal security report. Be professional, specific, and actionable.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1500,
      temperature: 0.3,
    });

    return apiSuccess({
      report,
      generatedAt: new Date().toISOString(),
      reportType,
      orgId,
    });
  } catch (e) { return handleApiError(e); }
}
