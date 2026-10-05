export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, appUrl } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { getStripe, getPriceIdForPlan } from '@/lib/stripe';
import { createCheckoutSchema } from '@/lib/validations/billing';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const body = await req.json();
    const parsed = createCheckoutSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());

    const { plan, orgId } = parsed.data;
    await requirePermission(orgId, session.user.id, 'billing:manage');

    const stripe = getStripe();

    // Get or create Stripe customer
    let sub = await db.subscription.findUnique({
      where: { organizationId: orgId },
      select: { stripeCustomerId: true, plan: true },
    });

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    let customerId = sub?.stripeCustomerId;
    if (!customerId) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      });
      const customer = await stripe.customers.create({
        email: user?.email ?? session.user.email!,
        name: org?.name,
        metadata: { organizationId: orgId, userId: session.user.id },
      });
      customerId = customer.id;
      await db.subscription.update({
        where: { organizationId: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = getPriceIdForPlan(plan);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { organizationId: orgId },
      },
      success_url: `${appUrl}/org/${(await db.organization.findUnique({ where:{ id:orgId }, select:{ slug:true } }))?.slug}/settings/billing?upgraded=true`,
      cancel_url: `${appUrl}/org/${(await db.organization.findUnique({ where:{ id:orgId }, select:{ slug:true } }))?.slug}/settings/billing?canceled=true`,
      metadata: { organizationId: orgId, plan },
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: 'SUBSCRIPTION_CREATED',
      resource: 'subscription',
      metadata: { plan, checkoutSessionId: checkoutSession.id },
    });

    return apiSuccess({ url: checkoutSession.url });
  } catch (e) { return handleApiError(e); }
}
