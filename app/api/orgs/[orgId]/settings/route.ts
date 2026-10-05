export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { updateOrgSettingsSchema } from '@/lib/validations/org';
import { requirePermission } from '@/lib/permissions';
import { audit } from '@/lib/audit';

interface P { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'settings:manage');
    const settings = await db.organizationSettings.findUnique({ where:{ organizationId:orgId } });
    return apiSuccess(settings);
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'settings:manage');
    const body = await req.json();
    const parsed = updateOrgSettingsSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid settings',400,parsed.error.flatten());
    const settings = await db.organizationSettings.upsert({ where:{ organizationId:orgId }, update: parsed.data, create:{ organizationId:orgId, ...parsed.data } });
    await audit.settingsUpdated(orgId, session.user.id);
    return apiSuccess(settings);
  } catch (e) { return handleApiError(e); }
}
