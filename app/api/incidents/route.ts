export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, getPaginationParams } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { alertIncidentCreated } from '@/lib/integrations/dispatcher';
import { z } from 'zod';

const createSchema = z.object({
  orgId: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(10000),
  severity: z.enum(['P1_CRITICAL','P2_HIGH','P3_MEDIUM','P4_LOW']),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    await requireMembership(orgId, session.user.id);
    const { cursor, limit } = getPaginationParams(searchParams);
    const status = searchParams.get('status') ?? undefined;
    const severity = searchParams.get('severity') ?? undefined;
    const incidents = await db.incident.findMany({
      where: { organizationId:orgId, ...(status?{status:status as any}:{}), ...(severity?{severity:severity as any}:{}), ...(cursor?{createdAt:{lt:new Date(cursor)}}:{}) },
      include: { assignedTo:{select:{id:true,name:true,email:true,image:true}}, _count:{select:{updates:true}} },
      orderBy: [{status:'asc'},{severity:'asc'},{createdAt:'desc'}],
      take: limit+1,
    });
    const hasMore = incidents.length > limit;
    return apiSuccess({ items: hasMore?incidents.slice(0,limit):incidents, hasMore });
  } catch(e) { return handleApiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const { orgId, title, description, severity, assignedToId } = parsed.data;
    await requirePermission(orgId, session.user.id, 'incident:create');
    if (assignedToId) {
      const m = await db.organizationMember.findUnique({ where:{ organizationId_userId:{organizationId:orgId,userId:assignedToId} } });
      if (!m) return apiError('VALIDATION_ERROR','Assigned user is not a member',400);
    }
    const incident = await db.$transaction(async tx => {
      const inc = await tx.incident.create({ data:{organizationId:orgId,title,description,severity:severity as any,status:'OPEN',assignedToId}, include:{assignedTo:{select:{id:true,name:true,email:true,image:true}}} });
      await tx.incidentUpdate.create({ data:{incidentId:inc.id,authorId:session.user!.id!,content:`Incident created with severity ${severity.replace('_',' ')}.`} });
      return inc;
    });
    await writeAuditLog({organizationId:orgId,userId:session.user.id,action:'INCIDENT_CREATED',resource:'incident',resourceId:incident.id,metadata:{title,severity}});
    alertIncidentCreated(orgId, { title, severity, incidentId: incident.id }).catch(() => {});
    await createNotification({organizationId:orgId,type:'INCIDENT_CREATED',title:`New incident: ${title}`,message:`A ${severity.replace('_',' ')} severity incident has been created.`,severity:severity.startsWith('P1')?'CRITICAL':severity.startsWith('P2')?'HIGH':severity.startsWith('P3')?'MEDIUM':'LOW',actionUrl:`/incidents/${incident.id}`});

    return apiSuccess(incident,201);
  } catch(e) { return handleApiError(e); }
}
