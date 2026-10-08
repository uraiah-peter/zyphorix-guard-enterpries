import { Redis } from '@upstash/redis';

// ─── Session Revocation ─────────────────────────────────────────────────
// JWT sessions can't be invalidated server-side by design — the whole point
// of a JWT is that it's self-verifying without a DB/store lookup. To still
// support "log out everywhere" / "invalidate sessions after a password
// change", we keep a minimal per-user revocation timestamp in Redis: any
// JWT issued (`iat`) before that timestamp is rejected on the next request.
//
// This runs inside the `jwt` callback in lib/auth.ts, which executes in
// whatever runtime proxy.ts runs in. As of the Next.js 16 middleware→proxy
// migration, that runtime is unconditionally Node.js (Edge isn't even an
// option for proxy.ts), so a direct `@prisma/client` call here would work
// correctly too — this isn't an Edge-compatibility workaround. Redis is
// still the better choice on pure latency grounds: an HTTP KV read beats a
// Postgres round-trip on every single authenticated request, revocation
// check or not.
//
// Degrades gracefully like the rest of this app's Redis usage: if Upstash
// isn't configured, revocation checks are skipped entirely (sessions remain
// valid for their full lifetime) rather than breaking auth.

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

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // matches lib/auth.ts session.maxAge

function key(userId: string) {
  return `zg:session-revoked:${userId}`;
}

/**
 * Invalidate every currently-issued session for a user. Call this after a
 * password change (and anywhere else a "log out everywhere" action is
 * added later — e.g. removing a compromised OAuth grant).
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  const r = getRedis();
  if (!r) return; // no-op if Redis isn't configured — see module comment
  const nowSeconds = Math.floor(Date.now() / 1000);
  // TTL matches the JWT's own maxAge — once that long has passed, every
  // token that could have existed at revocation time has expired anyway,
  // so the revocation marker no longer serves a purpose and Redis can
  // reclaim the key on its own.
  await r.set(key(userId), nowSeconds, { ex: SESSION_MAX_AGE_SECONDS });
}

/**
 * Returns the epoch-seconds timestamp of the user's most recent
 * "revoke everything" action, or null if none / Redis unavailable.
 */
export async function getRevokedAt(userId: string): Promise<number | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const value = await r.get<number>(key(userId));
    return typeof value === 'number' ? value : null;
  } catch {
    // Redis is an optional session-revocation enhancement.
    // Never allow Redis outages to break authentication.
    return null;
  }
}


