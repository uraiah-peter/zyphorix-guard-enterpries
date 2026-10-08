export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';

interface P { params: Promise<{playbookId:string}> }

export async function GET(_req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {playbookId} = await params;
    const pb = await db.playbook.findUnique({where:{id:playbookId}});
    if (!pb) return apiError('NOT_FOUND','Playbook not found',404);
    await requireMembership(pb.organizationId, session.user.id);
    const runs = await db.playbookRun.findMany({where:{playbookId},orderBy:{createdAt:'desc'},take:20});
    return apiSuccess(runs);
  } catch(e) { return handleApiError(e); }
}
