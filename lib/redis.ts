// Redis client — gracefully degrades if Upstash not configured
let redisClient: any = null;

function getRedis(): any {
  if (redisClient) return redisClient;
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  try {
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
    return redisClient;
  } catch { return null; }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    if (!r) return null;
    const val = await r.get(key);
    return (val as T) ?? null;
  } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.set(key, JSON.stringify(value), { ex: ttl });
  } catch {}
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.del(key);
  } catch {}
}

export const cacheKeys = {
  dashboardStats: (id: string) => `zg:cache:stats:${id}`,
  orgSettings:    (id: string) => `zg:cache:settings:${id}`,
  orgMembers:     (id: string) => `zg:cache:members:${id}`,
  userOrgs:       (id: string) => `zg:cache:user-orgs:${id}`,
};
