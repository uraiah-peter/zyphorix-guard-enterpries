export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { z } from 'zod';

interface P { params: Promise<{assetId:string}> }
const updateSchema = z.object({
  name: z.string().min(1).max(128).optional(), value: z.string().min(1).max(512).optional(),
  tags: z.array(z.string().max(32)).max(20).optional(), riskScore: z.number().int().min(0).max(100).optional().nullable(),
});

export async function GET(_req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {assetId} = await params;
    const asset = await db.asset.findUnique({where:{id:assetId}});
    if (!asset) return apiError('NOT_FOUND','Asset not found',404);
    await requireMembership(asset.organizationId, session.user.id);
    return apiSuccess(asset);
  } catch(e) { return handleApiError(e); }
}

export async function PATCH(req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {assetId} = await params;
    const asset = await db.asset.findUnique({where:{id:assetId},select:{organizationId:true}});
    if (!asset) return apiError('NOT_FOUND','Asset not found',404);
    await requirePermission(asset.organizationId, session.user.id, 'asset:manage');
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const updated = await db.asset.update({where:{id:assetId},data:parsed.data});
    return apiSuccess(updated);
  } catch(e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {assetId} = await params;
    const asset = await db.asset.findUnique({where:{id:assetId},select:{organizationId:true}});
    if (!asset) return apiError('NOT_FOUND','Asset not found',404);
    await requirePermission(asset.organizationId, session.user.id, 'asset:manage');
    await db.asset.delete({where:{id:assetId}});
    return apiSuccess({deleted:true});
  } catch(e) { return handleApiError(e); }
}
