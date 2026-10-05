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

    const scan = await db.scan.findUnique({
      where: { id: scanId },
      include: {
        findings: { orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }] },
        report: true,
        _count: { select: { findings: true } },
      },
    });

    if (!scan) return apiError('NOT_FOUND', 'Scan not found', 404);
    await requireMembership(scan.organizationId, session.user.id);

    return apiSuccess(scan);
  } catch (e) { return handleApiError(e); }
}
