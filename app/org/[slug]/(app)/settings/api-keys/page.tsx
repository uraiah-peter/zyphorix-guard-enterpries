'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Key, Plus, Copy, Check, Trash2, ShieldOff, Clock, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, SectionHeader, Badge, EmptyState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { formatDate, timeAgo } from '@/lib/utils';

const PERMISSION_OPTIONS = [
  { value: 'scan:create', label: 'scan:create — Create new scans' },
  { value: 'scan:read',   label: 'scan:read — Read scan results' },
  { value: 'scan:delete', label: 'scan:delete — Delete scans' },
  { value: 'report:read', label: 'report:read — Download reports' },
  { value: 'intel:read',  label: 'intel:read — Read threat intel' },
];

const DEFAULT_PERMISSIONS = ['scan:create', 'scan:read'];

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// ─── New Key Dialog ─────────────────────────────────────────────────────────

function CreateKeyDialog({ orgId, onCreated, onClose }: {
  orgId: string;
  onCreated: (rawKey: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (permissions.length === 0) { setError('Select at least one permission'); return; }
    setError(''); setLoading(true);

    const res = await fetch(`/api/orgs/${orgId}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, permissions }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) { setError(json.error?.message ?? 'Failed to create key'); return; }
    onCreated(json.data.rawKey);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Create API key</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <Input
            label="Key name *"
            placeholder="e.g. CI/CD Pipeline, Security Scanner"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            leftIcon={<Key size={14} />}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Permissions *</p>
            {PERMISSION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg3)] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.includes(opt.value)}
                  onChange={() => togglePermission(opt.value)}
                  className="rounded border-[var(--border2)] text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-[var(--text-secondary)]">{opt.label}</span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={handleCreate} icon={<Plus size={14} />}>
              Create key
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Raw Key Display ────────────────────────────────────────────────────────

function RawKeyDisplay({ rawKey, onClose }: { rawKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[var(--bg2)] shadow-2xl animate-fade-in">
        <div className="px-6 py-4 border-b border-amber-500/20 bg-amber-500/5">
          <h2 className="text-base font-semibold text-amber-400">⚠️ Save your API key now</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            This key will only be shown <strong className="text-[var(--text-primary)]">once</strong>.
            Copy it now and store it in a secure location like a secrets manager.
          </p>

          <div className="rounded-xl bg-[var(--bg3)] border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm font-mono text-emerald-400 break-all">
                {visible ? rawKey : rawKey.replace(/./g, '•')}
              </code>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setVisible((v) => !v)}
                  className="p-2 rounded-lg hover:bg-[var(--card2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={copy}
                  className="p-2 rounded-lg hover:bg-[var(--card2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {copied && <p className="text-sm text-emerald-400">✓ Copied to clipboard</p>}

          <Button className="w-full" onClick={onClose}>
            I've saved my key
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── API Keys Page ──────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { org, canManage } = useOrg();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  async function fetchKeys() {
    setLoading(true);
    const res = await fetch(`/api/orgs/${org.id}/api-keys`);
    const json = await res.json();
    if (json.data) setKeys(json.data);
    setLoading(false);
  }

  useEffect(() => { fetchKeys(); }, [org.id]);

  async function revokeKey(keyId: string) {
    if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    await fetch(`/api/orgs/${org.id}/api-keys/${keyId}`, { method: 'PATCH' });
    fetchKeys();
  }

  async function deleteKey(keyId: string) {
    await fetch(`/api/orgs/${org.id}/api-keys/${keyId}`, { method: 'DELETE' });
    fetchKeys();
  }

  function handleKeyCreated(rawKey: string) {
    setShowCreate(false);
    setNewRawKey(rawKey);
    fetchKeys();
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <SectionHeader
        title="API Keys"
        description="Create and manage API keys for programmatic access to Zyphorix Guard"
        action={canManage && (
          <Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
            Create API key
          </Button>
        )}
      />

      {/* Usage info */}
      <div className="rounded-xl p-4 bg-blue-500/5 border border-blue-500/20">
        <p className="text-sm font-medium text-blue-400 mb-1">Using the API</p>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Include your API key in the Authorization header:
        </p>
        <code className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg3)] px-3 py-1.5 rounded-lg block">
          Authorization: Bearer zg_live_...
        </code>
      </div>

      {/* Keys list */}
      <Card padding={false}>
        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={<Key size={32} />}
            title="No API keys yet"
            description="Create an API key to integrate Zyphorix Guard with your tools and workflows."
            action={canManage && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
                Create first key
              </Button>
            )}
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {keys.map((key) => (
              <div key={key.id} className="flex items-start gap-4 p-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                  <Key size={16} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{key.name}</p>
                    <Badge variant="outline" className="font-mono text-xs">{key.keyPrefix}...</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {key.permissions.map((p) => (
                      <Badge key={p} variant="default" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-faint)]">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Created {formatDate(key.createdAt)}
                    </span>
                    {key.lastUsedAt && (
                      <span>Last used {timeAgo(key.lastUsedAt)}</span>
                    )}
                    {!key.lastUsedAt && (
                      <span className="text-amber-400/60">Never used</span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ShieldOff size={13} />}
                      onClick={() => revokeKey(key.id)}
                      className="text-amber-400 hover:text-amber-400"
                    >
                      Revoke
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteKey(key.id)}
                      className="text-[var(--text-muted)] hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateKeyDialog
          orgId={org.id}
          onCreated={handleKeyCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {newRawKey && (
        <RawKeyDisplay
          rawKey={newRawKey}
          onClose={() => setNewRawKey(null)}
        />
      )}
    </div>
  );
}
