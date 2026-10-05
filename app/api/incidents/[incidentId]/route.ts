export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

interface P { params: Promise<{incidentId:string}> }
const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(10000).optional(),
  status: z.enum(['OPEN','INVESTIGATING','CONTAINED','RESOLVED','CLOSED']).optional(),
  severity: z.enum(['P1_CRITICAL','P2_HIGH','P3_MEDIUM','P4_LOW']).optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {incidentId} = await params;
    const incident = await db.incident.findUnique({ where:{id:incidentId}, include:{assignedTo:{select:{id:true,name:true,email:true,image:true}},updates:{include:{author:{select:{id:true,name:true,email:true,image:true}}},orderBy:{createdAt:'asc'}},_count:{select:{updates:true}}} });
    if (!incident) return apiError('NOT_FOUND','Incident not found',404);
    await requireMembership(incident.organizationId, session.user.id);
    return apiSuccess(incident);
  } catch(e) { return handleApiError(e); }
}

export async function PATCH(req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {incidentId} = await params;
    const incident = await db.incident.findUnique({where:{id:incidentId},select:{organizationId:true,status:true}});
    if (!incident) return apiError('NOT_FOUND','Incident not found',404);
    await requirePermission(incident.organizationId, session.user.id, 'incident:manage');
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const {status,assignedToId,...rest} = parsed.data;
    if (assignedToId) {
      const m = await db.organizationMember.findUnique({where:{organizationId_userId:{organizationId:incident.organizationId,userId:assignedToId}}});
      if (!m) return apiError('VALIDATION_ERROR','Assigned user is not a member',400);
    }
    const updated = await db.$transaction(async tx => {
      const inc = await tx.incident.update({where:{id:incidentId},data:{...rest,...(status?{status:status as any,...(status==='RESOLVED'?{resolvedAt:new Date()}:{})}:{}),...(assignedToId!==undefined?{assignedToId}:{})},include:{assignedTo:{select:{id:true,name:true,email:true,image:true}},_count:{select:{updates:true}}}});
      if (status && status !== incident.status) await tx.incidentUpdate.create({data:{incidentId,authorId:session.user!.id!,content:`Status changed from ${incident.status} to ${status}.`}});
      return inc;
    });
    const action = status==='RESOLVED'?'INCIDENT_RESOLVED':status==='CLOSED'?'INCIDENT_CLOSED':'INCIDENT_UPDATED';
    await writeAuditLog({organizationId:incident.organizationId,userId:session.user.id,action:action as any,resource:'incident',resourceId:incidentId,metadata:parsed.data});
    return apiSuccess(updated);
  } catch(e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, {params}:P) {
  try {
    const session = await auth(); if(!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const {incidentId} = await params;
    const incident = await db.incident.findUnique({where:{id:incidentId},select:{organizationId:true}});
    if (!incident) return apiError('NOT_FOUND','Incident not found',404);
    await requirePermission(incident.organizationId, session.user.id, 'incident:manage');
    await db.incident.delete({where:{id:incidentId}});
    return apiSuccess({deleted:true});
  } catch(e) { return handleApiError(e); }
}
