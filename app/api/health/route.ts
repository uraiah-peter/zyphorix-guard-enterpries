export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Health Check Endpoint ─────────────────────────────────────────────────
// Used by Docker health checks, load balancers, and uptime monitors.
// Returns 200 if the service is healthy, 503 if degraded.

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: 'unhealthy', error: err.message };
  }

  // Redis check (optional — degrades gracefully)
  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const redisStart = Date.now();
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      });
      checks.redis = {
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - redisStart,
      };
    } else {
      checks.redis = { status: 'not_configured' };
    }
  } catch {
    checks.redis = { status: 'degraded' };
  }

  const isHealthy = checks.database.status === 'healthy';
  const totalMs = Date.now() - startTime;

  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    version: process.env.npm_package_version ?? '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    totalLatencyMs: totalMs,
    checks,
    timestamp: new Date().toISOString(),
  }, {
    status: isHealthy ? 200 : 503,
  });
}
