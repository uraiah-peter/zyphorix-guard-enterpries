'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { useRouter } from 'next/navigation';
import { Cloud, Plus, RefreshCw, CheckCircle2, AlertTriangle, X, ExternalLink, Shield, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, SectionHeader, Badge, EmptyState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { timeAgo, cn } from '@/lib/utils';

const RISK_COLOR = (score: number) =>
  score >= 86 ? '#dc2626' : score >= 66 ? '#ef4444' : score >= 41 ? '#f97316' : score >= 21 ? '#f59e0b' : '#10b981';

function ConnectDialog({ orgId, onCreated, onClose }: { orgId: string; onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'guide'>('guide');

  const REGIONS = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  ];

  const TRUST_POLICY = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { AWS: 'arn:aws:iam::YOUR_ZYPHORIX_ACCOUNT:root' },
      Action: 'sts:AssumeRole',
      Condition: { StringEquals: { 'sts:ExternalId': 'zyphorix-guard' } },
    }],
  }, null, 2);

  async function handleConnect() {
    if (!name || !accountId || !roleArn) { setError('All fields are required'); return; }
    if (!/^\d{12}$/.test(accountId)) { setError('Account ID must be 12 digits'); return; }
    if (!roleArn.startsWith('arn:aws:iam::')) { setError('Role ARN must start with arn:aws:iam::'); return; }
    setLoading(true); setError('');
    const res = await fetch('/api/cloud/connections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, name, accountId, credentialsRef: roleArn, region }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error?.message ?? 'Failed to connect'); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg2)]">
          <div className="flex items-center gap-2">
            <Cloud size={18} className="text-cyan-400" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Connect AWS Account</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tab selector */}
          <div className="flex gap-2">
            {(['guide', 'setup'] as const).map(s => (
              <button key={s} onClick={() => setStep(s)}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', step === s ? 'bg-blue-600 text-white' : 'bg-[var(--bg3)] text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>
                {s === 'guide' ? '1. AWS Setup Guide' : '2. Connect Account'}
              </button>
            ))}
          </div>

          {step === 'guide' && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 bg-blue-500/5 border border-blue-500/20">
                <p className="text-sm font-medium text-blue-400 mb-1">Read-only access only</p>
                <p className="text-xs text-[var(--text-muted)]">Zyphorix Guard uses a read-only IAM role. It cannot modify, create, or delete any AWS resource.</p>
              </div>

              <div className="space-y-3">
                {[
                  { step: '1', title: 'Open IAM in AWS Console', desc: 'Navigate to IAM → Roles → Create Role' },
                  { step: '2', title: 'Choose "Another AWS account" trust type', desc: 'Enter the Zyphorix Guard AWS account ID (provided in your dashboard settings)' },
                  { step: '3', title: 'Attach the SecurityAudit policy', desc: 'Search for "SecurityAudit" and attach it. This provides read-only access.' },
                  { step: '4', title: 'Name the role', desc: 'Use a descriptive name like "ZyphorixGuardReadOnly"' },
                  { step: '5', title: 'Copy the Role ARN', desc: 'From the role summary page, copy the Role ARN and paste it in the Connect tab' },
                ].map(s => (
                  <div key={s.step} className="flex gap-3 p-3 rounded-xl bg-[var(--bg3)] border border-[var(--border)]">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">{s.step}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{s.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wider">Trust Policy (paste into IAM)</p>
                <pre className="text-xs font-mono text-emerald-400 bg-[var(--bg)] p-3 rounded-lg border border-[var(--border)] overflow-x-auto whitespace-pre">{TRUST_POLICY}</pre>
              </div>

              <Button onClick={() => setStep('setup')} className="w-full">Continue to Connect →</Button>
            </div>
          )}

          {step === 'setup' && (
            <div className="space-y-4">
              <Input label="Connection name" placeholder="Production AWS" value={name} onChange={e => setName(e.target.value)} />
              <Input label="AWS Account ID (12 digits)" placeholder="123456789012" value={accountId} onChange={e => setAccountId(e.target.value)} />
              <Input label="IAM Role ARN" placeholder="arn:aws:iam::123456789012:role/ZyphorixGuardReadOnly" value={roleArn} onChange={e => setRoleArn(e.target.value)} />
              <Select label="Primary region" value={region} onChange={e => setRegion(e.target.value)} options={REGIONS} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setStep('guide')}>← Back</Button>
                <Button className="flex-1" loading={loading} onClick={handleConnect} icon={<Cloud size={14} />}>Connect account</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CloudPage() {
  const { org, plan } = useOrg();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, any>>({});

  async function fetchConnections() {
    setLoading(true);
    const res = await fetch(`/api/cloud/connections?orgId=${org.id}`);
    const json = await res.json();
    if (json.data) setConnections(json.data);
    setLoading(false);
  }

  useEffect(() => { fetchConnections(); }, [org.id]);

  async function triggerSync(connId: string) {
    setSyncing(connId);
    const res = await fetch(`/api/cloud/connections/${connId}/sync`, { method: 'POST' });
    const json = await res.json();
    setSyncing(null);
    if (json.data) {
      setSyncResults(prev => ({ ...prev, [connId]: json.data }));
      fetchConnections();
    } else {
      setSyncResults(prev => ({ ...prev, [connId]: { error: json.error?.message ?? 'Scan failed' } }));
    }
  }

  async function deleteConnection(id: string) {
    if (!confirm('Remove this cloud connection?')) return;
    await fetch(`/api/cloud/connections/${id}`, { method: 'DELETE' });
    fetchConnections();
  }

  if (plan === 'FREE' || plan === 'STARTER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(6,182,212,0.3)' }}>☁️</div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Cloud Security</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-sm">Connect your AWS account to scan for IAM misconfigurations, public S3 buckets, and open security groups. Requires Pro plan.</p>
        <Button icon={<Zap size={14} />} onClick={() => router.push(`/org/${org.slug}/settings/billing`)}>Upgrade to Pro</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Cloud Security"
        description={`${connections.length} AWS account${connections.length !== 1 ? 's' : ''} connected`}
        action={<Button icon={<Plus size={14} />} onClick={() => setShowConnect(true)}>Connect AWS account</Button>} />

      {/* Setup guide banner */}
      {connections.length === 0 && !loading && (
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-5">
          <div className="flex items-start gap-4">
            <Cloud size={24} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Connect your first AWS account</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-3">Detect IAM misconfigurations, public S3 buckets, open security groups, disabled encryption, and more. Read-only access — we never modify your infrastructure.</p>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowConnect(true)}>Connect AWS account</Button>
            </div>
          </div>
        </div>
      )}

      {/* Connections grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger">
          {connections.map(conn => {
            const result = syncResults[conn.id];
            const isSync = syncing === conn.id;
            return (
              <Card key={conn.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-cyan-500 to-blue-500" />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(6,182,212,0.25)' }}>
                      <Cloud size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{conn.name}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono">{conn.accountId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', conn.isActive ? 'bg-emerald-400' : 'bg-[var(--text-faint)]')} />
                    <span className="text-xs text-[var(--text-muted)]">{conn.isActive ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-[var(--bg3)] border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Region</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{conn.region ?? 'us-east-1'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg3)] border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Last scan</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {conn.lastSyncedAt ? timeAgo(conn.lastSyncedAt) : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Sync result */}
                {result && !result.error && (
                  <div className="mb-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)]">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <p className="text-xs font-medium text-emerald-400">Scan complete</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>Risk: <span className="font-bold" style={{ color: RISK_COLOR(result.riskScore) }}>{result.riskScore}/100</span></span>
                      <span>{result.findingsCount} finding{result.findingsCount !== 1 ? 's' : ''}</span>
                      {result.summary?.critical > 0 && <span className="text-red-400">{result.summary.critical} critical</span>}
                    </div>
                  </div>
                )}

                {result?.error && (
                  <div className="mb-4 p-3 rounded-lg border border-red-500/25 bg-red-500/10">
                    <div className="flex items-center gap-2 mb-1"><AlertTriangle size={13} className="text-red-400" /><p className="text-xs font-medium text-red-400">Scan failed</p></div>
                    <p className="text-xs text-red-400/80">{result.error}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="flex-1"
                    icon={<RefreshCw size={13} className={cn(isSync && 'animate-spin')} />}
                    loading={isSync} onClick={() => triggerSync(conn.id)}>
                    {isSync ? 'Scanning...' : 'Run scan'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => router.push(`/org/${org.slug}/cloud/${conn.id}`)}>
                    View findings
                  </Button>
                  <button onClick={() => deleteConnection(conn.id)} className="p-2 text-[var(--text-faint)] hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '🔐', title: 'IAM Analysis', desc: 'Root MFA, user MFA, access key age, password policy, wildcard trust policies' },
          { icon: '🪣', title: 'S3 Exposure', desc: 'Public buckets, ACL misconfigurations, missing encryption and logging' },
          { icon: '🌐', title: 'Network Security', desc: 'Security groups with SSH/RDP/database ports open to 0.0.0.0/0' },
        ].map(c => (
          <div key={c.title} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <span className="text-2xl">{c.icon}</span>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-2 mb-1">{c.title}</p>
            <p className="text-xs text-[var(--text-muted)]">{c.desc}</p>
          </div>
        ))}
      </div>

      {showConnect && <ConnectDialog orgId={org.id} onCreated={() => { setShowConnect(false); fetchConnections(); }} onClose={() => setShowConnect(false)} />}
    </div>
  );
}
