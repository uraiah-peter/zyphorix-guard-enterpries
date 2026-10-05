export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { constructWebhookEvent, getPlanFromPriceId } from '@/lib/stripe';
import { createNotification } from '@/lib/notifications';
import { writeAuditLog } from '@/lib/audit';
import type Stripe from 'stripe';

// ─── Stripe Webhook Handler ────────────────────────────────────────────────
// All events are idempotent — safe to process multiple times.
// Stripe retries webhooks on non-2xx responses. We always return 200
// after signature verification to prevent retry storms on logic errors.

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Log but return 200 so Stripe doesn't retry indefinitely
    console.error('[Webhook] Handler error:', event.type, err);
  }

  return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {

    // ── Subscription created or updated ────────────────────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as any;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;

      const priceId = sub.items.data[0]?.price?.id;
      const plan = priceId ? getPlanFromPriceId(priceId) : 'FREE';
      const status = mapStripeStatus(sub.status);

      await db.subscription.update({
        where: { organizationId: orgId },
        data: {
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          plan: plan as any,
          status: status as any,
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });

      if (event.type === 'customer.subscription.created') {
        await createNotification({
          organizationId: orgId,
          type: 'PLAN_EXPIRING',
          title: `Welcome to ${plan} plan!`,
          message: sub.trial_end
            ? `Your 14-day trial starts now. Your card will be charged on ${new Date(sub.trial_end * 1000).toLocaleDateString()}.`
            : `Your ${plan} subscription is now active.`,
          actionUrl: '/settings/billing',
        });
        await writeAuditLog({ organizationId: orgId, action: 'SUBSCRIPTION_CREATED', resource: 'subscription', metadata: { plan, stripeSubscriptionId: sub.id } });
      } else {
        await writeAuditLog({ organizationId: orgId, action: 'SUBSCRIPTION_UPDATED', resource: 'subscription', metadata: { plan, status } });
      }
      break;
    }

    // ── Subscription cancelled ─────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as any;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;

      await db.subscription.update({
        where: { organizationId: orgId },
        data: { plan: 'FREE', status: 'CANCELED', stripeSubscriptionId: null, stripePriceId: null, cancelAtPeriodEnd: false },
      });

      await createNotification({
        organizationId: orgId,
        type: 'PLAN_EXPIRING',
        title: 'Subscription cancelled',
        message: 'Your subscription has been cancelled. You have been downgraded to the Free plan.',
        actionUrl: '/settings/billing',
      });
      await writeAuditLog({ organizationId: orgId, action: 'SUBSCRIPTION_CANCELED', resource: 'subscription', metadata: { stripeSubscriptionId: sub.id } });
      break;
    }

    // ── Payment failed ─────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      const sub = await db.subscription.findFirst({
        where: { stripeCustomerId: customerId },
        select: { organizationId: true },
      });
      if (!sub) break;

      await db.subscription.update({
        where: { organizationId: sub.organizationId },
        data: { status: 'PAST_DUE' },
      });

      await createNotification({
        organizationId: sub.organizationId,
        type: 'PLAN_EXPIRING',
        title: 'Payment failed',
        message: 'We could not process your payment. Please update your billing information to avoid service interruption.',
        severity: 'HIGH',
        actionUrl: '/settings/billing',
      });
      break;
    }

    // ── Payment succeeded ──────────────────────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      const sub = await db.subscription.findFirst({
        where: { stripeCustomerId: customerId },
        select: { organizationId: true, status: true },
      });
      if (!sub) break;

      // Restore active status if it was past due
      if (sub.status === 'PAST_DUE') {
        await db.subscription.update({
          where: { organizationId: sub.organizationId },
          data: { status: 'ACTIVE' },
        });
      }
      break;
    }

    // ── Trial ending soon (Stripe sends this 3 days before) ───────────────
    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as any;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;

      const daysLeft = sub.trial_end
        ? Math.ceil((sub.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
        : 3;

      await createNotification({
        organizationId: orgId,
        type: 'PLAN_EXPIRING',
        title: 'Trial ending soon',
        message: `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Add a payment method to continue.`,
        actionUrl: '/settings/billing',
      });
      break;
    }

    default:
      // Ignore unhandled events
      break;
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  const map: Record<string, string> = {
    active: 'ACTIVE',
    trialing: 'TRIALING',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'CANCELED',
    unpaid: 'PAST_DUE',
    paused: 'PAST_DUE',
  };
  return map[status] ?? 'ACTIVE';
}
