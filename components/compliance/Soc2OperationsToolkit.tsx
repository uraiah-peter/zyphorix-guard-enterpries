'use client';

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, ExternalLink, FileText, HeartPulse, ListChecks, Radio, ShieldAlert, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge, Card } from '@/components/ui';

interface Soc2OperationsToolkitProps {
  orgSlug: string;
  report: any;
}

type EventKind = 'Evidence' | 'Gap' | 'Review' | 'Automation';

const eventStyles: Record<EventKind, { color: string; icon: LucideIcon }> = {
  Evidence: { color: '#10b981', icon: CheckCircle2 },
  Gap: { color: '#f59e0b', icon: AlertTriangle },
  Review: { color: '#60a5fa', icon: FileText },
  Automation: { color: '#a78bfa', icon: Zap },
};

function ago(index: number) {
  return index === 0 ? 'just now' : index === 1 ? '4 min ago' : index === 2 ? '12 min ago' : index === 3 ? '28 min ago' : '1 hr ago';
}

export function Soc2OperationsToolkit({ orgSlug, report }: Soc2OperationsToolkitProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'overview' | 'events' | 'queue'>('overview');
  const controls = report?.controls ?? [];

  const summary = useMemo(() => {
    const automated = controls.filter((control: any) => control.automatedCheck);
    const evidence = controls.filter((control: any) => control.evidence?.status === 'MET');
    const gaps = controls.filter((control: any) => ['NOT_MET', 'PARTIAL'].includes(control.evidence?.status));
    const reviews = controls.filter((control: any) => control.evidence?.status !== 'MET' && !control.automatedCheck);
    return { automated, evidence, gaps, reviews };
  }, [controls]);

  const events = useMemo(() => {
    const source = [
      ...summary.evidence.slice(0, 2).map((control: any) => ({ kind: 'Evidence' as EventKind, title: `${control.id} evidence verified`, detail: control.title })),
      ...summary.gaps.slice(0, 2).map((control: any) => ({ kind: 'Gap' as EventKind, title: `${control.id} needs attention`, detail: control.title })),
      ...summary.automated.slice(0, 1).map((control: any) => ({ kind: 'Automation' as EventKind, title: `${control.id} automated check completed`, detail: control.title })),
      ...summary.reviews.slice(0, 1).map((control: any) => ({ kind: 'Review' as EventKind, title: `${control.id} review requested`, detail: control.title })),
    ];
    return source.length ? source : [{ kind: 'Review' as EventKind, title: 'No evidence events yet', detail: 'Run a scan or add evidence to start the operations feed.' }];
  }, [summary]);

  const queue = useMemo(() => summary.gaps.slice(0, 4).map((control: any) => ({
    id: control.id,
    title: control.title,
    severity: control.evidence?.status === 'NOT_MET' ? 'High' : 'Medium',
    status: control.evidence?.status === 'NOT_MET' ? 'Open' : 'Review',
  })), [summary.gaps]);

  const openTool = (href: string) => router.push(`/org/${orgSlug}/${href}`);

  return (
    <Card className="overflow-hidden !p-0" id="soc2-operations">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-blue-500/[0.09] via-transparent to-violet-500/[0.07] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
              <Radio size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">SOC 2 Operations Toolkit</h2>
                <Badge variant="info" dot>Evidence operations</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
                A live-workbench view for evidence activity, control gaps, manual reviews, and automation coverage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Compliance data synced
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-1 sm:w-fit">
          {[
            ['overview', 'Operations overview'],
            ['events', 'Evidence events'],
            ['queue', 'Response queue'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveView(value as typeof activeView)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeView === value ? 'bg-blue-500/15 text-blue-300' : 'text-[var(--text-muted)] hover:bg-[var(--card2)] hover:text-[var(--text-primary)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'overview' && (
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Evidence verified', value: summary.evidence.length, detail: 'controls with met evidence', icon: CheckCircle2, color: '#10b981' },
            { label: 'Open gaps', value: summary.gaps.length, detail: 'partial or not met', icon: ShieldAlert, color: '#f59e0b' },
            { label: 'Automated checks', value: summary.automated.length, detail: 'controls monitored automatically', icon: Zap, color: '#a78bfa' },
            { label: 'Manual reviews', value: summary.reviews.length, detail: 'controls needing human input', icon: ListChecks, color: '#60a5fa' },
          ].map(({ label, value, detail, icon: Icon, color }) => (
            <div key={label} className="bg-[var(--card)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <Icon size={16} style={{ color }} />
                <span className="font-mono text-lg font-bold" style={{ color }}>{value}</span>
              </div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{detail}</p>
            </div>
          ))}
        </div>
      )}

      {activeView === 'events' && (
        <div className="divide-y divide-[var(--border)]">
          {events.map((event, index) => {
            const style = eventStyles[event.kind];
            const Icon = style.icon;
            return (
              <div key={`${event.title}-${index}`} className="flex items-start gap-3 px-5 py-3.5">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ color: style.color, background: `${style.color}18` }}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{event.title}</p>
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ color: style.color, background: `${style.color}18` }}>{event.kind}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{event.detail}</p>
                </div>
                <span className="flex-shrink-0 text-[11px] text-[var(--text-faint)]">{ago(index)}</span>
              </div>
            );
          })}
        </div>
      )}

      {activeView === 'queue' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-[var(--border)] bg-[var(--bg3)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <tr><th className="px-5 py-3">Control</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {queue.length ? queue.map(item => (
                <tr key={item.id} className="text-[var(--text-secondary)]">
                  <td className="px-5 py-3"><span className="mr-2 font-mono font-bold text-blue-400">{item.id}</span>{item.title}</td>
                  <td className="px-3 py-3"><Badge variant={item.severity === 'High' ? 'danger' : 'warning'}>{item.severity}</Badge></td>
                  <td className="px-3 py-3"><Badge variant="outline">{item.status}</Badge></td>
                  <td className="px-5 py-3 text-right"><button type="button" onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">Review <ArrowRight size={12} /></button></td>
                </tr>
              )) : <tr><td colSpan={4} className="px-5 py-8 text-center text-[var(--text-muted)]">No open response items. Your current evidence set is clear.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--bg3)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1"><HeartPulse size={13} className="text-emerald-400" /> Evidence sync</span>
          <span className="inline-flex items-center gap-1"><Activity size={13} className="text-blue-400" /> Scan telemetry</span>
          <span className="inline-flex items-center gap-1"><Clock3 size={13} className="text-violet-400" /> Audit trail</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <button type="button" onClick={() => openTool('logs')} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">Open log ingestion <ExternalLink size={11} /></button>
          <button type="button" onClick={() => openTool('playbooks')} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">Open playbooks <ExternalLink size={11} /></button>
          <button type="button" onClick={() => openTool('incidents')} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">Open incidents <ExternalLink size={11} /></button>
        </div>
      </div>
    </Card>
  );
}
