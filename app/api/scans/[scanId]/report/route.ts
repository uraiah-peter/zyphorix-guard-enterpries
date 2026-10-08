export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';

interface P { params: Promise<{ scanId: string }> }

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { scanId } = await params;

    const scan = await db.scan.findUnique({ where: { id: scanId }, select: { organizationId: true, report: true, findings: true } });
    if (!scan) return apiError('NOT_FOUND', 'Scan not found', 404);
    await requireMembership(scan.organizationId, session.user.id);
    if (!scan.report) return apiError('NOT_FOUND', 'Report not yet generated', 404);

    return apiSuccess({ report: scan.report, findings: scan.findings });
  } catch (e) { return handleApiError(e); }
}
