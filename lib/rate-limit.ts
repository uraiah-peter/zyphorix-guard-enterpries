import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// ─── Rate Limiting ──────────────────────────────────────────────────────────
// Limits match what SECURITY.md documents. Backed by Upstash Redis in any
// environment where it's configured (required for correctness across
// multiple serverless instances). Falls back to an in-memory limiter
// otherwise so local development / a misconfigured deploy still gets *some*
// protection rather than silently allowing everything through — but the
// in-memory fallback is per-process only and is NOT a substitute for Redis
// in a real multi-instance deployment.

let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = null;
    return null;
  }
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch {
    redis = null;
  }
  return redis;
}

type LimiterName = 'auth' | 'registration' | 'passwordReset' | 'api' | 'aiChat' | 'cloudSync';

interface LimitConfig { limit: number; windowMs: number; upstashWindow: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`; }

const LIMITS: Record<LimiterName, LimitConfig> = {
  auth:          { limit: 10, windowMs: 15 * 60 * 1000, upstashWindow: '15 m' },
  registration:  { limit: 5,  windowMs: 60 * 60 * 1000, upstashWindow: '1 h' },
  passwordReset: { limit: 5,  windowMs: 15 * 60 * 1000, upstashWindow: '15 m' },
  api:           { limit: 100, windowMs: 60 * 1000,      upstashWindow: '1 m' },
  aiChat:        { limit: 20, windowMs: 60 * 1000,       upstashWindow: '1 m' },
  cloudSync:     { limit: 1,  windowMs: 15 * 60 * 1000,  upstashWindow: '15 m' },
};

const upstashLimiters = new Map<LimiterName, Ratelimit>();
function getUpstashLimiter(name: LimiterName): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const cached = upstashLimiters.get(name);
  if (cached) return cached;
  const { limit, upstashWindow } = LIMITS[name];
  const rl = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, upstashWindow),
    prefix: `zg:ratelimit:${name}`,
  });
  upstashLimiters.set(name, rl);
  return rl;
}

// In-memory fallback — per-process, best-effort only.
const memoryStore = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();
function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  // Opportunistic cleanup instead of a background timer (works in edge runtime too)
  if (now - lastCleanup > 5 * 60 * 1000) {
    lastCleanup = now;
    for (const [k, v] of memoryStore) if (v.resetAt < now) memoryStore.delete(k);
  }
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }
  entry.count += 1;
  if (entry.count > limit) return { success: false, remaining: 0, reset: entry.resetAt };
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms
}

export async function checkRateLimit(name: LimiterName, identifier: string): Promise<RateLimitResult> {
  const cfg = LIMITS[name];
  const upstash = getUpstashLimiter(name);
  if (upstash) {
    const result = await upstash.limit(identifier);
    return { success: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset };
  }
  const result = memoryLimit(`${name}:${identifier}`, cfg.limit, cfg.windowMs);
  return { success: result.success, limit: cfg.limit, remaining: result.remaining, reset: result.reset };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        'Retry-After': String(Math.max(0, Math.ceil((result.reset - Date.now()) / 1000))),
      },
    }
  );
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
