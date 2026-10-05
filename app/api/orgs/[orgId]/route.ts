export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { updateOrgSchema } from '@/lib/validations/org';
import { requirePermission } from '@/lib/permissions';
import { audit } from '@/lib/audit';

interface P { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'scan:read');
    const org = await db.organization.findUnique({ where:{ id:orgId }, include:{ settings:true, subscription:true, _count:{ select:{ members:true, scans:true, incidents:true } } } });
    if (!org) return apiError('NOT_FOUND','Organization not found',404);
    return apiSuccess(org);
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'settings:manage');
    const body = await req.json();
    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const org = await db.organization.update({ where:{ id:orgId }, data: parsed.data });
    await audit.orgUpdated(orgId, session.user.id, parsed.data);
    return apiSuccess(org);
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'org:delete');
    await db.organization.delete({ where:{ id:orgId } });
    return apiSuccess({ deleted:true });
  } catch (e) { return handleApiError(e); }
}
