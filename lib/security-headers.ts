import { NextResponse } from 'next/server';

// ─── Security Headers ──────────────────────────────────────────────────────
// Applied to every response via middleware.
// Reference: https://securityheaders.com

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';

  // Script-src: nonce + strict-dynamic is the modern, strong approach —
  // scripts with the correct nonce (Next.js's own framework/hydration
  // scripts, auto-detected via the nonce convention below) are trusted, and
  // 'strict-dynamic' lets THOSE scripts load further scripts (e.g. webpack
  // chunk loading) without each one needing its own nonce. 'unsafe-inline'
  // and https: are included only as a fallback for older browsers that
  // don't understand nonce/strict-dynamic — any browser that does
  // understand them ignores the fallback entirely (CSP3 spec), so this
  // doesn't weaken the policy for modern browsers.
  //
  // Dev mode keeps 'unsafe-eval' — webpack's HMR/React Refresh in `next
  // dev` uses eval-based source maps and breaks without it. Production
  // builds don't need it.
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net`;

  return [
    "default-src 'self'",
    scriptSrc,
    // Styles: self + inline (Tailwind generates inline styles; no
    // equivalent nonce mechanism exists for style-src in this app since
    // nothing here injects attacker-influenced <style> content)
    "style-src 'self' 'unsafe-inline'",
    // Images: self + data URIs + remote avatars
    "img-src 'self' data: blob: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
    // Fonts
    "font-src 'self'",
    // Connect: self + Groq + Stripe + Sentry + Upstash
    "connect-src 'self' https://api.groq.com https://api.stripe.com https://o*.ingest.sentry.io https://*.upstash.io",
    // Frames: Stripe checkout only
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    // Forms: self only
    "form-action 'self'",
    // Block framing of our app (clickjacking)
    "frame-ancestors 'none'",
    // Block mixed content
    'upgrade-insecure-requests',
  ].join('; ');
}

const STATIC_SECURITY_HEADERS: Record<string, string> = {
  // Clickjacking protection
  'X-Frame-Options': 'DENY',
  // MIME sniffing protection
  'X-Content-Type-Options': 'nosniff',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // HSTS — 1 year, include subdomains
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  // Disable browser features we don't need
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=(self "https://js.stripe.com")',
  ].join(', '),
  // Remove server fingerprint
  'X-Powered-By': '',
  // XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
};

export function generateNonce(): string {
  // base64-encoded random value, per the CSP nonce spec (must be
  // base64-valued). crypto.randomUUID() gives 122 bits of randomness,
  // comfortably sufficient for a per-request nonce.
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    if (value) {
      response.headers.set(key, value);
    } else {
      response.headers.delete(key);
    }
  }
  return response;
}
