export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  trigger: z.enum(['SCAN_CRITICAL','SCAN_HIGH','SCAN_URL_CRITICAL','SCAN_EMAIL_HIGH','SCAN_FILE_CRITICAL','SCAN_CLOUD_HIGH','INCIDENT_P1','INCIDENT_P2','ANY_INCIDENT']).optional(),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.union([z.string(),z.number()]) })).optional(),
  actions: z.array(z.object({ type: z.string(), config: z.record(z.unknown()) })).min(1).optional(),
  isActive: z.boolean().optional(),
}).strict();

interface P { params: Promise<{playbookId:string}> }

export async function PATCH(req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {playbookId} = await params;
    const pb = await db.playbook.findUnique({where:{id:playbookId}});
    if (!pb) return apiError('NOT_FOUND','Playbook not found',404);
    await requirePermission(pb.organizationId, session.user.id, 'settings:manage');
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const updated = await db.playbook.update({where:{id:playbookId},data:parsed.data});
    return apiSuccess(updated);
  } catch(e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {playbookId} = await params;
    const pb = await db.playbook.findUnique({where:{id:playbookId}});
    if (!pb) return apiError('NOT_FOUND','Playbook not found',404);
    await requirePermission(pb.organizationId, session.user.id, 'settings:manage');
    await db.playbook.delete({where:{id:playbookId}});
    return apiSuccess({deleted:true});
  } catch(e) { return handleApiError(e); }
}
