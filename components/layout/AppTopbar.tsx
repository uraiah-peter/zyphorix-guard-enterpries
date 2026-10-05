'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Search, Bell, ChevronDown, Settings, LogOut, User, Building2, Plus, X, Crown, Menu } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useOrg } from './OrgProvider';
import { useMobileNav } from '@/stores/mobile-nav';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// ─── Notification Bell ─────────────────────────────────────────────────────
function NotificationBell({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch(`/api/notifications?orgId=${orgId}&limit=8`);
      const data = await res.json();
      if (data.data) { setNotifications(data.data.notifications ?? []); setUnreadCount(data.data.unreadCount ?? 0); }
    } catch {}
  }

  useEffect(() => { fetchNotifications(); const t = setInterval(fetchNotifications, 60000); return () => clearInterval(t); }, [orgId]);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAllRead() {
    await fetch(`/api/notifications/read-all?orgId=${orgId}`, { method: 'POST' });
    setUnreadCount(0); setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="glow-btn relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
        style={{ border: '1px solid var(--border)', background: 'var(--card2)' }}>
        <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="glass-panel absolute right-0 top-11 w-80 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">Mark all read</button>}
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No notifications</div>
            ) : notifications.map((un: any) => {
              const n = un.notification; if (!n) return null;
              const isUnread = !un.readAt;
              return (
                <div key={un.id} className={cn('flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-blue-500/5', isUnread && 'bg-blue-500/5')}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={async () => { await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }); setUnreadCount(c => Math.max(0, c - (isUnread ? 1 : 0))); }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{n.title}</p>
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{timeAgo(n.createdAt)}</p>
                  </div>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Menu ─────────────────────────────────────────────────────────────
function UserMenu({ userName, userEmail, userImage, orgSlug }: {
  userName?: string | null; userEmail?: string | null; userImage?: string | null; orgSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initials = userName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'UP';

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="glow-btn flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors"
        style={{ border: '1px solid var(--border)', background: 'var(--card2)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{userName ?? 'User'}</p>
          <p className="text-xs" style={{ color: '#818cf8' }}>Pro Plan</p>
        </div>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
      </button>
      {open && (
        <div className="glass-panel absolute right-0 top-11 w-52 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{userEmail}</p>
          </div>
          <div className="py-1">
            {[
              { icon: User, label: 'Profile', href: `/org/${orgSlug}/profile` },
              { icon: Building2, label: 'Switch Organization', href: '/org-select' },
              { icon: Plus, label: 'New Organization', href: '/onboarding' },
              { icon: Settings, label: 'Settings', href: `/org/${orgSlug}/settings` },
            ].map(item => (
              <button key={item.label} onClick={() => { router.push(item.href); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-blue-500/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                <item.icon size={13} />{item.label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
              <button onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={13} />Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Global Search ─────────────────────────────────────────────────────────
function GlobalSearch({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 h-9 px-3 rounded-xl text-sm transition-colors hover:border-blue-500/30"
        style={{ background: 'var(--card2)', border: '1px solid var(--border)', minWidth: 220 }}>
        <Search size={14} style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs flex-1 text-left" style={{ color: 'var(--text-faint)' }}>Search anything...</span>
        <kbd className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="glass-panel w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-fade-up">
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <Search size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search scans, incidents, team members..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }} />
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              {query.length < 2 ? 'Start typing to search...' : 'Searching...'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Topbar ─────────────────────────────────────────────────────────────────
interface TopbarProps {
  userName?: string | null; userEmail?: string | null; userImage?: string | null;
}

export function AppTopbar({ userName, userEmail, userImage }: TopbarProps) {
  const { org, plan } = useOrg();
  const router = useRouter();
  const { toggle } = useMobileNav();

  return (
    <header className="flex items-center gap-3 px-4 md:px-6 flex-shrink-0" style={{ height: 64, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
      <button onClick={toggle}
        className="glow-btn lg:hidden flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-colors"
        style={{ border: '1px solid var(--border)', background: 'var(--card2)' }}
        aria-label="Open menu">
        <Menu size={16} style={{ color: 'var(--text-secondary)' }} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
          Welcome back, {userName?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-xs hidden sm:block truncate" style={{ color: 'var(--text-muted)' }}>Here's what's happening with your security today.</p>
      </div>

      <div className="hidden sm:block">
        <GlobalSearch orgSlug={org.slug} />
      </div>

      {plan === 'FREE' && (
        <button onClick={() => router.push(`/org/${org.slug}/settings/billing`)}
          className="glow-btn hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 16px rgba(99,102,241,0.45)' }}>
          <Crown size={14} />
          Upgrade — from $29/mo
        </button>
      )}
      {plan === 'STARTER' && (
        <button onClick={() => router.push(`/org/${org.slug}/settings/billing`)}
          className="glow-btn hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}>
          <Crown size={14} />
          Upgrade to Pro
        </button>
      )}
      {plan === 'PRO' && (
        <button onClick={() => router.push(`/org/${org.slug}/settings/billing`)}
          className="glow-btn hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.35)', color:'#c4b5fd' }}>
          <Crown size={14} />
          Upgrade to Business
        </button>
      )}

      <ThemeToggle />
      <NotificationBell orgId={org.id} />
      <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} orgSlug={org.slug} />
    </header>
  );
}
