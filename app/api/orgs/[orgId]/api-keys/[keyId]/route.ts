export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { audit } from '@/lib/audit';

interface P { params: Promise<{ orgId:string; keyId:string }> }

export async function PATCH(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId, keyId } = await params;
    await requirePermission(orgId, session.user.id, 'apikey:manage');
    const key = await db.apiKey.findFirst({ where:{ id:keyId, organizationId:orgId } });
    if (!key) return apiError('NOT_FOUND','API key not found',404);
    if (key.revokedAt) return apiError('CONFLICT','Key already revoked',409);
    await db.apiKey.update({ where:{ id:keyId }, data:{ revokedAt:new Date() } });
    await audit.apiKeyRevoked(orgId, session.user.id, keyId);
    return apiSuccess({ revoked:true });
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId, keyId } = await params;
    await requirePermission(orgId, session.user.id, 'apikey:manage');
    const key = await db.apiKey.findFirst({ where:{ id:keyId, organizationId:orgId } });
    if (!key) return apiError('NOT_FOUND','API key not found',404);
    await db.apiKey.delete({ where:{ id:keyId } });
    return apiSuccess({ deleted:true });
  } catch (e) { return handleApiError(e); }
}
