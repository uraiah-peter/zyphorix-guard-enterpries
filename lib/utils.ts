import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NextResponse } from 'next/server';
import type { RiskLevel } from '@prisma/client';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}
export function apiError(code: string, message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export class ForbiddenError extends Error { constructor(m = 'Forbidden') { super(m); this.name = 'ForbiddenError'; } }
export class UnauthorizedError extends Error { constructor(m = 'Unauthorized') { super(m); this.name = 'UnauthorizedError'; } }
export class NotFoundError extends Error { constructor(m = 'Not found') { super(m); this.name = 'NotFoundError'; } }

export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);
  if (error instanceof UnauthorizedError) return apiError('UNAUTHORIZED', error.message, 401);
  if (error instanceof ForbiddenError) return apiError('FORBIDDEN', error.message, 403);
  if (error instanceof NotFoundError) return apiError('NOT_FOUND', error.message, 404);
  if (error instanceof Error && error.message.includes('Unique constraint')) return apiError('CONFLICT', 'Resource already exists', 409);
  return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}

export function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim().substring(0,48);
}

// ─── Open-redirect protection ──────────────────────────────────────────────
// `callbackUrl` on /login is attacker-controlled (a query parameter), and
// gets used for both a client-side router.push() and NextAuth's OAuth
// callbackUrl — neither of those callers validate it for us. Only allow
// single-leading-slash relative paths: reject absolute URLs (http://,
// https://, any other scheme), protocol-relative URLs (//evil.com, which
// browsers treat as absolute), and backslash tricks some browsers normalize
// into protocol-relative URLs (\evil.com, /\evil.com).
export function getSafeRedirectPath(url: string | null | undefined, fallback = '/org-select'): string {
  if (!url) return fallback;
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\') || url.includes(':')) {
    return fallback;
  }
  return url;
}

// ─── Client-side fetch error helper ────────────────────────────────────────
// Extracts a user-facing message from a failed API response. Falls back to
// role-aware copy for permission errors so the UI never fails silently.
export async function extractApiError(res: Response, fallback = 'Something went wrong. Please try again.'): Promise<string> {
  try {
    const json = await res.json();
    if (json?.error?.code === 'FORBIDDEN') {
      return json.error.message ?? "You don't have permission to do that. Ask an organization Owner or Admin.";
    }
    if (json?.error?.code === 'UNAUTHORIZED') {
      return 'Your session has expired. Please sign in again.';
    }
    return json?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function generateUniqueSlug(name: string, checkExists: (slug: string) => Promise<boolean>): Promise<string> {
  const base = generateSlug(name); let slug = base; let attempt = 0;
  while (await checkExists(slug)) { attempt++; slug = `${base}-${attempt}`; }
  return slug;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function timeAgo(date: Date | string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`; const m = Math.floor(s/60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h/24); if (d < 30) return `${d}d ago`; return formatDate(date);
}

export const RISK_COLORS: Record<string, { bg:string; text:string; border:string; dot:string }> = {
  SAFE:     { bg:'bg-emerald-500/10', text:'text-emerald-400', border:'border-emerald-500/30', dot:'bg-emerald-400' },
  LOW:      { bg:'bg-amber-500/10',   text:'text-amber-400',   border:'border-amber-500/30',   dot:'bg-amber-400'   },
  MEDIUM:   { bg:'bg-orange-500/10',  text:'text-orange-400',  border:'border-orange-500/30',  dot:'bg-orange-400'  },
  HIGH:     { bg:'bg-red-500/10',     text:'text-red-400',     border:'border-red-500/30',     dot:'bg-red-400'     },
  CRITICAL: { bg:'bg-red-700/15',     text:'text-red-300',     border:'border-red-600/40',     dot:'bg-red-300'     },
};
export const RISK_SCORE_COLOR: Record<string, string> = {
  SAFE:'#10b981', LOW:'#f59e0b', MEDIUM:'#f97316', HIGH:'#ef4444', CRITICAL:'#dc2626',
};

export function getPaginationParams(searchParams: URLSearchParams): { cursor?: string; limit: number } {
  return { cursor: searchParams.get('cursor') ?? undefined, limit: Math.min(parseInt(searchParams.get('limit') ?? '20'), 100) };
}
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
