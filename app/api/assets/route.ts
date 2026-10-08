export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, getPaginationParams } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { z } from 'zod';

const createSchema = z.object({
  orgId: z.string().min(1),
  type: z.enum(['DOMAIN','IP_ADDRESS','SERVER','ENDPOINT','CLOUD_RESOURCE','EMAIL_ACCOUNT','APPLICATION']),
  name: z.string().min(1).max(128), value: z.string().min(1).max(512),
  tags: z.array(z.string().max(32)).max(20).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {searchParams} = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    await requireMembership(orgId, session.user.id);
    const {cursor,limit} = getPaginationParams(searchParams);
    const type = searchParams.get('type') ?? undefined;
    const assets = await db.asset.findMany({where:{organizationId:orgId,...(type?{type:type as any}:{}),...(cursor?{createdAt:{lt:new Date(cursor)}}:{})},orderBy:[{riskScore:'desc'},{createdAt:'desc'}],take:limit+1});
    const hasMore = assets.length > limit;
    return apiSuccess({items:hasMore?assets.slice(0,limit):assets,hasMore});
  } catch(e) { return handleApiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const {orgId,...data} = parsed.data;
    await requirePermission(orgId, session.user.id, 'asset:manage');
    const asset = await db.asset.create({ data: { organization: { connect: { id: orgId } }, name: data.name, type: data.type, value: data.value, tags: data.tags } });
    return apiSuccess(asset,201);
  } catch(e) { return handleApiError(e); }
}
