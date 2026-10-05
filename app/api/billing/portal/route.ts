export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, appUrl } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { getStripe } from '@/lib/stripe';
import { createPortalSchema } from '@/lib/validations/billing';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const body = await req.json();
    const parsed = createPortalSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());

    const { orgId } = parsed.data;
    await requirePermission(orgId, session.user.id, 'billing:manage');

    const sub = await db.subscription.findUnique({
      where: { organizationId: orgId },
      select: { stripeCustomerId: true },
    });

    if (!sub?.stripeCustomerId) {
      return apiError('NOT_FOUND', 'No billing account found. Please subscribe first.', 404);
    }

    const org = await db.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
    const returnUrl = `${appUrl}/org/${org?.slug}/settings/billing`;

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return apiSuccess({ url: portalSession.url });
  } catch (e) { return handleApiError(e); }
}
