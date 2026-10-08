'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import {
  Plus, Trash2, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, ExternalLink, Copy, Check, Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, SectionHeader, Badge, Skeleton, EmptyState, ErrorBanner } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { timeAgo, cn, extractApiError } from '@/lib/utils';

const PROVIDER_CONFIG = {
  SLACK:   { label: 'Slack',           emoji: '💬', color: '#4A154B', urlHint: 'https://hooks.slack.com/services/...' },
  DISCORD: { label: 'Discord',         emoji: '🎮', color: '#5865F2', urlHint: 'https://discord.com/api/webhooks/...' },
  TEAMS:   { label: 'Microsoft Teams', emoji: '🔷', color: '#6264A7', urlHint: 'https://xxx.webhook.office.com/...' },
  WEBHOOK: { label: 'Custom Webhook',  emoji: '🔗', color: '#3b82f6', urlHint: 'https://your-server.com/webhook' },
};

const ALL_EVENTS = [
  { value: 'CRITICAL_THREAT',   label: '🚨 Critical threat detected',         desc: 'Any scan returns CRITICAL risk level' },
  { value: 'THREAT_DETECTED',   label: '⚠️ High threat detected',              desc: 'Any scan returns HIGH or CRITICAL risk' },
  { value: 'INCIDENT_P1',       label: '🔴 P1 Critical incident opened',       desc: 'New P1 severity incident created' },
  { value: 'INCIDENT_CREATED',  label: '📋 Any incident created',              desc: 'Any new incident opened (P1–P4)' },
  { value: 'CLOUD_ISSUE_FOUND', label: '☁️ Cloud security issue found',        desc: 'AWS scan finds HIGH or CRITICAL issue' },
  { value: 'SCAN_COMPLETED',    label: '🔍 Every scan completed',              desc: 'Verbose — fires on every scan (noisy)' },
  { value: 'MEMBER_JOINED',     label: '👤 Team member joined',               desc: 'Someone accepts an org invite' },
  { value: 'WEEKLY_DIGEST',     label: '📊 Weekly security digest',           desc: 'Weekly summary every Monday 9am' },
];

function SetupGuide({ provider }: { provider: string }) {
  const guides: Record<string, { steps: string[]; docUrl: string }> = {
    SLACK: {
      docUrl: 'https://api.slack.com/messaging/webhooks',
      steps: [
        'Go to api.slack.com/apps → Create New App → From scratch',
        'Select your Slack workspace',
        'Go to "Incoming Webhooks" → Toggle on → Add New Webhook to Workspace',
        'Choose the channel to post alerts → Allow',
        'Copy the Webhook URL and paste it below',
      ],
    },
    DISCORD: {
      docUrl: 'https://support.discord.com/hc/en-us/articles/228383668',
      steps: [
        'Open Discord → Right-click your channel → Edit Channel',
        'Go to Integrations → Webhooks → New Webhook',
        'Name it "Zyphorix Guard" → Copy Webhook URL',
        'Paste the URL below',
      ],
    },
    TEAMS: {
      docUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
      steps: [
        'Open Teams channel → ··· → Connectors',
        'Search for "Incoming Webhook" → Configure',
        'Name it "Zyphorix Guard" → Create',
        'Copy the webhook URL → Done',
        'Paste the URL below',
      ],
    },
    WEBHOOK: {
      docUrl: 'https://docs.zyphorix.com/webhooks',
      steps: [
        'Enter any HTTPS endpoint that accepts POST requests',
        'Zyphorix will send JSON payloads signed with HMAC-SHA256',
        'Verify signatures using the X-Zyphorix-Signature header',
        'Your endpoint must return 2xx within 10 seconds',
      ],
    },
  };

  const guide = guides[provider];
  if (!guide) return null;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-400">SETUP GUIDE</p>
        <a href={guide.docUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1">
          Full docs <ExternalLink size={10} />
        </a>
      </div>
      <div className="space-y-2">
        {guide.steps.map((step, i) => (
          <div key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex-shrink-0 font-bold" style={{ color: '#3b82f6' }}>{i + 1}.</span>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateIntegrationDialog({ orgId, onCreated, onClose }: { orgId: string; onCreated: () => void; onClose: () => void }) {
  const [provider, setProvider] = useState<string>('SLACK');
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['CRITICAL_THREAT', 'INCIDENT_P1', 'CLOUD_ISSUE_FOUND']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cfg = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];

  function toggleEvent(event: string) {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  }

  async function handleCreate() {
    if (!name.trim() || !webhookUrl.trim()) { setError('Name and webhook URL are required'); return; }
    if (selectedEvents.length === 0) { setError('Select at least one event'); return; }
    setError(''); setLoading(true);

    const res = await fetch('/api/integrations/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, provider, name, webhookUrl, events: selectedEvents }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) { setError(json.error?.message ?? 'Failed to create integration'); return; }
    if (json.data?.secret) setSecret(json.data.secret);
    else { onCreated(); }
  }

  async function copySecret() {
    if (secret) { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (secret) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
        <div className="w-full max-w-md rounded-2xl shadow-2xl animate-fade-in" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Save your signing secret</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <p className="text-xs font-semibold text-amber-400 mb-1">⚠️ Copy this now — it won't be shown again</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Use this secret to verify webhook signatures using HMAC-SHA256. Check X-Zyphorix-Signature on incoming requests.</p>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg font-mono text-xs" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: '#10b981' }}>
              <span className="flex-1 break-all">{secret}</span>
              <button onClick={copySecret} className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <Button className="w-full" onClick={() => { onCreated(); }}>Done — I've saved the secret</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-xl rounded-2xl shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Add integration</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Provider selector */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>PLATFORM</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PROVIDER_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setProvider(key)}
                  className={cn('flex items-center gap-2.5 p-3 rounded-xl text-left transition-all', provider === key ? 'ring-1' : '')}
                  style={{ background: provider === key ? `${cfg.color}15` : 'var(--card)', border: `1px solid ${provider === key ? cfg.color + '50' : 'var(--border)'}` }}>
                  <span className="text-lg">{cfg.emoji}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Setup guide */}
          <SetupGuide provider={provider} />

          {/* Fields */}
          <Input label="Name" placeholder={`My ${cfg.label} alerts`} value={name} onChange={e => setName(e.target.value)} />
          <Input label="Webhook URL" placeholder={cfg.urlHint} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />

          {/* Event selection */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>EVENTS TO RECEIVE</p>
            <div className="space-y-2">
              {ALL_EVENTS.map(ev => (
                <label key={ev.value} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-blue-500/10"
                  style={{ background: selectedEvents.includes(ev.value) ? 'rgba(59,130,246,0.08)' : 'var(--card)', border: `1px solid ${selectedEvents.includes(ev.value) ? 'rgba(59,130,246,0.3)' : 'var(--border)'}` }}>
                  <input type="checkbox" checked={selectedEvents.includes(ev.value)} onChange={() => toggleEvent(ev.value)}
                    className="mt-0.5 flex-shrink-0 accent-blue-500" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{ev.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ev.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={handleCreate}>Create integration</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, onTest, onDelete, onToggle }: {
  integration: any; onTest: () => Promise<boolean | null>; onDelete: () => void; onToggle: () => void;
}) {
  const cfg = PROVIDER_CONFIG[integration.provider as keyof typeof PROVIDER_CONFIG] ?? PROVIDER_CONFIG.WEBHOOK;
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<boolean | null>(null);

  async function handleTest() {
    setTesting(true);
    setLastResult(null);
    const result = await onTest();
    setTesting(false);
    setLastResult(result);
    setTimeout(() => setLastResult(null), 4000);
  }

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: `1px solid ${integration.isActive ? '#2563eb' : 'var(--border)'}` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl text-xl flex-shrink-0"
            style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
            {cfg.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[var(--text-primary)]">{integration.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: integration.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: integration.isActive ? '#10b981' : 'var(--text-muted)' }}>
                {integration.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{cfg.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggle} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-blue-500/10 transition-all text-xs">
            {integration.isActive ? 'Disable' : 'Enable'}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Events */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {integration.events.map((ev: string) => {
          const evDef = ALL_EVENTS.find(e => e.value === ev);
          return (
            <span key={ev} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: '1px solid var(--border2)' }}>
              {evDef?.label ?? ev}
            </span>
          );
        })}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {integration.lastError ? (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle size={11} /> Last error: {integration.lastError.slice(0, 50)}
            </span>
          ) : integration.lastUsedAt ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={11} /> Last sent {timeAgo(integration.lastUsedAt)}
            </span>
          ) : (
            <span>Never triggered yet</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastResult !== null && (
            <span className={cn('flex items-center gap-1 text-xs font-medium', lastResult ? 'text-emerald-400' : 'text-red-400')}>
              {lastResult ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {lastResult ? 'Test sent' : 'Test failed'}
            </span>
          )}
          <Button size="sm" variant="secondary"
            icon={<RefreshCw size={12} className={cn(testing && 'animate-spin')} />}
            loading={testing} onClick={handleTest}>
            Send test
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { org } = useOrg();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  async function fetchIntegrations() {
    setLoading(true);
    const res = await fetch(`/api/integrations/webhooks?orgId=${org.id}`);
    const json = await res.json();
    if (json.data) setIntegrations(json.data);
    setLoading(false);
  }

  useEffect(() => { fetchIntegrations(); }, [org.id]);

  async function handleTest(integrationId: string): Promise<boolean | null> {
    setError('');
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, orgId: org.id }),
      });
      if (!res.ok) { setError(await extractApiError(res, 'Could not send the test alert. Please try again.')); return false; }
      const json = await res.json();
      const success = json.data?.success ?? false;
      fetchIntegrations();
      return success;
    } catch {
      setError('Network error — please check your connection and try again.');
      return false;
    }
  }

  async function handleDelete(integrationId: string) {
    if (!confirm('Remove this integration?')) return;
    setError('');
    try {
      const res = await fetch(`/api/integrations/webhooks/${integrationId}`, { method: 'DELETE' });
      if (!res.ok) { setError(await extractApiError(res, 'Could not remove this integration. Please try again.')); return; }
      fetchIntegrations();
    } catch {
      setError('Network error — please check your connection and try again.');
    }
  }

  async function handleToggle(integrationId: string, currentActive: boolean) {
    setError('');
    try {
      const res = await fetch(`/api/integrations/webhooks/${integrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) { setError(await extractApiError(res, 'Could not update this integration. Please try again.')); return; }
      fetchIntegrations();
    } catch {
      setError('Network error — please check your connection and try again.');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <SectionHeader
        title="Integrations"
        description="Send real-time security alerts to Slack, Discord, Teams, or any webhook"
        action={<Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Add integration</Button>}
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* What triggers alerts */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-bold text-[var(--text-primary)] mb-3">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-stagger">
          {[
            { icon: '🔍', title: 'Scan finds threat', desc: 'URL, email, file, or cloud scan returns HIGH or CRITICAL' },
            { icon: '⚡', title: 'Zyphorix fires alert', desc: 'Matching integrations receive the payload within seconds' },
            { icon: '💬', title: 'Team gets notified', desc: 'Alert appears in Slack, Discord, or your custom system' },
          ].map(s => (
            <div key={s.title} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{s.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration cards */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : integrations.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">No integrations yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Connect Slack or a webhook to get real-time security alerts</p>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>Add your first integration</Button>
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {integrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onTest={() => handleTest(integration.id)}
              onDelete={() => handleDelete(integration.id)}
              onToggle={() => handleToggle(integration.id, integration.isActive)}
            />
          ))}
        </div>
      )}

      {/* Webhook signing docs */}
      {integrations.some((i: any) => i.provider === 'WEBHOOK') && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>WEBHOOK SIGNATURE VERIFICATION</p>
          <pre className="text-xs font-mono overflow-x-auto" style={{ color: '#10b981' }}>{`// Node.js verification example
const crypto = require('crypto');
const sig = req.headers['x-zyphorix-signature'];
const expected = 'sha256=' + crypto
  .createHmac('sha256', YOUR_SIGNING_SECRET)
  .update(req.body) // raw body string
  .digest('hex');
const isValid = crypto.timingSafeEqual(
  Buffer.from(sig), Buffer.from(expected)
);`}</pre>
        </div>
      )}

      {showCreate && (
        <CreateIntegrationDialog
          orgId={org.id}
          onCreated={() => { setShowCreate(false); fetchIntegrations(); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
