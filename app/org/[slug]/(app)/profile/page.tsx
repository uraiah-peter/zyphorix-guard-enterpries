'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AlertTriangle, User, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, SectionHeader, Input, ErrorBanner, Avatar, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { extractApiError } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<{ user?: { name?: string; email?: string; image?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(true);

  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/session').then((r) => r.json()),
      fetch('/api/account/delete').then((r) => r.json()),
    ]).then(([sessionJson, pwJson]) => {
      setSession(sessionJson);
      setHasPassword(!!pwJson?.data?.hasPassword);
    }).finally(() => setLoading(false));
  }, []);

  async function handleDelete() {
    setError('');
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hasPassword ? password : undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.error?.code === 'SOLE_OWNER') {
          setError(json.error.message);
        } else {
          setError(await extractApiError(res, 'Could not delete your account. Please try again.'));
        }
        return;
      }
      await signOut({ callbackUrl: '/login' });
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setDeleting(false);
    }
  }

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zyphorix-account-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const confirmed = confirmText === 'DELETE' && (!hasPassword || password.length > 0);

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <SectionHeader title="Profile" description="Manage your personal account." />

      {loading ? (
        <Card><Skeleton className="h-16 w-full" /></Card>
      ) : (
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={session?.user?.name} image={session?.user?.image} size="lg" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{session?.user?.name ?? 'Unnamed'}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{session?.user?.email}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download size={16} style={{ color: 'var(--text-secondary)' }} />
            <CardTitle>Your data</CardTitle>
          </div>
        </CardHeader>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Download a copy of your personal data — your account details, organization memberships, scans you've run,
          incident comments, API keys (metadata only), and your activity history — as a JSON file.
        </p>
        <Button variant="secondary" icon={<Download size={14} />} loading={exporting} onClick={handleExport}>
          Download my data
        </Button>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/25 bg-red-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <CardTitle>Danger zone</CardTitle>
          </div>
        </CardHeader>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Deleting your account removes your personal information and signs you out everywhere. Scans, incidents,
          and other records you created stay with your organizations for their history — they're disconnected
          from your identity, not erased from your team's records.
        </p>

        {!showConfirm ? (
          <Button variant="danger" onClick={() => setShowConfirm(true)}>Delete my account</Button>
        ) : (
          <div className="space-y-4">
            {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
            {hasPassword && (
              <Input label="Confirm your password" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
            <Input label='Type "DELETE" to confirm' value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
            <div className="flex items-center gap-3">
              <Button variant="danger" disabled={!confirmed} loading={deleting} onClick={handleDelete}>
                Permanently delete account
              </Button>
              <Button variant="ghost" onClick={() => { setShowConfirm(false); setError(''); setPassword(''); setConfirmText(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
