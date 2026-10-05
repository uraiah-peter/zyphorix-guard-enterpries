export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { z } from 'zod';

interface P { params: Promise<{incidentId:string}> }
const addSchema = z.object({ content: z.string().min(1).max(5000) });

export async function GET(_req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {incidentId} = await params;
    const inc = await db.incident.findUnique({where:{id:incidentId},select:{organizationId:true}});
    if (!inc) return apiError('NOT_FOUND','Incident not found',404);
    await requireMembership(inc.organizationId, session.user.id);
    const updates = await db.incidentUpdate.findMany({where:{incidentId},include:{author:{select:{id:true,name:true,email:true,image:true}}},orderBy:{createdAt:'asc'}});
    return apiSuccess(updates);
  } catch(e) { return handleApiError(e); }
}

export async function POST(req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {incidentId} = await params;
    const inc = await db.incident.findUnique({where:{id:incidentId},select:{organizationId:true}});
    if (!inc) return apiError('NOT_FOUND','Incident not found',404);
    await requirePermission(inc.organizationId, session.user.id, 'incident:manage');
    const body = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const update = await db.incidentUpdate.create({data:{incidentId,authorId:session.user.id,content:parsed.data.content},include:{author:{select:{id:true,name:true,email:true,image:true}}}});
    return apiSuccess(update,201);
  } catch(e) { return handleApiError(e); }
}
