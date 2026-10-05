export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';

interface P { params: Promise<{ integrationId: string }> }

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { integrationId } = await params;
    const body = await req.json();
    const integration = await db.integration.findUnique({ where: { id: integrationId } });
    if (!integration) return apiError('NOT_FOUND', 'Integration not found', 404);
    await requirePermission(integration.organizationId, session.user.id, 'settings:manage');
    const updated = await db.integration.update({
      where: { id: integrationId },
      data: { isActive: body.isActive ?? integration.isActive },
    });
    return apiSuccess(updated);
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { integrationId } = await params;
    const integration = await db.integration.findUnique({ where: { id: integrationId } });
    if (!integration) return apiError('NOT_FOUND', 'Integration not found', 404);
    await requirePermission(integration.organizationId, session.user.id, 'settings:manage');
    await db.integration.delete({ where: { id: integrationId } });
    return apiSuccess({ deleted: true });
  } catch (e) { return handleApiError(e); }
}
