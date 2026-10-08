'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shield, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Clock, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, RiskBadge, Badge, Skeleton, EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { RISK_COLORS, timeAgo, cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.id as string;
  const slug = params?.slug as string;
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/scans/${scanId}`)
      .then(r => r.json())
      .then(j => { if (j.data) setScan(j.data); })
      .finally(() => setLoading(false));
  }, [scanId]);

  function toggleFinding(id: string) {
    setExpandedFindings(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (loading) return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (!scan) return (
    <EmptyState icon={<Shield size={32} />} title="Scan not found" action={<Button onClick={() => router.back()}>Go back</Button>} />
  );

  const colors = RISK_COLORS[scan.riskLevel as RiskLevel] ?? RISK_COLORS['SAFE'];
  const severityOrder: Record<string, number> = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3, SAFE:4 };
  const sortedFindings = [...(scan.findings ?? [])].sort((a,b) => (severityOrder[a.severity]??5)-(severityOrder[b.severity]??5));

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Back */}
      <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => router.push(`/org/${slug}/scans`)}>
        Back to scans
      </Button>

      {/* Summary card */}
      <Card>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{scan.type}</Badge>
              {scan.riskLevel && <RiskBadge level={scan.riskLevel as RiskLevel} />}
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)] break-all">{scan.input.substring(0, 200)}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{scan.classification}</p>
          </div>
          <div className="text-center flex-shrink-0">
            <p className="text-4xl font-black" style={{ color: scan.riskScore >= 66 ? '#ef4444' : scan.riskScore >= 41 ? '#f97316' : '#10b981' }}>
              {scan.riskScore ?? '—'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Risk Score</p>
          </div>
        </div>
        {scan.summary && <p className="text-sm text-[var(--text-secondary)] p-3 rounded-lg bg-[var(--bg3)]">{scan.summary}</p>}
        <div className="flex items-center gap-4 mt-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(scan.createdAt)}</span>
          {scan.durationMs && <span>{scan.durationMs < 1000 ? `${scan.durationMs}ms` : `${(scan.durationMs/1000).toFixed(1)}s`}</span>}
          {scan.engineVersion && <span>Engine: {scan.engineVersion}</span>}
        </div>
      </Card>

      {/* AI Explanation */}
      {scan.report?.aiExplanation && (
        <Card>
          <CardHeader><CardTitle>🤖 AI Security Analysis</CardTitle></CardHeader>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{scan.report.aiExplanation}</p>
        </Card>
      )}

      {/* Executive Summary */}
      {scan.report?.executiveSummary && (
        <Card>
          <CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{scan.report.executiveSummary}</p>
        </Card>
      )}

      {/* Findings */}
      {sortedFindings.length > 0 && (
        <Card padding={false}>
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Security Findings <span className="text-[var(--text-muted)] font-normal">({sortedFindings.length})</span>
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {sortedFindings.map((f: any) => {
              const fc = RISK_COLORS[f.severity as RiskLevel] ?? RISK_COLORS['LOW'];
              const isExpanded = expandedFindings.has(f.id);
              return (
                <div key={f.id} className="px-5 py-4">
                  <button className="w-full flex items-start gap-3 text-left" onClick={() => toggleFinding(f.id)}>
                    <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', fc.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{f.title}</p>
                        <RiskBadge level={f.severity as RiskLevel} />
                        {f.mitreAttack && (
                          <a href={`https://attack.mitre.org/techniques/${f.mitreAttack.replace('.','/')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-400">
                            {f.mitreAttack} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      {!isExpanded && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{f.description}</p>}
                    </div>
                    <span className="text-[var(--text-muted)] flex-shrink-0 mt-0.5">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="mt-3 ml-5 space-y-2">
                      <p className="text-sm text-[var(--text-secondary)]">{f.description}</p>
                      {f.indicator && <p className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg3)] px-2 py-1 rounded">Indicator: {f.indicator}</p>}
                      {f.evidence && <pre className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg3)] px-3 py-2 rounded-lg overflow-x-auto">{JSON.stringify(f.evidence, null, 2)}</pre>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {scan.report?.recommendations && Array.isArray(scan.report.recommendations) && scan.report.recommendations.length > 0 && (
        <Card padding={false}>
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Recommended Actions</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {scan.report.recommendations.map((rec: any, i: number) => {
              const priorityColor: Record<string, string> = { IMMEDIATE:'text-red-400', HIGH:'text-orange-400', MEDIUM:'text-amber-400', LOW:'text-emerald-400' };
              return (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <Badge variant={rec.priority === 'IMMEDIATE' ? 'danger' : rec.priority === 'HIGH' ? 'warning' : rec.priority === 'MEDIUM' ? 'warning' : 'success'} className="flex-shrink-0 mt-0.5 text-xs">
                    {rec.priority}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{rec.action}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{rec.rationale}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* MITRE mapping */}
      {scan.report?.mitreMapping && Object.keys(scan.report.mitreMapping).length > 0 && (
        <Card>
          <CardHeader><CardTitle>MITRE ATT&CK Coverage</CardTitle></CardHeader>
          <div className="space-y-3">
            {Object.entries(scan.report.mitreMapping).map(([tactic, techniques]: [string, any]) => (
              <div key={tactic}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{tactic}</p>
                <div className="flex flex-wrap gap-2">
                  {techniques.map((t: any) => (
                    <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors">
                      <span className="font-mono font-bold">{t.id}</span>
                      <span className="text-blue-400/70">{t.name}</span>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
