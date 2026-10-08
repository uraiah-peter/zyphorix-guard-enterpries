export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, getPaginationParams } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    await requirePermission(orgId, session.user.id, 'auditlog:read');
    const { cursor, limit } = getPaginationParams(searchParams);
    const action = searchParams.get('action') ?? undefined;
    const logs = await db.auditLog.findMany({
      where: { organizationId:orgId, ...(action?{ action:action as any }:{}), ...(cursor?{ createdAt:{ lt:new Date(cursor) } }:{}) },
      include: { user:{ select:{ id:true, name:true, email:true, image:true } } },
      orderBy: { createdAt:'desc' },
      take: limit + 1,
    });
    const hasMore = logs.length > limit;
    return apiSuccess(hasMore ? logs.slice(0,limit) : logs);
  } catch (e) { return handleApiError(e); }
}
