export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { z } from 'zod';

const createSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  trigger: z.enum(['SCAN_CRITICAL','SCAN_HIGH','SCAN_URL_CRITICAL','SCAN_EMAIL_HIGH','SCAN_FILE_CRITICAL','SCAN_CLOUD_HIGH','INCIDENT_P1','INCIDENT_P2','ANY_INCIDENT']),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.union([z.string(),z.number()]) })).default([]),
  actions: z.array(z.object({ type: z.string(), config: z.record(z.unknown()) })).min(1,'At least one action required'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId'); if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    await requireMembership(orgId, session.user.id);
    const playbooks = await db.playbook.findMany({ where:{organizationId:orgId}, orderBy:{createdAt:'desc'} });
    return apiSuccess(playbooks);
  } catch(e) { return handleApiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const { orgId, ...data } = parsed.data;
    await requirePermission(orgId, session.user.id, 'settings:manage');
    const playbook = await db.playbook.create({ data:{ organizationId:orgId, ...data, isActive:true, runCount:0 } });
    return apiSuccess(playbook,201);
  } catch(e) { return handleApiError(e); }
}
