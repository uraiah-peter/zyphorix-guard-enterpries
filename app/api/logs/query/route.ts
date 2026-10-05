export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId'); if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    await requireMembership(orgId, session.user.id);

    const level = searchParams.get('level') ?? undefined;
    const source = searchParams.get('source') ?? undefined;
    const query = searchParams.get('q') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const cursor = searchParams.get('cursor') ?? undefined;

    const logs = await db.logEntry.findMany({
      where: {
        organizationId: orgId,
        ...(level ? { level } : {}),
        ...(source ? { source } : {}),
        ...(query ? { message: { contains: query, mode: 'insensitive' } } : {}),
        ...(cursor ? { timestamp: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
    });

    const hasMore = logs.length > limit;
    return apiSuccess({
      items: hasMore ? logs.slice(0, limit) : logs,
      hasMore,
      nextCursor: hasMore ? logs[limit - 1]?.timestamp?.toISOString() : null,
    });
  } catch(e) { return handleApiError(e); }
}
