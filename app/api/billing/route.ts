export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';
import { getUsageSummary } from '@/lib/billing';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR', 'orgId required', 400);
    await requireMembership(orgId, session.user.id);

    const [usage, sub] = await Promise.all([
      getUsageSummary(orgId),
      db.subscription.findUnique({
        where: { organizationId: orgId },
        select: {
          plan: true, status: true, stripeCustomerId: true, stripeSubscriptionId: true,
          currentPeriodStart: true, currentPeriodEnd: true,
          trialEndsAt: true, cancelAtPeriodEnd: true,
        },
      }),
    ]);

    return apiSuccess({ ...usage, subscription: sub });
  } catch (e) { return handleApiError(e); }
}
