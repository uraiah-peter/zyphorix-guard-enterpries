export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredScans } from '@/lib/data-retention';

// Triggered by an external scheduler (Vercel Cron, or any cron-capable
// host) hitting this route with the shared secret as a bearer token.
// Not wired into vercel.json here since this project has no such config
// file yet — add a crons entry there (or your host's equivalent) pointing
// at this path, and set CRON_SECRET in your environment to match.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: 'CRON_SECRET is not set — this endpoint is disabled until it is.' } },
      { status: 503 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } }, { status: 401 });
  }

  try {
    const result = await purgeExpiredScans();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[cron/data-retention] failed:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Retention purge failed' } }, { status: 500 });
  }
}
