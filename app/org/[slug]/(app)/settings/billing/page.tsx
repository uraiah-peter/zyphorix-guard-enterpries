'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Crown, Check, Zap, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, SectionHeader, Badge, Skeleton, ErrorBanner } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { cn, extractApiError } from '@/lib/utils';

// ─── Plan definitions (mirrors PLAN_LIMITS in types/index.ts) ─────────────
const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    description: 'Get started with basic security scanning',
    color: 'var(--text-muted)',
    features: [
      '10 scans per month',
      '1 user',
      'URL, Email, File, Domain scanning',
      'Heuristic threat detection',
      '7-day scan history',
    ],
    limits: ['No AI Copilot', 'No cloud security', 'No compliance modules', 'No API access'],
    cta: 'Current plan',
    popular: false,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    description: 'Security basics for solo founders and small teams',
    color: '#3b82f6',
    features: [
      '500 scans per month',
      '3 users',
      'All scanner types with VirusTotal + AbuseIPDB',
      'DMARC/SPF/DKIM email verification',
      '50 AI Copilot queries/month',
      'Slack + webhook alerts',
      '30-day scan history',
      'API access',
    ],
    limits: ['No cloud security scanning', 'No compliance modules'],
    cta: 'Start free trial',
    popular: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 99,
    description: 'The full platform for growing startups',
    color: '#6366f1',
    badge: 'Most Popular',
    features: [
      '5,000 scans per month',
      '10 users',
      'Everything in Starter',
      'Unlimited AI Copilot',
      'AWS cloud security scanning',
      'SOC 2 compliance automation',
      'Automated playbooks (SOAR)',
      'Log ingestion (lightweight SIEM)',
      'Incident management',
      'Asset inventory',
      '90-day history',
    ],
    limits: ['No PCI DSS / HIPAA modules', 'No SSO'],
    cta: 'Start free trial',
    popular: true,
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 149,
    description: 'Compliance-ready for fintech, healthtech, and regulated industries',
    color: '#8b5cf6',
    badge: 'Best Value',
    features: [
      '20,000 scans per month',
      '25 users',
      'Everything in Pro',
      'PCI DSS v4.0 compliance automation',
      'HIPAA Security Rule compliance',
      'SOC 2 + PCI + HIPAA in one dashboard',
      '1-year audit history',
      'Priority support',
      'Custom report branding',
    ],
    limits: ['No SSO/SAML'],
    cta: 'Start free trial',
    popular: false,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: null,
    description: 'For post-Series B companies with dedicated security needs',
    color: '#ec4899',
    features: [
      'Unlimited scans',
      'Unlimited users',
      'Everything in Business',
      'SSO / SAML integration',
      'Custom integrations',
      'Dedicated onboarding',
      'Quarterly security reviews',
      'SLA guarantee',
      '365-day history',
    ],
    limits: [],
    cta: 'Contact sales',
    popular: false,
  },
];

// Feature comparison for the detail table
const COMPARISON_ROWS = [
  { feature: 'Scans per month', FREE:'10', STARTER:'500', PRO:'5,000', BUSINESS:'20,000', ENTERPRISE:'Unlimited' },
  { feature: 'Team members', FREE:'1', STARTER:'3', PRO:'10', BUSINESS:'25', ENTERPRISE:'Unlimited' },
  { feature: 'URL / Email / File / Domain scanning', FREE:'✓', STARTER:'✓', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'VirusTotal + AbuseIPDB accuracy', FREE:'—', STARTER:'✓', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'DMARC/SPF email verification', FREE:'—', STARTER:'✓', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'AI Security Copilot', FREE:'—', STARTER:'50/mo', PRO:'Unlimited', BUSINESS:'Unlimited', ENTERPRISE:'Unlimited' },
  { feature: 'Slack + webhook alerts', FREE:'—', STARTER:'✓', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'Automated playbooks', FREE:'—', STARTER:'—', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'Log ingestion (SIEM)', FREE:'—', STARTER:'—', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'AWS cloud security', FREE:'—', STARTER:'—', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'Incident management', FREE:'—', STARTER:'—', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'SOC 2 compliance', FREE:'—', STARTER:'—', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'PCI DSS compliance', FREE:'—', STARTER:'—', PRO:'—', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'HIPAA compliance', FREE:'—', STARTER:'—', PRO:'—', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'API access', FREE:'—', STARTER:'✓', PRO:'✓', BUSINESS:'✓', ENTERPRISE:'✓' },
  { feature: 'Scan history', FREE:'7 days', STARTER:'30 days', PRO:'90 days', BUSINESS:'1 year', ENTERPRISE:'1 year' },
  { feature: 'SSO / SAML', FREE:'—', STARTER:'—', PRO:'—', BUSINESS:'—', ENTERPRISE:'✓' },
];

function PlanCard({ plan, currentPlan, onUpgrade, onManage }: {
  plan: typeof PLANS[0]; currentPlan: string; onUpgrade: (id: string) => void; onManage: () => void;
}) {
  const isCurrent = plan.id === currentPlan;
  const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlan);

  return (
    <div className={cn('relative rounded-2xl p-5 flex flex-col transition-all', plan.popular ? 'ring-2' : '')}
      style={{ background:'var(--card)', border:`1px solid ${plan.popular ? plan.color : 'var(--border)'}`, ...(plan.popular ? { boxShadow:`0 0 24px ${plan.color}22` } : {}) }}>
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: plan.color }}>
            {plan.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <p className="text-base font-bold text-[var(--text-primary)]">{plan.name}</p>
        <div className="flex items-end gap-1 mt-1 mb-2">
          {plan.price !== null ? (
            <>
              <span className="text-3xl font-black" style={{ color: plan.color }}>${plan.price}</span>
              <span className="text-sm mb-1" style={{ color:'var(--text-muted)' }}>/mo</span>
            </>
          ) : (
            <span className="text-xl font-bold" style={{ color: plan.color }}>Custom pricing</span>
          )}
        </div>
        <p className="text-xs" style={{ color:'var(--text-muted)' }}>{plan.description}</p>
      </div>

      {/* Features */}
      <div className="flex-1 space-y-2 mb-5">
        {plan.features.map(f => (
          <div key={f} className="flex items-start gap-2">
            <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
            <span className="text-xs" style={{ color:'var(--text-secondary)' }}>{f}</span>
          </div>
        ))}
        {plan.limits.map(f => (
          <div key={f} className="flex items-start gap-2 opacity-40">
            <span className="flex-shrink-0 mt-0.5 text-xs font-bold" style={{ color:'var(--text-muted)' }}>—</span>
            <span className="text-xs" style={{ color:'var(--text-muted)' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <button onClick={onManage} className="glow-btn w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#10b981' }}>
          ✓ Current plan — Manage
        </button>
      ) : plan.id === 'ENTERPRISE' ? (
        <a href="mailto:sales@zyphorix.com" className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all"
          style={{ background:`${plan.color}15`, border:`1px solid ${plan.color}30`, color: plan.color }}>
          Contact sales →
        </a>
      ) : isDowngrade ? (
        <button onClick={() => onManage()} className="glow-btn w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)' }}>
          Downgrade
        </button>
      ) : (
        <button onClick={() => onUpgrade(plan.id)} className="glow-btn w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: plan.color, color:'#fff', boxShadow: plan.popular ? `0 4px 16px ${plan.color}44` : undefined }}>
          {plan.cta}
        </button>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { org, plan: currentPlan } = useOrg();
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/billing/usage?orgId=${org.id}`)
      .then(r => r.json())
      .then(j => { if (j.data) setUsage(j.data); })
      .finally(() => setLoading(false));
  }, [org.id]);

  async function handleUpgrade(planId: string) {
    setError('');
    setUpgrading(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, plan: planId }),
      });
      if (!res.ok) { setError(await extractApiError(res, 'Could not start checkout. Please try again.')); return; }
      const json = await res.json();
      if (json.data?.url) window.location.href = json.data.url;
      else setError('Could not start checkout. Please try again.');
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManage() {
    setError('');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id }),
      });
      if (!res.ok) { setError(await extractApiError(res, 'Could not open the billing portal. Please try again.')); return; }
      const json = await res.json();
      if (json.data?.url) window.location.href = json.data.url;
      else setError('Could not open the billing portal. Please try again.');
    } catch {
      setError('Network error — please check your connection and try again.');
    }
  }

  const currentPlanDef = PLANS.find(p => p.id === currentPlan) ?? PLANS[0];

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader title="Billing & Plans" description="Upgrade to unlock more scans, users, and compliance features" />

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Current plan summary */}
      {!loading && usage && (
        <div className="rounded-xl p-5" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown size={18} style={{ color: currentPlanDef.color }} />
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{currentPlanDef.name} Plan</p>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                  {currentPlanDef.price ? `$${currentPlanDef.price}/month` : 'Free forever'}
                  {usage.currentPeriodEnd && ` · Renews ${new Date(usage.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={handleManage}>Manage billing</Button>
          </div>
          {/* Usage meters */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label:'Scans used', used: usage.usage?.scans?.used ?? 0, limit: usage.usage?.scans?.limit ?? 10 },
              { label:'Team members', used: usage.usage?.members?.used ?? 1, limit: usage.usage?.members?.limit ?? 1 },
            ].map(m => {
              const pct = m.limit === -1 ? 0 : Math.round((m.used / m.limit) * 100);
              const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
              return (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color:'var(--text-muted)' }}>{m.label}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{m.used} / {m.limit === -1 ? '∞' : m.limit}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background:'var(--border)' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width:`${m.limit===-1?15:Math.min(100,pct)}%`, background:color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {usage.cancelAtPeriodEnd && (
            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={13} className="text-red-400" />
              <p className="text-xs text-red-400">Your plan cancels at the end of the current period. Click "Manage billing" to reactivate.</p>
            </div>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {PLANS.map(plan => (
          <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan}
            onUpgrade={handleUpgrade} onManage={handleManage} />
        ))}
      </div>

      {/* ROI callout */}
      <div className="rounded-xl p-5" style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">💡</span>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] mb-1">Why upgrade? The math is simple.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              {[
                { plan:'Starter — $29/mo', saves:'One caught phishing email prevents $15,000+ in incident response costs.', color:'#3b82f6' },
                { plan:'Pro — $99/mo', saves:'AWS misconfig detection replaces $5,000+ in manual cloud security audits.', color:'#6366f1' },
                { plan:'Business — $149/mo', saves:'SOC 2 + PCI automation replaces $10,000–$20,000/year in compliance consulting.', color:'#8b5cf6' },
              ].map(r => (
                <div key={r.plan} className="p-3 rounded-xl" style={{ background:'var(--card)', border:`1px solid ${r.color}30` }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: r.color }}>{r.plan}</p>
                  <p className="text-xs" style={{ color:'var(--text-secondary)' }}>{r.saves}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature comparison toggle */}
      <div>
        <button onClick={() => setShowComparison(v => !v)}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all text-center"
          style={{ background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-muted)' }}>
          {showComparison ? '▲ Hide' : '▼ Show'} full feature comparison
        </button>

        {showComparison && (
          <div className="mt-4 rounded-xl overflow-x-auto" style={{ border:'1px solid var(--border)' }}>
            <table className="w-full text-xs" style={{ minWidth: 640 }}>
              <thead>
                <tr style={{ background:'var(--card)', borderBottom:'1px solid var(--border)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color:'var(--text-muted)', width:'35%' }}>Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} className="text-center px-2 py-3 font-bold" style={{ color: p.id === currentPlan ? p.color : 'var(--text-secondary)' }}>
                      {p.name}
                      {p.id === currentPlan && <span className="block text-xs font-normal" style={{ color: p.color }}>current</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background:'var(--card)' }}>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom:'1px solid var(--border)', background: i%2===0?'transparent':'rgba(255,255,255,0.02)' }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color:'var(--text-secondary)' }}>{row.feature}</td>
                    {(['FREE','STARTER','PRO','BUSINESS','ENTERPRISE'] as const).map(plan => (
                      <td key={plan} className="text-center px-2 py-2.5" style={{ color: row[plan]==='✓'?'#10b981':row[plan]==='—'?'var(--text-faint)':'var(--text-primary)', fontWeight: row[plan]==='✓'?'bold':'normal' }}>
                        {row[plan]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-[var(--text-primary)]">Common questions</p>
        {[
          { q:'Can I try before paying?', a:'Yes — every paid plan starts with a 14-day free trial. No credit card required to start.' },
          { q:'What counts as a scan?', a:'Each URL, email, file, or domain analyzed counts as one scan. Cloud security scans do not count against your scan limit.' },
          { q:'Can I change plans anytime?', a:'Yes. Upgrade instantly, downgrade at the end of your billing period. No long-term contracts.' },
          { q:'What happens if I exceed my scan limit?', a:'You\'ll see a clear upgrade prompt. Existing scans and data remain accessible. We never delete your data.' },
          { q:'Do you offer discounts?', a:'Annual billing saves 20% (coming soon). Startups in accelerator programs contact us for special pricing.' },
        ].map(faq => (
          <div key={faq.q} className="rounded-xl p-4" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">{faq.q}</p>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
