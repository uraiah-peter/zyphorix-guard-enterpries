export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const query = searchParams.get('q')?.trim();
    if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    if (!query || query.length < 2) return apiSuccess({ results:{ scans:[], incidents:[], members:[] } });
    await requireMembership(orgId, session.user.id);

    const [scans, incidents, members] = await Promise.all([
      db.scan.findMany({ where:{ organizationId:orgId, OR:[{ input:{ contains:query, mode:'insensitive' } },{ classification:{ contains:query, mode:'insensitive' } }] }, select:{ id:true,type:true,input:true,riskLevel:true,createdAt:true }, take:5, orderBy:{ createdAt:'desc' } }),
      db.incident.findMany({ where:{ organizationId:orgId, OR:[{ title:{ contains:query, mode:'insensitive' } },{ description:{ contains:query, mode:'insensitive' } }] }, select:{ id:true,title:true,severity:true,status:true,createdAt:true }, take:3, orderBy:{ createdAt:'desc' } }),
      db.organizationMember.findMany({ where:{ organizationId:orgId, user:{ OR:[{ name:{ contains:query, mode:'insensitive' } },{ email:{ contains:query, mode:'insensitive' } }] } }, include:{ user:{ select:{ id:true,name:true,email:true,image:true } } }, take:3 }),
    ]);

    return apiSuccess({ results:{
      scans: scans.map(s=>({ ...s, _type:'scan', url:`/scans/${s.id}` })),
      incidents: incidents.map(i=>({ ...i, _type:'incident', url:`/incidents/${i.id}` })),
      members: members.map(m=>({ ...m.user, role:m.role, _type:'member', url:`/team` })),
    }});
  } catch (e) { return handleApiError(e); }
}
