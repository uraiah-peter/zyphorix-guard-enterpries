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
  accountId: z.string().regex(/^\d{12}$/, 'AWS Account ID must be 12 digits'),
  credentialsRef: z.string().min(20).max(500), // Role ARN
  region: z.string().default('us-east-1'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR', 'orgId required', 400);
    await requireMembership(orgId, session.user.id);
    const connections = await db.cloudConnection.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess(connections);
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
    const { orgId, ...data } = parsed.data;
    await requirePermission(orgId, session.user.id, 'cloud:connect');

    // Plan gate — cloud security requires PRO+
    const sub = await db.subscription.findUnique({ where: { organizationId: orgId }, select: { plan: true } });
    if (!sub?.plan || ['FREE', 'STARTER'].includes(sub.plan)) {
      return apiError('PLAN_LIMIT_EXCEEDED', 'Cloud Security requires Pro ($99/mo) or higher. Your cloud infrastructure deserves better than a basic plan.', 402);
    }

    const connection = await db.cloudConnection.create({
      data: { organizationId: orgId, provider: 'AWS', ...data },
    });
    return apiSuccess(connection, 201);
  } catch (e) { return handleApiError(e); }
}
