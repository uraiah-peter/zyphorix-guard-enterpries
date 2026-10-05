export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';

interface P { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { id } = await params;

    const conn = await db.cloudConnection.findUnique({ where: { id }, select: { organizationId: true, accountId: true } });
    if (!conn) return apiError('NOT_FOUND', 'Connection not found', 404);
    await requireMembership(conn.organizationId, session.user.id);

    // Get the most recent cloud scan for this connection
    const latestScan = await db.scan.findFirst({
      where: {
        organizationId: conn.organizationId,
        type: 'CLOUD',
        status: 'COMPLETED',
        input: { contains: conn.accountId },
      },
      orderBy: { completedAt: 'desc' },
      include: {
        findings: { orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }] },
        report: true,
      },
    });

    if (!latestScan) return apiSuccess({ scan: null, findings: [], report: null });

    return apiSuccess({
      scan: {
        id: latestScan.id,
        riskScore: latestScan.riskScore,
        riskLevel: latestScan.riskLevel,
        summary: latestScan.summary,
        completedAt: latestScan.completedAt,
        durationMs: latestScan.durationMs,
      },
      findings: latestScan.findings,
      report: latestScan.report,
    });
  } catch (e) { return handleApiError(e); }
}
