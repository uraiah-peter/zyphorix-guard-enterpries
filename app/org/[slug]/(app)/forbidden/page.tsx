import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Access Denied',
  description: "You don't have permission to view this page.",
};

const PERM_LABELS: Record<string, string> = {
  'scan:create': 'run scans',
  'scan:read': 'view scans',
  'scan:delete': 'delete scans',
  'report:read': 'view reports',
  'incident:create': 'create incidents',
  'incident:manage': 'manage incidents',
  'asset:manage': 'manage assets',
  'cloud:connect': 'connect cloud accounts',
  'member:invite': 'invite team members',
  'member:manage': 'manage team members',
  'apikey:manage': 'manage API keys',
  'auditlog:read': 'view audit logs',
  'settings:manage': 'manage organization settings',
  'billing:manage': 'manage billing',
  'org:delete': 'delete this organization',
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
};

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ perm?: string; role?: string }>;
}

export default async function ForbiddenPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { perm, role } = await searchParams;

  const action = perm ? PERM_LABELS[perm] ?? 'access this page' : 'access this page';
  const roleLabel = role ? ROLE_LABELS[role] ?? role : null;

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center rounded-2xl mx-auto mb-6" style={{ width: 64, height: 64, overflow: 'hidden', boxShadow: '0 0 24px rgba(239,68,68,0.25)' }}>
          <Image src="/zyphorix-mark.png" alt="Zyphorix" width={64} height={64} />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Lock size={16} style={{ color: '#ef4444' }} />
          <span className="text-xs font-semibold tracking-widest" style={{ color: '#ef4444' }}>403 — ACCESS DENIED</span>
        </div>

        <h1 className="text-2xl font-black text-[var(--text-primary)] mb-2">You don't have permission for this</h1>

        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          Your role doesn't allow you to {action}.
        </p>
        {roleLabel && (
          <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
            You're currently signed in as an{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{roleLabel}</span>.
            {' '}Ask an organization Owner or Admin if you need access.
          </p>
        )}
        {!roleLabel && <div className="mb-8" />}

        <div className="flex items-center justify-center gap-3">
          <Link href={`/org/${slug}/dashboard`}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
            Back to dashboard
          </Link>
          <Link href={`/org/${slug}/team`}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            View team
          </Link>
        </div>
      </div>
    </div>
  );
}
