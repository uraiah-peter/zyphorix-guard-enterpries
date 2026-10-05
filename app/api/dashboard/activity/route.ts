export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';
import type { ActivityItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    await requireMembership(orgId, session.user.id);

    const [recentScans, recentIncidents, recentLogs] = await Promise.all([
      db.scan.findMany({ where:{ organizationId:orgId, status:'COMPLETED' }, orderBy:{ completedAt:'desc' }, take:5, select:{ id:true,type:true,riskLevel:true,classification:true,input:true,completedAt:true,createdAt:true } }),
      db.incident.findMany({ where:{ organizationId:orgId }, orderBy:{ createdAt:'desc' }, take:3, select:{ id:true,title:true,severity:true,status:true,createdAt:true } }),
      db.auditLog.findMany({ where:{ organizationId:orgId, action:{ in:['MEMBER_JOINED','MEMBER_INVITED','API_KEY_CREATED','ORG_UPDATED'] } }, orderBy:{ createdAt:'desc' }, take:4, include:{ user:{ select:{ name:true,email:true } } } }),
    ]);

    const activities: ActivityItem[] = [
      ...recentScans.map(s => ({ id:`scan-${s.id}`, type:'scan' as const, title:`${s.type} scan ${['HIGH','CRITICAL','MEDIUM'].includes(s.riskLevel??'') ? 'detected threat' : 'completed clean'}`, description:s.classification??`${s.type} analysis`, severity:s.riskLevel??undefined, timestamp:(s.completedAt??s.createdAt).toISOString(), actionUrl:`/scans/${s.id}` })),
      ...recentIncidents.map(i => ({ id:`inc-${i.id}`, type:'incident' as const, title:i.title, description:`${i.status} — ${i.severity}`, severity:i.severity.includes('CRITICAL')?'CRITICAL':i.severity.includes('HIGH')?'HIGH':'MEDIUM', timestamp:i.createdAt.toISOString(), actionUrl:`/incidents/${i.id}` })),
      ...recentLogs.map(l => ({ id:`log-${l.id}`, type:'member' as const, title:l.action.replace(/_/g,' ').toLowerCase(), description:l.user?`by ${l.user.name??l.user.email}`:'System', timestamp:l.createdAt.toISOString() })),
    ].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0,10);

    return apiSuccess(activities);
  } catch (e) { return handleApiError(e); }
}
