import { db } from '@/lib/db';
import { PLAN_LIMITS } from '@/types';
import { createNotification } from '@/lib/notifications';

// ─── Plan limit check ──────────────────────────────────────────────────────
// Called before creating a scan. Returns null if allowed, error string if not.

export async function checkScanLimit(organizationId: string): Promise<{
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
  plan: string;
}> {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
  });

  const plan = sub?.plan ?? 'FREE';
  const limits = PLAN_LIMITS[plan];
  const scanLimit = limits?.scansPerMonth ?? 10;

  // Enterprise = unlimited
  if (scanLimit === -1) return { allowed: true, used: 0, limit: -1, plan };

  // Check if subscription is in a bad state
  if (sub?.status === 'PAST_DUE' || sub?.status === 'CANCELED') {
    return { allowed: false, reason: 'Your subscription is inactive. Please update your billing.', used: 0, limit: scanLimit, plan };
  }

  // Count scans in current billing period
  const periodStart = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const used = await db.scan.count({
    where: {
      organizationId,
      createdAt: { gte: periodStart },
    },
  });

  if (used >= scanLimit) {
    return {
      allowed: false,
      reason: `You have used all ${scanLimit} scans included in your ${plan} plan this month. Upgrade to continue scanning.`,
      used,
      limit: scanLimit,
      plan,
    };
  }

  // Warn at 80% usage
  const usagePct = (used / scanLimit) * 100;
  if (usagePct >= 80 && usagePct < 100) {
    // Fire-and-forget warning notification
    checkAndSendUsageWarning(organizationId, plan, Math.round(usagePct), used, scanLimit);
  }

  return { allowed: true, used, limit: scanLimit, plan };
}

// ─── Usage warning (debounced via last notification check) ────────────────

async function checkAndSendUsageWarning(
  orgId: string,
  plan: string,
  pct: number,
  used: number,
  limit: number
): Promise<void> {
  try {
    // Check if we already sent a warning this period to avoid spam
    const recentWarning = await db.notification.findFirst({
      where: {
        organizationId: orgId,
        type: 'USAGE_LIMIT_WARNING',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentWarning) return;

    await createNotification({
      organizationId: orgId,
      type: 'USAGE_LIMIT_WARNING',
      title: `${pct}% of scan limit used`,
      message: `You have used ${used} of ${limit} scans on your ${plan} plan this month. Upgrade to avoid interruptions.`,
      actionUrl: '/settings/billing',
    });
  } catch {}
}

// ─── Record scan usage ─────────────────────────────────────────────────────

export async function recordScanUsage(organizationId: string): Promise<void> {
  try {
    const sub = await db.subscription.findUnique({
      where: { organizationId },
      select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
    });
    if (!sub) return;

    const now = new Date();
    const periodStart = sub.currentPeriodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = sub.currentPeriodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await db.usageRecord.create({
      data: {
        subscriptionId: sub.id,
        metric: 'scans',
        quantity: 1,
        recordedAt: now,
        periodStart,
        periodEnd,
      },
    });
  } catch {
    console.error('[Billing] Failed to record scan usage');
  }
}

// ─── Get current usage summary ─────────────────────────────────────────────

export async function getUsageSummary(organizationId: string) {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, trialEndsAt: true, cancelAtPeriodEnd: true },
  });

  const plan = sub?.plan ?? 'FREE';
  const limits = PLAN_LIMITS[plan];
  const periodStart = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [scansUsed, memberCount] = await Promise.all([
    db.scan.count({ where: { organizationId, createdAt: { gte: periodStart } } }),
    db.organizationMember.count({ where: { organizationId } }),
  ]);

  return {
    plan,
    status: sub?.status ?? 'ACTIVE',
    limits,
    usage: {
      scans: { used: scansUsed, limit: limits.scansPerMonth },
      members: { used: memberCount, limit: limits.maxUsers },
    },
    trialEndsAt: sub?.trialEndsAt,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: sub?.currentPeriodEnd,
  };
}
