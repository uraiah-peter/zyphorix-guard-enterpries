export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';
import { cacheGet, cacheSet, cacheKeys } from '@/lib/redis';
import type { DashboardStats } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR','orgId required',400);
    await requireMembership(orgId, session.user.id);

    const cacheKey = cacheKeys.dashboardStats(orgId);
    const cached = await cacheGet<DashboardStats>(cacheKey);
    if (cached) return apiSuccess(cached);

    const weekAgo = new Date(Date.now() - 7*24*60*60*1000);
    const twoWeeksAgo = new Date(Date.now() - 14*24*60*60*1000);

    const [totalScans, scansThisWeek, scansLastWeek, criticalFindings, openIncidents, assetsMonitored, riskCounts] = await Promise.all([
      db.scan.count({ where:{ organizationId:orgId, status:'COMPLETED' } }),
      db.scan.count({ where:{ organizationId:orgId, createdAt:{ gte:weekAgo } } }),
      db.scan.count({ where:{ organizationId:orgId, createdAt:{ gte:twoWeeksAgo, lt:weekAgo } } }),
      db.scanFinding.count({ where:{ scan:{ organizationId:orgId }, severity:'CRITICAL' } }),
      db.incident.count({ where:{ organizationId:orgId, status:{ notIn:['CLOSED','RESOLVED'] } } }),
      db.asset.count({ where:{ organizationId:orgId } }),
      db.scan.groupBy({ by:['riskLevel'], where:{ organizationId:orgId, status:'COMPLETED', riskLevel:{ not:null } }, _count:true }),
    ]);

    const threatScans = riskCounts.filter(r=>['HIGH','CRITICAL','MEDIUM'].includes(r.riskLevel??'')).reduce((s,r)=>s+r._count,0);
    const securityScore = totalScans > 0
      ? Math.max(10, Math.round(100 - (threatScans/totalScans)*60 - openIncidents*5 - criticalFindings*2))
      : 85;
    const threatsDetected = riskCounts.filter(r=>r.riskLevel&&r.riskLevel!=='SAFE').reduce((s,r)=>s+r._count,0);

    const stats: DashboardStats = { securityScore, totalScans, threatsDetected, criticalFindings, openIncidents, assetsMonitored, scansThisWeek, scoreTrend: scansThisWeek - scansLastWeek };
    await cacheSet(cacheKey, stats, 300);
    return apiSuccess(stats);
  } catch (e) { return handleApiError(e); }
}
