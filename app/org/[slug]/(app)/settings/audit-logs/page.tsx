'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Shield, Filter, Download, ChevronDown, User } from 'lucide-react';
import { Card, SectionHeader, Avatar, Badge, EmptyState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui';
import { formatDateTime, cn } from '@/lib/utils';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  USER_LOGIN:            { label: 'User signed in',          color: 'text-blue-400' },
  USER_LOGOUT:           { label: 'User signed out',         color: 'text-[var(--text-muted)]' },
  USER_REGISTER:         { label: 'User registered',         color: 'text-emerald-400' },
  ORG_CREATED:           { label: 'Organization created',    color: 'text-emerald-400' },
  ORG_UPDATED:           { label: 'Organization updated',    color: 'text-blue-400' },
  ORG_DELETED:           { label: 'Organization deleted',    color: 'text-red-400' },
  ORG_SETTINGS_UPDATED:  { label: 'Settings updated',        color: 'text-blue-400' },
  MEMBER_INVITED:        { label: 'Member invited',          color: 'text-indigo-400' },
  MEMBER_JOINED:         { label: 'Member joined',           color: 'text-emerald-400' },
  MEMBER_ROLE_CHANGED:   { label: 'Member role changed',     color: 'text-amber-400' },
  MEMBER_REMOVED:        { label: 'Member removed',          color: 'text-red-400' },
  API_KEY_CREATED:       { label: 'API key created',         color: 'text-blue-400' },
  API_KEY_REVOKED:       { label: 'API key revoked',         color: 'text-amber-400' },
  API_KEY_DELETED:       { label: 'API key deleted',         color: 'text-red-400' },
  SCAN_CREATED:          { label: 'Scan started',            color: 'text-blue-400' },
  SCAN_COMPLETED:        { label: 'Scan completed',          color: 'text-emerald-400' },
  SCAN_DELETED:          { label: 'Scan deleted',            color: 'text-[var(--text-muted)]' },
  INCIDENT_CREATED:      { label: 'Incident created',        color: 'text-orange-400' },
  INCIDENT_UPDATED:      { label: 'Incident updated',        color: 'text-amber-400' },
  INCIDENT_RESOLVED:     { label: 'Incident resolved',       color: 'text-emerald-400' },
  INCIDENT_CLOSED:       { label: 'Incident closed',         color: 'text-[var(--text-muted)]' },
  CLOUD_CONNECTION_CREATED: { label: 'Cloud connected',      color: 'text-cyan-400' },
  CLOUD_CONNECTION_REMOVED: { label: 'Cloud disconnected',   color: 'text-red-400' },
  SUBSCRIPTION_CREATED:  { label: 'Subscription created',    color: 'text-emerald-400' },
  SUBSCRIPTION_UPDATED:  { label: 'Subscription updated',    color: 'text-blue-400' },
  SUBSCRIPTION_CANCELED: { label: 'Subscription canceled',   color: 'text-red-400' },
};

interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null } | null;
}

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'USER_LOGIN', label: 'User logins' },
  { value: 'MEMBER_INVITED', label: 'Member invites' },
  { value: 'MEMBER_ROLE_CHANGED', label: 'Role changes' },
  { value: 'MEMBER_REMOVED', label: 'Member removals' },
  { value: 'API_KEY_CREATED', label: 'API key creation' },
  { value: 'API_KEY_REVOKED', label: 'API key revocation' },
  { value: 'ORG_UPDATED', label: 'Org updates' },
  { value: 'ORG_SETTINGS_UPDATED', label: 'Settings changes' },
  { value: 'SCAN_CREATED', label: 'Scans started' },
  { value: 'SCAN_COMPLETED', label: 'Scans completed' },
];

export default function AuditLogsPage() {
  const { org } = useOrg();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchLogs(reset = true) {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams({ orgId: org.id, limit: '25' });
    if (actionFilter) params.append('action', actionFilter);
    if (!reset && cursor) params.append('cursor', cursor);

    const res = await fetch(`/api/audit-logs?${params}`);
    const json = await res.json();

    if (json.data) {
      const items: AuditLog[] = json.data;
      if (reset) {
        setLogs(items);
      } else {
        setLogs((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === 25);
      if (items.length > 0) {
        setCursor(items[items.length - 1].createdAt);
      }
    }

    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => { fetchLogs(true); }, [org.id, actionFilter]);

  function getMetadataSummary(log: AuditLog): string | null {
    if (!log.metadata) return null;
    if (log.action === 'MEMBER_INVITED') return `Invited ${log.metadata.invitedEmail} as ${log.metadata.role}`;
    if (log.action === 'MEMBER_ROLE_CHANGED') return `${log.metadata.oldRole} → ${log.metadata.newRole}`;
    if (log.action === 'API_KEY_CREATED') return `Key: "${log.metadata.keyName}"`;
    return null;
  }

  function downloadLogs() {
    const csv = [
      ['Timestamp', 'Action', 'User', 'IP Address', 'Details'].join(','),
      ...logs.map((l) => [
        formatDateTime(l.createdAt),
        ACTION_LABELS[l.action]?.label ?? l.action,
        l.user?.email ?? 'System',
        l.ipAddress ?? '—',
        getMetadataSummary(l) ?? '—',
      ].map((v) => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${org.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <SectionHeader
        title="Audit Logs"
        description="Immutable record of all security-relevant actions in your organization"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={downloadLogs}>
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="w-56">
          <Select
            options={ACTION_FILTER_OPTIONS}
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCursor(undefined); }}
          />
        </div>
        {actionFilter && (
          <Button variant="ghost" size="sm" onClick={() => { setActionFilter(''); setCursor(undefined); }}>
            Clear filter
          </Button>
        )}
        <p className="text-xs text-[var(--text-muted)] ml-auto">
          {logs.length} event{logs.length !== 1 ? 's' : ''} shown
        </p>
      </div>

      {/* Logs table */}
      <Card padding={false}>
        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Shield size={32} />}
            title="No audit logs yet"
            description="Security events will appear here as your team uses Zyphorix Guard."
          />
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-12 px-5 py-2.5 border-b border-[var(--border)] text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">
              <div className="col-span-1">User</div>
              <div className="col-span-4 pl-3">Action</div>
              <div className="col-span-4">Details</div>
              <div className="col-span-2">IP Address</div>
              <div className="col-span-1 text-right">Time</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[var(--border)]">
              {logs.map((log) => {
                const actionConfig = ACTION_LABELS[log.action];
                const summary = getMetadataSummary(log);
                return (
                  <div key={log.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-[var(--card2)] transition-colors">
                    <div className="col-span-1">
                      <Avatar
                        name={log.user?.name}
                        image={log.user?.image}
                        size="sm"
                      />
                    </div>
                    <div className="col-span-4 pl-3">
                      <p className={cn('text-sm font-medium', actionConfig?.color ?? 'text-[var(--text-secondary)]')}>
                        {actionConfig?.label ?? log.action}
                      </p>
                      <p className="text-xs text-[var(--text-faint)] truncate">
                        {log.user?.email ?? 'System'}
                      </p>
                    </div>
                    <div className="col-span-4">
                      {summary ? (
                        <p className="text-xs text-[var(--text-muted)] truncate">{summary}</p>
                      ) : log.resourceId ? (
                        <p className="text-xs font-mono text-[var(--text-faint)] truncate">{log.resourceId}</p>
                      ) : (
                        <span className="text-xs text-[var(--text-faint)]">—</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-mono text-[var(--text-faint)]">
                        {log.ipAddress ?? '—'}
                      </p>
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="text-xs text-[var(--text-faint)] whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center p-4 border-t border-[var(--border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loadingMore}
                  onClick={() => fetchLogs(false)}
                  iconRight={<ChevronDown size={14} />}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <p className="text-xs text-[var(--text-faint)] text-center">
        Audit logs are immutable and retained per your organization&apos;s retention policy.
      </p>
    </div>
  );
}
