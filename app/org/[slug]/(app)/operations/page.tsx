'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FileCheck2,
  GitBranch,
  HeartPulse,
  Inbox,
  ListChecks,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Timer,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Badge, Card, EmptyState, SectionHeader, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { timeAgo } from '@/lib/utils';

interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  createdAt: string;
  _count?: { updates?: number };
}

interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

const SEVERITY: Record<string, { label: string; color: string; variant: 'danger' | 'warning' | 'info' | 'success' }> = {
  P1_CRITICAL: { label: 'Critical', color: '#f87171', variant: 'danger' },
  P2_HIGH: { label: 'High', color: '#fb923c', variant: 'warning' },
  P3_MEDIUM: { label: 'Medium', color: '#facc15', variant: 'warning' },
  P4_LOW: { label: 'Low', color: '#34d399', variant: 'success' },
};

function severityOf(value: string) {
  return SEVERITY[value] ?? { label: value || 'Info', color: '#60a5fa', variant: 'info' as const };
}

function SignalBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-12 items-end gap-1" aria-label="Signal activity trend">
      {values.map((value, index) => (
        <span key={index} className="min-w-1 flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(10, (value / max) * 100)}%`, background: color, opacity: 0.35 + index / values.length * 0.55 }} />
      ))}
    </div>
  );
}

function MetricTile({ label, value, detail, icon: Icon, tone, trend }: { label: string; value: string | number; detail: string; icon: LucideIcon; tone: string; trend: number[] }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: tone, background: `${tone}18` }}>
          <Icon size={17} />
        </div>
        <div className="w-20"><SignalBars values={trend} color={tone} /></div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight" style={{ color: tone }}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function ActionLink({ label, detail, icon: Icon, onClick, tone = '#60a5fa' }: { label: string; detail: string; icon: LucideIcon; onClick: () => void; tone?: string }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/40 hover:bg-[var(--card2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ color: tone, background: `${tone}18` }}><Icon size={16} /></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[var(--text-primary)]">{label}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">{detail}</span></span>
      <ArrowUpRight size={14} className="flex-shrink-0 text-[var(--text-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </button>
  );
}

export default function OperationsPage() {
  const { org } = useOrg();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statsRes, activityRes, incidentsRes, logsRes, healthRes] = await Promise.all([
        fetch(`/api/dashboard/stats?orgId=${org.id}`),
        fetch(`/api/dashboard/activity?orgId=${org.id}`),
        fetch(`/api/incidents?orgId=${org.id}&limit=6`),
        fetch(`/api/logs/query?orgId=${org.id}&limit=8`),
        fetch('/api/health'),
      ]);
      const [statsJson, activityJson, incidentsJson, logsJson, healthJson] = await Promise.all([
        statsRes.json(), activityRes.json(), incidentsRes.json(), logsRes.json(), healthRes.json(),
      ]);
      setStats(statsJson.data ?? null);
      setActivity(activityJson.data ?? []);
      setIncidents(incidentsJson.data?.items ?? incidentsJson.data ?? []);
      setLogs(logsJson.data?.items ?? logsJson.data ?? []);
      setHealth(healthJson);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [org.id]);

  useEffect(() => { load(); }, [load]);

  const openIncidents = useMemo(() => incidents.filter(item => !['CLOSED', 'RESOLVED'].includes(item.status)), [incidents]);
  const criticalCount = useMemo(() => openIncidents.filter(item => item.severity === 'P1_CRITICAL').length, [openIncidents]);
  const signalTrend = useMemo(() => activity.slice(0, 7).map((item, index) => item.severity === 'CRITICAL' ? 10 : item.severity ? 6 + index : 3 + index), [activity]);
  const readiness = health?.status === 'healthy' ? 'Operational' : health ? 'Needs attention' : 'Checking';
  const healthColor = health?.status === 'healthy' ? '#34d399' : health ? '#f59e0b' : '#60a5fa';

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <SectionHeader
        title="Guard Operations"
        description="Turn security signals into accountable action and audit-ready proof."
        action={<Button variant="secondary" size="sm" icon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />} onClick={load} loading={refreshing}>Refresh workspace</Button>}
      />

      <section className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-[radial-gradient(circle_at_78%_15%,rgba(59,130,246,0.20),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(14,25,48,0.88))] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.28)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-blue-300/10 bg-blue-400/5 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="info" dot>Guard Operations</Badge><span className="text-[11px] uppercase tracking-[0.18em] text-blue-200/60">Evidence-first security workflow</span></div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">One workspace for the signal, the response, and the proof.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">A Zyphorix-native view that connects detection activity, cloud posture, incident ownership, and SOC 2 evidence without turning the product into a copy of another console.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm lg:min-w-64">
            <div className="flex items-center justify-between gap-6"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace state</span><span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: healthColor }}><span className="h-2 w-2 rounded-full bg-current" />{readiness}</span></div>
            <div className="mt-4 flex items-end justify-between"><div><p className="text-3xl font-black text-white">{stats?.securityScore ?? '—'}</p><p className="text-xs text-slate-400">security score</p></div><Waves size={40} className="text-blue-300/60" /></div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-2xl" />) : <>
          <MetricTile label="Open incidents" value={stats?.openIncidents ?? openIncidents.length} detail="needs an owner or next step" icon={ShieldAlert} tone="#fb923c" trend={signalTrend.length ? signalTrend : [2, 3, 3, 5, 4, 6]} />
          <MetricTile label="Critical findings" value={stats?.criticalFindings ?? criticalCount} detail="prioritize before audit review" icon={ShieldCheck} tone="#f87171" trend={[3, 3, 4, 5, 4, 6, 7]} />
          <MetricTile label="Scans this week" value={stats?.scansThisWeek ?? 0} detail="fresh evidence signals" icon={ScanLine} tone="#a78bfa" trend={[3, 4, 4, 6, 5, 7, 8]} />
          <MetricTile label="Assets monitored" value={stats?.assetsMonitored ?? 0} detail="inventory and cloud scope" icon={Cloud} tone="#34d399" trend={[4, 5, 5, 5, 6, 7, 7]} />
        </>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <div className="space-y-5">
          <Card className="!p-0 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Activity size={16} className="text-blue-400" /><h2 className="text-sm font-bold text-[var(--text-primary)]">Signal ledger</h2></div><p className="mt-1 text-xs text-[var(--text-muted)]">Recent activity normalized into an evidence trail.</p></div><button type="button" onClick={() => router.push(`/org/${org.slug}/logs`)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300">Open logs <ChevronRight size={13} /></button></div>
            <div className="divide-y divide-[var(--border)]">
              {loading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse bg-[var(--card)]" />) : activity.length ? activity.slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-blue-500/[0.04]">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">{item.type === 'incident' ? <ShieldAlert size={14} /> : item.type === 'scan' ? <ScanLine size={14} /> : <FileCheck2 size={14} />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[var(--text-primary)]">{item.title}</p><p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{item.description}</p></div>
                  <span className="flex-shrink-0 text-[11px] text-[var(--text-faint)]">{timeAgo(item.timestamp)}</span>
                </div>
              )) : <EmptyState icon={<Inbox size={24} />} title="No activity yet" description="Run a scan or ingest a log to create the first signal." />}
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><div className="flex items-center gap-2"><GitBranch size={16} className="text-violet-400" /><h2 className="text-sm font-bold text-[var(--text-primary)]">Evidence pulse</h2></div><p className="mt-1 text-xs text-[var(--text-muted)]">Log signals that can support a control review.</p></div><Badge variant="outline">{logs.length} recent</Badge></div>
            <div className="divide-y divide-[var(--border)]">
              {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse bg-[var(--card)]" />) : logs.length ? logs.slice(0, 5).map(log => <div key={log.id} className="flex items-start gap-3 px-5 py-3"><span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${String(log.level).toLowerCase() === 'error' ? 'bg-red-400' : 'bg-violet-400'}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs text-[var(--text-primary)]">{log.message}</p><p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{log.source} · {timeAgo(log.timestamp)}</p></div><Badge variant="outline">{log.level}</Badge></div>) : <EmptyState icon={<GitBranch size={24} />} title="No log signals yet" description="Connect a source or use Log Ingestion to add evidence signals." />}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4"><div className="flex items-center gap-2"><ListChecks size={16} className="text-amber-400" /><h2 className="text-sm font-bold text-[var(--text-primary)]">Response lane</h2></div><p className="mt-1 text-xs text-[var(--text-muted)]">Open work ranked by ownership urgency.</p></div>
            <div className="divide-y divide-[var(--border)]">
              {openIncidents.length ? openIncidents.slice(0, 4).map(incident => { const meta = severityOf(incident.severity); return <button key={incident.id} type="button" onClick={() => router.push(`/org/${org.slug}/incidents/${incident.id}`)} className="group flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-blue-500/[0.04]"><span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}88` }} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{incident.title}</span><span className="mt-1 block text-[11px] text-[var(--text-muted)]">{incident.status} · {timeAgo(incident.createdAt)}</span></span><ChevronRight size={14} className="mt-1 flex-shrink-0 text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5" /></button>; }) : <EmptyState icon={<CheckCircle2 size={24} />} title="Response lane is clear" description="No open incidents need action right now." />}
            </div>
            <div className="border-t border-[var(--border)] px-5 py-3"><button type="button" onClick={() => router.push(`/org/${org.slug}/incidents`)} className="text-xs font-semibold text-blue-400 hover:text-blue-300">Open incident management <ChevronRight size={12} className="ml-1 inline" /></button></div>
          </Card>

          <Card>
            <div className="flex items-center gap-2"><HeartPulse size={16} className="text-emerald-400" /><h2 className="text-sm font-bold text-[var(--text-primary)]">Proof readiness</h2></div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Evidence operations that keep the audit trail moving.</p>
            <div className="mt-4 space-y-3">
              {[{ label: 'Scan evidence', value: stats?.scansThisWeek ?? 0, icon: ScanLine, tone: '#a78bfa', href: `/org/${org.slug}/scans` }, { label: 'Incident ownership', value: openIncidents.length ? `${openIncidents.length} open` : 'Clear', icon: ShieldAlert, tone: '#fb923c', href: `/org/${org.slug}/incidents` }, { label: 'Compliance controls', value: 'Review', icon: FileCheck2, tone: '#60a5fa', href: `/org/${org.slug}/compliance` }].map(item => <button key={item.label} type="button" onClick={() => router.push(item.href)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3 text-left transition-colors hover:border-blue-500/30"><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: item.tone, background: `${item.tone}18` }}><item.icon size={14} /></span><span className="flex-1"><span className="block text-xs font-semibold text-[var(--text-primary)]">{item.label}</span><span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{item.value}</span></span><ChevronRight size={13} className="text-[var(--text-faint)]" /></button>)}
            </div>
          </Card>

          <div className="space-y-2"><ActionLink label="Ingest security logs" detail="Create a signal trail from any source" icon={GitBranch} onClick={() => router.push(`/org/${org.slug}/logs`)} tone="#8b5cf6" /><ActionLink label="Run a focused scan" detail="Add fresh evidence to the workspace" icon={ScanLine} onClick={() => router.push(`/org/${org.slug}/scans`)} tone="#06b6d4" /><ActionLink label="Ask AI Copilot" detail="Summarize risk or draft next steps" icon={Sparkles} onClick={() => router.push(`/org/${org.slug}/ai-copilot`)} tone="#f472b6" /></div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg3)] px-5 py-4 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-2"><Timer size={14} className="text-blue-400" /> Operations view refreshes on demand and reads from existing Zyphorix sources.</span><button type="button" onClick={() => router.push(`/org/${org.slug}/compliance#soc2-operations`)} className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300">Open SOC 2 evidence center <ArrowUpRight size={13} /></button></div>
    </div>
  );
}
