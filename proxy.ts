import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, generateNonce } from '@/lib/security-headers';
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/api/auth',
  '/api/billing/webhook',
  '/api/cron',
  '/_next',
  '/favicon.ico',
  '/images',
];

// IP-based rate limits for the highest-risk unauthenticated endpoints —
// brute force, credential stuffing, registration spam, and password-reset
// abuse. Enforced centrally here so no individual route can forget it.
const AUTH_RATE_LIMITED: { prefix: string; limiter: 'auth' | 'registration' | 'passwordReset' }[] = [
  { prefix: '/api/auth/callback/credentials', limiter: 'auth' },
  { prefix: '/api/auth/register', limiter: 'registration' },
  { prefix: '/api/auth/forgot-password', limiter: 'passwordReset' },
  { prefix: '/api/auth/reset-password', limiter: 'passwordReset' },
  { prefix: '/api/auth/verify-email', limiter: 'auth' },
  { prefix: '/api/auth/resend-verification', limiter: 'passwordReset' },
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Per-request CSP nonce. Forwarded to the eventual page render via a
  // request header — Next.js auto-detects this convention and applies the
  // nonce to its own framework/hydration scripts, and it's also set on the
  // CSP response header itself so the browser knows to trust it.
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  const nextOpts = { request: { headers: requestHeaders } };

  // Build response
  let response: NextResponse;

  const authLimit = AUTH_RATE_LIMITED.find((r) => pathname.startsWith(r.prefix));
  if (authLimit) {
    const ip = getClientIp(req);
    const result = await checkRateLimit(authLimit.limiter, ip);
    if (!result.success) {
      return applySecurityHeaders(rateLimitResponse(result), nonce);
    }
  }

  if (isPublicPath(pathname)) {
    response = NextResponse.next(nextOpts);
  } else if (pathname.startsWith('/api/')) {
    // API key auth handled in route handlers
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer zg_')) {
      const keyLimit = await checkRateLimit('api', authHeader.slice(0, 24));
      response = keyLimit.success ? NextResponse.next(nextOpts) : rateLimitResponse(keyLimit);
    } else if (!session?.user?.id) {
      response = NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    } else {
      const userLimit = await checkRateLimit('api', session.user.id ?? getClientIp(req));
      response = userLimit.success ? NextResponse.next(nextOpts) : rateLimitResponse(userLimit);
    }
  } else if (!session?.user?.id) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next(nextOpts);
  }

  // Apply security headers to every response
  return applySecurityHeaders(response, nonce);
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
