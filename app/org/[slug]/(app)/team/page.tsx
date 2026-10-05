'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import {
  UserPlus, MoreHorizontal, Shield, Crown,
  Eye, Pencil, Trash2, Mail, Loader2,
} from 'lucide-react';
import {
  Card, CardHeader, CardTitle, Avatar, Badge,
  SectionHeader, EmptyState, Skeleton, Divider, ErrorBanner,
} from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { cn, formatDate, extractApiError } from '@/lib/utils';
import type { MemberRole } from '@/types';

const ROLE_CONFIG: Record<MemberRole, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  OWNER:   { label: 'Owner',   icon: Crown,  color: 'text-amber-400',  desc: 'Full access, billing control' },
  ADMIN:   { label: 'Admin',   icon: Shield, color: 'text-blue-400',   desc: 'Manage team and settings' },
  ANALYST: { label: 'Analyst', icon: Pencil, color: 'text-indigo-400', desc: 'Run scans and manage incidents' },
  VIEWER:  { label: 'Viewer',  icon: Eye,    color: 'text-slate-400',  desc: 'Read-only access' },
};

interface Member {
  id: string;
  role: MemberRole;
  joinedAt: string | null;
  user: { id: string; name: string | null; email: string; image: string | null; createdAt: string };
  invitedBy: { id: string; name: string | null; email: string } | null;
}

// ─── Invite Dialog ─────────────────────────────────────────────────────────

function InviteDialog({ orgId, onSuccess, onClose }: {
  orgId: string; onSuccess: () => void; onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('ANALYST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleInvite() {
    if (!email.trim()) { setError('Email is required'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Failed to invite member'); return; }
      setSuccess(`${email} has been added to the organization.`);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Invite team member</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Email address" type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="colleague@company.com" leftIcon={<Mail size={14} />} error={error} />
          <Select label="Role" value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            options={Object.entries(ROLE_CONFIG).map(([v, c]) => ({ value: v, label: `${c.label} — ${c.desc}` }))} />

          {/* Role preview */}
          {role && ROLE_CONFIG[role] && (
            <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg3)]">
              <div className="flex items-center gap-2 mb-1">
                {(() => { const Icon = ROLE_CONFIG[role].icon; return <Icon size={14} className={ROLE_CONFIG[role].color} />; })()}
                <span className={`text-sm font-medium ${ROLE_CONFIG[role].color}`}>{ROLE_CONFIG[role].label}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{ROLE_CONFIG[role].desc}</p>
            </div>
          )}

          {success && <p className="text-sm text-emerald-400">{success}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleInvite} loading={loading}
              icon={<UserPlus size={14} />}>Send invite</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Member Row ─────────────────────────────────────────────────────────────

function MemberRow({ member, currentUserId, orgId, canManage, onRefresh, onError }: {
  member: Member; currentUserId: string; orgId: string; canManage: boolean; onRefresh: () => void; onError: (msg: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isCurrentUser = member.user.id === currentUserId;
  const { icon: Icon, label, color } = ROLE_CONFIG[member.role];

  async function changeRole(newRole: MemberRole) {
    setLoading(true); setMenuOpen(false);
    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) { onError(await extractApiError(res, 'Could not change this member\'s role. Please try again.')); return; }
      onRefresh();
    } catch {
      onError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function removeMember() {
    if (!confirm(`Remove ${member.user.name ?? member.user.email} from the organization?`)) return;
    setLoading(true); setMenuOpen(false);
    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${member.id}`, { method: 'DELETE' });
      if (!res.ok) { onError(await extractApiError(res, 'Could not remove this member. Please try again.')); return; }
      onRefresh();
    } catch {
      onError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[var(--border)] last:border-0">
      <Avatar name={member.user.name} image={member.user.image} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {member.user.name ?? 'Unnamed user'}
            {isCurrentUser && <span className="ml-1 text-xs text-[var(--text-muted)]">(you)</span>}
          </p>
          {member.role === 'OWNER' && <Crown size={12} className="text-amber-400 flex-shrink-0" />}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate">{member.user.email}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
          <Icon size={12} />{label}
        </div>
        {member.joinedAt && (
          <p className="text-xs text-[var(--text-faint)] hidden sm:block">
            Joined {formatDate(member.joinedAt)}
          </p>
        )}
        {canManage && !isCurrentUser && member.role !== 'OWNER' && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-[var(--card2)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-44 rounded-xl border border-[var(--border)] bg-[var(--bg2)] shadow-xl z-10 overflow-hidden animate-fade-in">
                <div className="py-1">
                  <p className="px-3 py-1.5 text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">Change role</p>
                  {(Object.keys(ROLE_CONFIG) as MemberRole[])
                    .filter((r) => r !== 'OWNER' && r !== member.role)
                    .map((r) => (
                      <button key={r} onClick={() => changeRole(r)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--card2)] hover:text-[var(--text-primary)] transition-colors">
                        {(() => { const Ic = ROLE_CONFIG[r].icon; return <Ic size={12} className={ROLE_CONFIG[r].color} />; })()}
                        {ROLE_CONFIG[r].label}
                      </button>
                    ))}
                  <Divider className="my-1" />
                  <button onClick={removeMember}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12} />Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team Page ─────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { org, canManage } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [error, setError] = useState('');

  async function fetchMembers() {
    setLoading(true);
    try {
      const [membersRes, sessionRes] = await Promise.all([
        fetch(`/api/orgs/${org.id}/members`),
        fetch('/api/auth/session'),
      ]);
      const [membersJson, sessionJson] = await Promise.all([membersRes.json(), sessionRes.json()]);
      if (membersJson.data) setMembers(membersJson.data);
      if (sessionJson?.user?.id) setCurrentUserId(sessionJson.user.id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMembers(); }, [org.id]);

  const byRole = (members: Member[]) => {
    const order: MemberRole[] = ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'];
    return [...members].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <SectionHeader
        title="Team Members"
        description={`${members.length} member${members.length !== 1 ? 's' : ''} in ${org.name}`}
        action={canManage && (
          <Button icon={<UserPlus size={14} />} onClick={() => setShowInvite(true)}>
            Invite member
          </Button>
        )}
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <Card padding={false}>
        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={32} />}
            title="No team members yet"
            description="Invite colleagues to collaborate on security analysis."
            action={canManage && (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                Invite first member
              </Button>
            )}
          />
        ) : (
          <div className="px-5">
            {byRole(members).map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                currentUserId={currentUserId}
                orgId={org.id}
                canManage={canManage}
                onRefresh={fetchMembers}
                onError={setError}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Role reference */}
      <Card>
        <CardTitle className="mb-4">Role permissions</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(ROLE_CONFIG) as [MemberRole, typeof ROLE_CONFIG[MemberRole]][]).map(([role, cfg]) => (
            <div key={role} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg3)] border border-[var(--border)]">
              <cfg.icon size={16} className={cn('flex-shrink-0 mt-0.5', cfg.color)} />
              <div>
                <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{cfg.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {showInvite && (
        <InviteDialog
          orgId={org.id}
          onSuccess={fetchMembers}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
