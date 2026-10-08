'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Shield, Cloud } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge, Skeleton, EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { formatDateTime, timeAgo, cn } from '@/lib/utils';

const SEV_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: 'text-red-400',    bg: 'bg-red-700/15',     border: 'border-red-600/40' },
  HIGH:     { text: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  MEDIUM:   { text: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  LOW:      { text: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  INFO:     { text: 'text-blue-400',   bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
};
const RISK_COLOR = (s: number) => s >= 86 ? '#dc2626' : s >= 66 ? '#ef4444' : s >= 41 ? '#f97316' : s >= 21 ? '#f59e0b' : '#10b981';
const SERVICE_ICONS: Record<string, string> = { IAM: '🔐', S3: '🪣', EC2: '🌐', RDS: '🗄️', Lambda: '⚡' };

export default function CloudDetailPage() {
  const params = useParams();
  const router = useRouter();
  const connId = params?.connectionId as string;
  const slug = params?.slug as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [serviceFilter, setServiceFilter] = useState('');

  async function loadFindings() {
    setLoading(true);
    const res = await fetch(`/api/cloud/connections/${connId}/findings`);
    const json = await res.json();
    if (json.data) setData(json.data);
    setLoading(false);
  }

  useEffect(() => { loadFindings(); }, [connId]);

  async function triggerSync() {
    setSyncing(true);
    await fetch(`/api/cloud/connections/${connId}/sync`, { method: 'POST' });
    setSyncing(false);
    loadFindings();
  }

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const findings = data?.findings ?? [];
  const services = [...new Set(findings.map((f: any) => f.category?.split('_')[0] ?? f.category))];
  const filtered = serviceFilter ? findings.filter((f: any) => f.category?.includes(serviceFilter) || f.title?.includes(serviceFilter)) : findings;

  const bySeverity = findings.reduce((acc: any, f: any) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc;
  }, {});

  if (loading) return (
    <div className="max-w-4xl space-y-6">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-96 rounded-xl" />
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => router.push(`/org/${slug}/cloud`)}>
          Back to Cloud Security
        </Button>
        <Button size="sm" icon={<RefreshCw size={13} className={cn(syncing && 'animate-spin')} />} loading={syncing} onClick={triggerSync}>
          Run new scan
        </Button>
      </div>

      {/* Scan summary */}
      {data?.scan ? (
        <Card>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={18} className="text-cyan-400" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">AWS Security Analysis</h2>
              </div>
              <p className="text-sm text-[var(--text-muted)]">{data.scan.summary}</p>
              <p className="text-xs text-[var(--text-faint)] mt-1">Completed {formatDateTime(data.scan.completedAt)} · {data.scan.durationMs ? `${(data.scan.durationMs / 1000).toFixed(1)}s` : ''}</p>
            </div>
            <div className="text-center flex-shrink-0">
              <p className="text-4xl font-black" style={{ color: RISK_COLOR(data.scan.riskScore ?? 0) }}>{data.scan.riskScore ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)]">Risk Score</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(sev => {
              const c = SEV_COLORS[sev];
              const count = bySeverity[sev] ?? 0;
              return (
                <button key={sev} onClick={() => setServiceFilter(serviceFilter === sev ? '' : sev)}
                  className={cn('p-3 rounded-xl border text-center transition-all', c.bg, c.border, serviceFilter === sev && 'ring-2 ring-current')}>
                  <p className={cn('text-xl font-black', c.text)}>{count}</p>
                  <p className={cn('text-xs font-medium', c.text)}>{sev}</p>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <EmptyState icon={<Cloud size={32} />} title="No scan data yet"
          description="Run a cloud security scan to see findings here."
          action={<Button size="sm" icon={<RefreshCw size={13} />} loading={syncing} onClick={triggerSync}>Run first scan</Button>} />
      )}

      {/* AI explanation */}
      {data?.report?.aiExplanation && (
        <Card>
          <CardHeader><CardTitle>🤖 AI Security Analysis</CardTitle></CardHeader>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{data.report.aiExplanation}</p>
        </Card>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Findings <span className="text-[var(--text-muted)] font-normal">({filtered.length}{serviceFilter ? ` filtered` : ''})</span>
            </p>
            {serviceFilter && <button onClick={() => setServiceFilter('')} className="text-xs text-blue-400 hover:text-blue-400">Clear filter</button>}
          </div>

          <div className="divide-y divide-[var(--border)]">
            {filtered.map((f: any) => {
              const c = SEV_COLORS[f.severity] ?? SEV_COLORS['LOW'];
              const isExp = expanded.has(f.id);
              const svcIcon = SERVICE_ICONS[f.category?.split('_')[0]] ?? '🔍';
              return (
                <div key={f.id} className={cn('border-l-2', c.border)}>
                  <button className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[var(--card2)] transition-colors" onClick={() => toggle(f.id)}>
                    <span className="text-base flex-shrink-0 mt-0.5">{svcIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', c.bg, c.text, c.border)}>{f.severity}</span>
                        <span className="text-xs text-[var(--text-muted)]">{f.category?.replace(/_/g,' ')}</span>
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{f.title}</p>
                      {!isExp && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{f.description}</p>}
                    </div>
                    <span className="text-[var(--text-muted)] flex-shrink-0 mt-1">{isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                  </button>

                  {isExp && (
                    <div className="px-5 pb-4 ml-10 space-y-3">
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.description}</p>
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <p className="text-xs font-medium text-blue-400 mb-1">Recommendation</p>
                        <p className="text-xs text-[var(--text-muted)]">{f.evidence?.recommendation ?? 'Review and remediate according to AWS security best practices.'}</p>
                      </div>
                      {f.indicator && <p className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg3)] px-2 py-1 rounded">Resource: {f.indicator}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
