'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp, Activity,
  Download, RefreshCw, Shield, FileText, Zap, ExternalLink, Info,
} from 'lucide-react';
import { Card, SectionHeader, Badge, Skeleton, EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Soc2OperationsToolkit } from '@/components/compliance/Soc2OperationsToolkit';

// ─── Types ─────────────────────────────────────────────────────────────────
type ControlStatus = 'MET' | 'PARTIAL' | 'NOT_MET' | 'NOT_APPLICABLE';
type TSCCategory = 'CC' | 'A' | 'PI' | 'C' | 'P';

const STATUS_CONFIG: Record<ControlStatus, { label: string; icon: any; color: string; bg: string; border: string }> = {
  MET:            { label: 'Met',        icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  PARTIAL:        { label: 'Partial',    icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  NOT_MET:        { label: 'Not Met',    icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  NOT_APPLICABLE: { label: 'N/A',        icon: Info,          color: 'text-[var(--text-muted)]',   bg: 'bg-[var(--border)]',     border: 'border-[var(--border2)]' },
};

const CATEGORY_COLORS: Record<TSCCategory, string> = {
  CC: '#3b82f6', A: '#10b981', PI: '#6366f1', C: '#8b5cf6', P: '#f59e0b',
};

// ─── Score Ring ─────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Audit Ready' : score >= 50 ? 'In Progress' : 'Needs Work';
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 absolute inset-0">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${color}66)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}%</span>
        </div>
      </div>
      <p className="text-xs font-semibold mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

// ─── Control Row ─────────────────────────────────────────────────────────────
function ControlRow({ control, orgSlug }: { control: any; orgSlug: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const evidence = control.evidence;
  const status: ControlStatus = evidence?.status ?? 'NOT_MET';
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const catColor = CATEGORY_COLORS[control.category as TSCCategory] ?? 'var(--text-muted)';

  return (
    <div id={control.id} className={cn('border-l-2 transition-all', `border-l-[${catColor}]`)} style={{ borderLeftColor: catColor }}>
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-blue-500/10 transition-colors"
        onClick={() => setExpanded(v => !v)}>
        {/* Control ID */}
        <span className="text-xs font-mono font-bold flex-shrink-0 w-12" style={{ color: catColor }}>{control.id}</span>

        {/* Status icon */}
        <StatusIcon size={15} className={cn('flex-shrink-0', cfg.color)} />

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">{control.title}</span>

        {/* Evidence count */}
        {evidence?.evidenceCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            {evidence.evidenceCount} evidence
          </span>
        )}

        {/* Status badge */}
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0', cfg.bg, cfg.color, cfg.border)}>
          {cfg.label}
        </span>

        {/* Automated badge */}
        {control.automatedCheck && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
            Auto
          </span>
        )}

        <span className="text-[var(--text-faint)] flex-shrink-0">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 ml-12 space-y-3 animate-fade-in">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{control.description}</p>

          {/* How Zyphorix helps */}
          <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={12} className="text-blue-400" />
              <p className="text-xs font-semibold text-blue-400">How Zyphorix Guard helps</p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{control.howZyphorixHelps}</p>
          </div>

          {/* Automated findings */}
          {evidence?.automatedFindings?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>AUTOMATED EVIDENCE</p>
              {evidence.automatedFindings.map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          )}

          {/* Remediation */}
          {(status === 'NOT_MET' || status === 'PARTIAL') && control.remediation && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p className="text-xs font-semibold text-amber-400 mb-1">ACTION REQUIRED</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{control.remediation}</p>
            </div>
          )}

          {/* Evidence types */}
          <div className="flex flex-wrap gap-1.5">
            {control.evidenceType.map((et: string) => (
              <span key={et} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-muted)', border: '1px solid var(--border2)' }}>
                {et.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap">
            {control.evidenceType.includes('SCAN_HISTORY') && (
              <button onClick={() => router.push(`/org/${orgSlug}/scans`)} className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1">
                View scans <ExternalLink size={10} />
              </button>
            )}
            {control.evidenceType.includes('CLOUD_FINDING') && (
              <button onClick={() => router.push(`/org/${orgSlug}/cloud`)} className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1">
                View cloud security <ExternalLink size={10} />
              </button>
            )}
            {control.evidenceType.includes('INCIDENT_LOG') && (
              <button onClick={() => router.push(`/org/${orgSlug}/incidents`)} className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1">
                View incidents <ExternalLink size={10} />
              </button>
            )}
            {control.evidenceType.includes('AUDIT_LOG') && (
              <button onClick={() => router.push(`/org/${orgSlug}/settings/audit-logs`)} className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1">
                View audit log <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function CompliancePage() {
  const { org, plan } = useOrg();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeStatus, setActiveStatus] = useState<string>('ALL');

  const [framework, setFramework] = useState<'SOC2'|'PCI'|'HIPAA'>('SOC2');

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    const res = await fetch(`/api/compliance?orgId=${org.id}&framework=${framework}`);
    const json = await res.json();
    if (json.data) setReport(json.data.report);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, [org.id, framework]);

  const isPCIorHIPAA = framework !== 'SOC2';
  const needsUpgrade = plan === 'FREE' || (plan === 'STARTER' && false) || (isPCIorHIPAA && !['BUSINESS','ENTERPRISE'].includes(plan));

  if (plan === 'FREE') {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
          📋
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Compliance Center</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          SOC 2 automation is available on Pro ($99/mo). PCI DSS and HIPAA compliance require Business ($149/mo).
        </p>
        <Button icon={<Zap size={14} />} onClick={() => router.push(`/org/${org.slug}/settings/billing`)}>
          Upgrade to unlock
        </Button>
      </div>
    );
  }

  if (isPCIorHIPAA && !['BUSINESS','ENTERPRISE'].includes(plan)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))', border: '1px solid rgba(139,92,246,0.3)' }}>
          {framework === 'PCI' ? '💳' : '🏥'}
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{framework === 'PCI' ? 'PCI DSS' : 'HIPAA'} Compliance</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {framework === 'PCI' ? 'PCI DSS v4.0 compliance automation' : 'HIPAA Security Rule compliance'} requires the Business plan ($149/mo).
          This replaces $10,000+ in annual compliance consulting.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setFramework('SOC2')}>View SOC 2 instead</Button>
          <Button icon={<Zap size={14} />} onClick={() => router.push(`/org/${org.slug}/settings/billing`)}>
            Upgrade to Business
          </Button>
        </div>
      </div>
    );
  }

  const controls = report?.controls ?? [];
  const filteredControls = controls.filter((c: any) => {
    const catMatch = activeCategory === 'ALL' || c.category === activeCategory;
    const statusMatch = activeStatus === 'ALL' || c.evidence?.status === activeStatus;
    return catMatch && statusMatch;
  });

  const groupedByCategory = filteredControls.reduce((acc: any, c: any) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="SOC 2 Compliance Center"
        description="Automated evidence collection mapped to Trust Service Criteria"
        action={
          <Button variant="secondary" size="sm" icon={<RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />}
            loading={refreshing} onClick={() => load(true)}>
            Refresh
          </Button>
        }
      />

      {/* Framework selector */}
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 p-1 rounded-xl" style={{ background:'var(--card)', border:'1px solid var(--border)', width:'fit-content' }}>
            {(['SOC2','PCI','HIPAA'] as const).map(f => (
              <button key={f} onClick={() => setFramework(f)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: framework===f ? '#3b82f6' : 'transparent', color: framework===f ? '#fff' : 'var(--text-muted)' }}>
                {f === 'SOC2' ? 'SOC 2' : f === 'PCI' ? 'PCI DSS' : 'HIPAA'}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={<Activity size={13} />} onClick={() => router.push(`/org/${org.slug}/operations`)}>
            Open Guard Operations
          </Button>
          </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : !report ? (
        <EmptyState icon={<Shield size={32} />} title="Unable to load compliance data" action={<Button onClick={() => load()}>Try again</Button>} />
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-stagger">
            {/* Score ring */}
            <div className="col-span-2 lg:col-span-1 rounded-xl p-5 flex flex-col items-center justify-center"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <ScoreRing score={report.overallScore} />
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Overall Score</p>
            </div>

            {/* Stat cards */}
            {[
              { label: 'Controls Met',     value: report.controlsMet,     color: '#10b981', icon: '✅' },
              { label: 'Partial',          value: report.controlsPartial, color: '#f59e0b', icon: '⚠️' },
              { label: 'Not Met',          value: report.controlsNotMet,  color: '#ef4444', icon: '❌' },
              { label: 'Total Controls',   value: report.totalControls,   color: '#3b82f6', icon: '📋' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-5 flex flex-col justify-between"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Audit readiness banner */}
          {report.readyForAudit ? (
            <div className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-400">You are audit-ready!</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your compliance score of {report.overallScore}% meets the threshold for a SOC 2 Type 1 audit. Schedule your audit with a licensed CPA firm.</p>
              </div>
              <Button size="sm" variant="secondary" className="ml-auto flex-shrink-0" iconRight={<ExternalLink size={12} />}
                onClick={() => window.open('https://www.aicpa.org/resources/landing/find-a-cpa', '_blank')}>
                Find an auditor
              </Button>
            </div>
          ) : (
            <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
                <p className="text-sm font-bold text-amber-400">
                  {report.overallScore >= 50 ? 'Almost there — address the gaps below' : 'Build your evidence base to become audit-ready'}
                </p>
              </div>
              {report.criticalGaps.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>CRITICAL GAPS TO ADDRESS:</p>
                  {report.criticalGaps.slice(0,4).map((gap: string) => (
                    <div key={gap} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <XCircle size={11} className="text-red-400 flex-shrink-0" />
                      {gap}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* What Zyphorix already covers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon:'🔍', title:'Vulnerability Evidence', desc:`${report.controls.filter((c:any) => c.evidence?.evidenceType?.includes('SCAN_HISTORY') && c.evidence?.status === 'MET').length} controls auto-satisfied by your scan history`, color:'#3b82f6' },
              { icon:'☁️', title:'Cloud Security Evidence', desc:`${report.controls.filter((c:any) => c.evidenceType?.includes('CLOUD_FINDING')).length} controls mapped to AWS security findings`, color:'#10b981' },
              { icon:'📋', title:'Access Control Evidence', desc:`${report.controls.filter((c:any) => c.evidenceType?.includes('ACCESS_CONTROL') && c.evidence?.status === 'MET').length} controls auto-satisfied by RBAC and audit logs`, color:'#6366f1' },
            ].map(s => (
              <div key={s.title} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Watchpost-inspired operations view for SOC 2 evidence work */}
          <Soc2OperationsToolkit orgSlug={org.slug} report={report} />

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1">
              {['ALL','CC','A','C'].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: activeCategory === cat ? (CATEGORY_COLORS[cat as TSCCategory] ?? '#3b82f6') + '22' : 'transparent',
                    color: activeCategory === cat ? (CATEGORY_COLORS[cat as TSCCategory] ?? '#3b82f6') : 'var(--text-muted)',
                    border: `1px solid ${activeCategory === cat ? (CATEGORY_COLORS[cat as TSCCategory] ?? '#3b82f6') + '44' : 'var(--border)'}`,
                  }}>
                  {cat === 'ALL' ? 'All' : cat === 'CC' ? 'Security' : cat === 'A' ? 'Availability' : 'Confidentiality'}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {['ALL','MET','PARTIAL','NOT_MET'].map(s => (
                <button key={s} onClick={() => setActiveStatus(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: activeStatus === s ? 'var(--border)' : 'transparent',
                    color: activeStatus === s ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: `1px solid ${activeStatus === s ? 'var(--border2)' : 'var(--border)'}`,
                  }}>
                  {s === 'ALL' ? 'All' : s === 'NOT_MET' ? 'Not Met' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <p className="text-xs ml-auto" style={{ color: 'var(--text-faint)' }}>{filteredControls.length} controls shown</p>
          </div>

          {/* Controls list by category */}
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, catControls]: [string, any]) => {
              const catColor = CATEGORY_COLORS[category as TSCCategory] ?? 'var(--text-muted)';
              const catLabel = report.categories?.[category]?.label ?? category;
              const metCount = (catControls as any[]).filter(c => c.evidence?.status === 'MET').length;
              return (
                <div key={category} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: catColor }} />
                      <p className="text-sm font-bold text-[var(--text-primary)]">{catLabel}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40` }}>
                        {category}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{metCount}/{(catControls as any[]).length} controls met</p>
                  </div>
                  <div className="divide-y" style={{ background: 'var(--card)' }} >
                    {(catControls as any[]).map((control: any) => (
                      <ControlRow key={control.id} control={control} orgSlug={org.slug} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="rounded-xl p-4 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Zyphorix Guard automates evidence collection for {report.controls.filter((c:any) => c.automatedCheck).length} of {report.totalControls} SOC 2 controls.
              The remaining controls require manual documentation uploads. This tool is for evidence preparation — engage a licensed CPA firm for your official SOC 2 audit.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
