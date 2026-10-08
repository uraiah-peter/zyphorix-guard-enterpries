'use client';
import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { useRouter } from 'next/navigation';
import {
  Shield, TrendingUp, TrendingDown, RefreshCw, ChevronRight,
  Link2, Mail, FileSearch, Cloud, Zap, FileText, ExternalLink,
  ShieldAlert, Activity, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { cn, timeAgo, RISK_COLORS } from '@/lib/utils';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart,
} from 'recharts';
import type { DashboardStats, ActivityItem } from '@/types';

// ─── Mini Sparkline ────────────────────────────────────────────────────────
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ x: i, y: v }));
  const max = Math.max(...data);
  const min = Math.min(...data);
  const h = 32, w = 80;
  const pts = points.map(p => {
    const x = (p.x / (data.length - 1)) * w;
    const y = h - ((p.y - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

// ─── Stat Card (top row) ───────────────────────────────────────────────────
function StatCard({ label, value, trend, trendLabel, icon, iconBg, valueColor, spark }: {
  label: string; value: string | number; trend: number; trendLabel: string;
  icon: string; iconBg: string; valueColor: string; spark: number[];
}) {
  const isUp = trend >= 0;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl text-xl" style={{ background: iconBg }}>
          {icon}
        </div>
        <MiniSparkline data={spark} color={valueColor} />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-2xl font-black mt-0.5" style={{ color: valueColor }}>{value}</p>
      </div>
      <div className="flex items-center gap-1">
        {isUp ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-red-600" />}
        <span className="text-xs font-medium" style={{ color: isUp ? '#10b981' : '#ef4444' }}>
          {isUp ? '↑' : '↓'} {Math.abs(trend)}% from last week
        </span>
      </div>
    </div>
  );
}

// ─── Security Score Ring ───────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
  const circ = 2 * Math.PI * 70;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90 absolute inset-0">
          <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 10px ${color}88)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/100</span>
        </div>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Your Security Score</p>
      <p className="text-sm font-bold mt-0.5" style={{ color }}>{label}</p>
    </div>
  );
}

// ─── Threat Distribution Donut ─────────────────────────────────────────────
const THREAT_DATA = [
  { name: 'Phishing',   value: 87,  pct: 36, color: '#ef4444' },
  { name: 'Malware',    value: 68,  pct: 28, color: '#f97316' },
  { name: 'Suspicious', value: 49,  pct: 20, color: '#f59e0b' },
  { name: 'Exploit',    value: 24,  pct: 10, color: '#8b5cf6' },
  { name: 'Other',      value: 15,  pct: 6,  color: 'var(--text-muted)' },
];

function ThreatDonut({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-6">
      <div style={{ width: 140, height: 140, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={THREAT_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
              {THREAT_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5">
        {THREAT_DATA.map(t => (
          <div key={t.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.pct}% ({t.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Security Risks ────────────────────────────────────────────────────
const TOP_RISKS = [
  { rank: 1, title: 'S3 Bucket Public Access', severity: 'Critical', color: '#dc2626', icon: '🪣' },
  { rank: 2, title: 'Outdated Software',        severity: 'High',     color: '#ef4444', icon: '⚠️' },
  { rank: 3, title: 'Open SSH Port (22)',        severity: 'High',     color: '#ef4444', icon: '🔓' },
  { rank: 4, title: 'Weak IAM Permissions',     severity: 'Medium',   color: '#f59e0b', icon: '🔐' },
  { rank: 5, title: 'Missing MFA',              severity: 'Medium',   color: '#f59e0b', icon: '📵' },
];

function TopRisks({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  return (
    <div className="space-y-2">
      {TOP_RISKS.map(r => (
        <div key={r.rank} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-blue-500/10"
          onClick={() => router.push(`/org/${orgSlug}/incidents`)}>
          <span className="text-xs font-bold w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{r.rank}</span>
          <span className="text-base flex-shrink-0">{r.icon}</span>
          <span className="text-xs flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{r.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}40` }}>{r.severity}</span>
          <ChevronRight size={12} style={{ color: 'var(--text-faint)' }} />
        </div>
      ))}
    </div>
  );
}

// ─── Cloud Security Posture ────────────────────────────────────────────────
const CLOUD_SERVICES = [
  { label: 'IAM Security',      status: 'Good',   color: '#10b981' },
  { label: 'S3 Security',       status: 'Medium', color: '#f59e0b' },
  { label: 'Network Security',  status: 'Good',   color: '#10b981' },
  { label: 'Data Protection',   status: 'Medium', color: '#f59e0b' },
  { label: 'Logging & Monitoring', status: 'Good', color: '#10b981' },
];

function CloudPosture({ score }: { score: number }) {
  const router = useRouter();
  return (
    <div className="flex items-start gap-4">
      {/* AWS hexagon logo */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className="flex items-center justify-center rounded-2xl" style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '2px solid #bfdbfe' }}>
          <span className="text-2xl font-black" style={{ color: '#ff9900', fontFamily: 'Amazon Ember, Arial, sans-serif', letterSpacing: '-1px' }}>aws</span>
        </div>
        <p className="text-xl font-black mt-2" style={{ color: '#10b981' }}>{score}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>/100</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: '#10b981' }}>Good</p>
      </div>
      {/* Service breakdown */}
      <div className="flex-1 space-y-2">
        {CLOUD_SERVICES.map(s => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: s.color }}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Scans ──────────────────────────────────────────────────────────
const SCAN_TYPE_ICONS: Record<string, string> = { URL:'🔗', EMAIL:'✉️', FILE:'📄', DOMAIN_IP:'🌐', CLOUD:'☁️', FULL_SYSTEM:'🖥️' };

function RecentScanRow({ scan }: { scan: any }) {
  const score = scan.riskScore;
  const color = score === null ? 'var(--text-muted)' : score >= 66 ? '#ef4444' : score >= 41 ? '#f97316' : '#10b981';
  const label = score === null ? scan.status : score >= 66 ? 'Risky' : score >= 41 ? 'Caution' : 'Safe';
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-base flex-shrink-0">{SCAN_TYPE_ICONS[scan.type] ?? '🔍'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {scan.type === 'FULL_SYSTEM' ? 'Full System Scan' : `${scan.type} Scan`}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{scan.createdAt ? timeAgo(scan.createdAt) : ''}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {score !== null && (
          <span className="text-sm font-black" style={{ color }}>{score} <span className="text-xs font-normal" style={{ color: 'var(--text-faint)' }}>/100</span></span>
        )}
        {score === null && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>{label}</span>}
      </div>
    </div>
  );
}

// ─── Activity Feed ─────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: ActivityItem }) {
  const sevBg: Record<string, string> = { CRITICAL:'#dc2626', HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#10b981', SAFE:'#10b981' };
  const icons: Record<string, string> = { scan:'🔍', incident:'🚨', member:'👤', cloud:'☁️', api_key:'🔑' };
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 text-sm" style={{ background: 'var(--border)' }}>
        {icons[item.type] ?? '📌'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
        {item.severity && (
          <span className="inline-flex items-center mt-1 text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${sevBg[item.severity] ?? 'var(--text-muted)'}20`, color: sevBg[item.severity] ?? 'var(--text-muted)', border: `1px solid ${sevBg[item.severity] ?? 'var(--text-muted)'}40` }}>
            {item.severity.charAt(0) + item.severity.slice(1).toLowerCase()}
          </span>
        )}
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{timeAgo(item.timestamp)}</span>
    </div>
  );
}

// ─── Quick Actions ─────────────────────────────────────────────────────────
function QuickActions({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const actions = [
    { icon:'🔍', label:'Scan URL',      sub:'Check any link',     href:`/org/${orgSlug}/scans/url` },
    { icon:'✉️', label:'Scan Email',    sub:'Analyze email',      href:`/org/${orgSlug}/scans/email` },
    { icon:'📄', label:'Scan File',     sub:'Upload a file',      href:`/org/${orgSlug}/scans/file` },
    { icon:'☁️', label:'Cloud Scan',    sub:'Scan your cloud',    href:`/org/${orgSlug}/cloud` },
    { icon:'🤖', label:'AI Copilot',    sub:'Ask AI Assistant',   href:`/org/${orgSlug}/ai-copilot` },
    { icon:'📊', label:'Custom Report', sub:'Generate report',    href:`/org/${orgSlug}/settings/audit-logs` },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {actions.map(a => (
        <button key={a.label} onClick={() => router.push(a.href)}
          className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-blue-500/10 cursor-pointer"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <span className="text-2xl">{a.icon}</span>
          <div className="text-center">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{a.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── AI Copilot Mini Panel ─────────────────────────────────────────────────
function AiCopilotPanel({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">AI Security Copilot</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>BETA</span>
      </div>
      {/* Robot illustration */}
      <div className="flex flex-col items-center justify-center py-5 px-4">
        <div className="flex items-center justify-center rounded-3xl mb-4" style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '2px solid #bfdbfe', boxShadow: '0 0 24px rgba(37,99,235,0.15)' }}>
          <div className="relative">
            <span className="text-3xl">🤖</span>
          </div>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)] text-center">Hi Uraiah, I'm your AI Security Copilot.</p>
        <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>Ask me anything about security, threats, or how to protect your systems.</p>
      </div>
      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-faint)]"
            style={{ color: 'var(--text-primary)' }}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { router.push(`/org/${orgSlug}/ai-copilot?q=${encodeURIComponent(input)}`); } }}
          />
          <button onClick={() => { if (input.trim()) router.push(`/org/${orgSlug}/ai-copilot?q=${encodeURIComponent(input)}`); }}
            className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 10px rgba(59,130,246,0.4)' }}>
            <span className="text-white text-sm font-bold">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly trend data (mock — real data in Phase 3 scan history) ──────────
const generateWeeklyData = () => Array.from({ length: 7 }, (_, i) => ({
  date: ['May 16','May 17','May 18','May 19','May 20','May 21','May 22'][i],
  score: 72 + Math.floor(Math.random() * 18),
}));

// ─── Dashboard Page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { org, plan } = useOrg();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7D'|'30D'|'90D'>('7D');
  const weeklyData = generateWeeklyData();

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, actRes, scansRes] = await Promise.all([
        fetch(`/api/dashboard/stats?orgId=${org.id}`),
        fetch(`/api/dashboard/activity?orgId=${org.id}`),
        fetch(`/api/scans?orgId=${org.id}&limit=6`),
      ]);
      const [sj, aj, scj] = await Promise.all([statsRes.json(), actRes.json(), scansRes.json()]);
      if (sj.data) setStats(sj.data);
      if (aj.data) setActivity(aj.data);
      if (scj.data?.items) setScans(scj.data.items);
    } finally { setLoading(false); setRefreshing(false); }
  }, [org.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleRefresh() { setRefreshing(true); await fetchAll(); }

  const score = stats?.securityScore ?? 87;
  const cloudScore = 76;

  // Sparkline mock data
  const spark = (base: number) => Array.from({length:7}, () => base + Math.floor(Math.random()*20)-10);

  return (
    <div className="h-full flex gap-5 overflow-hidden">
      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-5">

        {/* Stat cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Security Score"     value={`${score} /100`} trend={12} trendLabel="from last week" icon="🛡️" iconBg="rgba(59,130,246,0.15)"  valueColor="#3b82f6" spark={spark(score)} />
          <StatCard label="Threats Blocked"    value={stats?.threatsDetected ?? 243} trend={18} trendLabel="from last week" icon="🚫" iconBg="rgba(239,68,68,0.15)"   valueColor="#ef4444" spark={spark(40)} />
          <StatCard label="Scans This Week"    value={stats?.scansThisWeek ?? 156}   trend={22} trendLabel="from last week" icon="🔍" iconBg="rgba(99,102,241,0.15)"  valueColor="#6366f1" spark={spark(30)} />
          <StatCard label="Assets Monitored"   value={stats?.assetsMonitored ?? 24}  trend={8}  trendLabel="from last week" icon="🖥️" iconBg="rgba(16,185,129,0.15)"  valueColor="#10b981" spark={spark(20)} />
          <StatCard label="Incidents Resolved" value={18}                             trend={20} trendLabel="from last week" icon="✅" iconBg="rgba(16,185,129,0.15)"  valueColor="#10b981" spark={spark(15)} />
        </div>

        {/* Security Overview + Threat Distribution */}
        <div className="grid grid-cols-12 gap-4">
          {/* Security Overview */}
          <div className="col-span-12 lg:col-span-7 rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">Security Overview</p>
              <div className="flex gap-1">
                {(['7D','30D','90D'] as const).map(r => (
                  <button key={r} onClick={() => setTimeRange(r)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: timeRange===r ? '#3b82f6' : 'transparent', color: timeRange===r ? '#fff' : 'var(--text-muted)', border: `1px solid ${timeRange===r ? '#3b82f6' : 'var(--border)'}` }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-6">
              <ScoreRing score={score} />
              <div className="flex-1 min-w-0">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,100]} tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)', fontSize:12 }} />
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill:'#3b82f6', strokeWidth:2, r:3 }} activeDot={{ r:5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Threat Distribution */}
          <div className="col-span-12 lg:col-span-5 rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">Threat Distribution</p>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 7 days</span>
            </div>
            <ThreatDonut total={stats?.threatsDetected ?? 243} />
          </div>
        </div>

        {/* Top Risks + Cloud Posture + Recent Scans */}
        <div className="grid grid-cols-12 gap-4">
          {/* Top Security Risks */}
          <div className="col-span-12 lg:col-span-4 rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-[var(--text-primary)]">Top Security Risks</p>
              <button onClick={() => router.push(`/org/${org.slug}/incidents`)} className="text-xs text-blue-600 hover:text-blue-600 flex items-center gap-1">
                View all <ChevronRight size={12} />
              </button>
            </div>
            <TopRisks orgSlug={org.slug} />
          </div>

          {/* Cloud Security Posture */}
          <div className="col-span-12 lg:col-span-4 rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-[var(--text-primary)]">Cloud Security Posture</p>
              <button onClick={() => router.push(`/org/${org.slug}/cloud`)} className="text-xs text-blue-600 hover:text-blue-600 flex items-center gap-1">
                View details <ChevronRight size={12} />
              </button>
            </div>
            <CloudPosture score={cloudScore} />
          </div>

          {/* Recent Scans */}
          <div className="col-span-12 lg:col-span-4 rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-[var(--text-primary)]">Recent Scans</p>
              <button onClick={() => router.push(`/org/${org.slug}/scans`)} className="text-xs text-blue-600 hover:text-blue-600 flex items-center gap-1">
                View all <ChevronRight size={12} />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({length:4}).map((_,i) => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background:'var(--border)' }} />)}</div>
            ) : scans.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color:'var(--text-muted)' }}>No scans yet. Run your first scan!</p>
            ) : (
              <div>{scans.slice(0,5).map(s => <RecentScanRow key={s.id} scan={s} />)}</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Quick Actions</p>
          <QuickActions orgSlug={org.slug} />
        </div>
      </div>

      {/* ── Right sidebar ─────────────────────────────────────── */}
      <div className="hidden xl:flex flex-col gap-4 flex-shrink-0 overflow-y-auto pb-5" style={{ width: 280 }}>
        {/* Recent Activity */}
        <div className="rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-bold text-[var(--text-primary)]">Recent Activity</p>
            <button onClick={() => router.push(`/org/${org.slug}/scans`)} className="text-xs text-blue-600 hover:text-blue-600">View all</button>
          </div>
          <div className="px-4 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 py-3">{Array.from({length:5}).map((_,i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background:'var(--border)' }} />)}</div>
            ) : activity.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color:'var(--text-muted)' }}>No activity yet</p>
            ) : (
              activity.map(item => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </div>

        {/* AI Copilot mini panel */}
        <AiCopilotPanel orgSlug={org.slug} />

        {/* Refresh button */}
        <button onClick={handleRefresh}
          className={cn('flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all', refreshing && 'opacity-60')}
          style={{ background: 'var(--border)', border: '1px solid var(--border2)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
          Refresh dashboard
        </button>
      </div>
    </div>
  );
}
