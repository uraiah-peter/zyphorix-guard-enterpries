import Stripe from 'stripe';

// ─── Stripe Client Singleton ───────────────────────────────────────────────

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-08-26.dahlia',
      typescript: true,
    });
  }
  return stripeClient;
}

// ─── Stripe Price IDs (set in environment) ─────────────────────────────────
// Create these in your Stripe dashboard under Products → Pricing

export const STRIPE_PRICES: Record<string, string | undefined> = {
  STARTER_MONTHLY:  process.env.STRIPE_STARTER_PRICE_ID,   // $29/month
  PRO_MONTHLY:      process.env.STRIPE_PRO_PRICE_ID,        // $99/month
  BUSINESS_MONTHLY: process.env.STRIPE_BUSINESS_PRICE_ID,   // $149/month
};

// ─── Plan → Price ID mapping ───────────────────────────────────────────────

export function getPriceIdForPlan(plan: string): string {
  const priceId = STRIPE_PRICES[`${plan}_MONTHLY`];
  if (!priceId) throw new Error(`No Stripe price configured for plan: ${plan}`);
  return priceId;
}

// ─── Plan tier from Stripe price ID ───────────────────────────────────────

export function getPlanFromPriceId(priceId: string): string {
  const entry = Object.entries(STRIPE_PRICES).find(([, v]) => v === priceId);
  if (!entry) return 'FREE';
  return entry[0].replace('_MONTHLY', '');
}

// ─── Stripe webhook event verification ────────────────────────────────────

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}
