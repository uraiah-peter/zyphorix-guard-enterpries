'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard, Link2, Mail, FileSearch, Globe,
  Cloud, ShieldAlert, Shield, BarChart3, Settings, Users,
  Zap, BookOpen, GitBranch, Puzzle, Crown,
  Activity, ClipboardCheck, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrg } from './OrgProvider';
import { useMobileNav } from '@/stores/mobile-nav';

interface NavItem { label: string; href: string; icon: React.ElementType; badge?: string; disabled?: boolean; }
interface NavSection { title: string; items: NavItem[] }

// Identical route structure to the original Sidebar — only the visual
// treatment is new. Keeping this in sync manually is intentional: a shared
// nav-config module would be a reasonable future refactor, but isn't
// required for this redesign and adds a coupling point between the
// protected dashboard chrome and the new app chrome that's safer to avoid.
function buildNav(slug: string): NavSection[] {
  const b = `/org/${slug}`;
  return [
    {
      title: 'ANALYZE',
      items: [
        { label: 'Dashboard',        href: `${b}/dashboard`,      icon: LayoutDashboard },
        { label: 'URL Scanner',      href: `${b}/scans/url`,      icon: Link2 },
        { label: 'Email Scanner',    href: `${b}/scans/email`,    icon: Mail },
        { label: 'File Scanner',     href: `${b}/scans/file`,     icon: FileSearch },
        { label: 'Domain & IP Lookup', href: `${b}/scans/intel`,  icon: Globe },
      ],
    },
    {
      title: 'PROTECT',
      items: [
        { label: 'Guard Operations',     href: `${b}/operations`,    icon: Activity, badge: 'NEW' },
        { label: 'Cloud Security',      href: `${b}/cloud`,        icon: Cloud },
        { label: 'Incident Management', href: `${b}/incidents`,    icon: ShieldAlert },
        { label: 'Asset Inventory',     href: `${b}/assets`,       icon: Shield },
        { label: 'Security Monitoring', href: `${b}/scans`,        icon: Activity },
        { label: 'SOC 2 Compliance',    href: `${b}/compliance`,   icon: ClipboardCheck },
      ],
    },
    {
      title: 'AUTOMATE',
      items: [
        { label: 'AI Security Copilot', href: `${b}/ai-copilot`,  icon: Zap, badge: 'AI' },
        { label: 'Playbooks',           href: `${b}/playbooks`,   icon: BookOpen },
        { label: 'Log Ingestion',       href: `${b}/logs`,         icon: GitBranch },
      ],
    },
    {
      title: 'MANAGE',
      items: [
        { label: 'Reports',      href: `${b}/settings/audit-logs`, icon: BarChart3 },
        { label: 'Team',         href: `${b}/team`,                icon: Users },
        { label: 'Integrations', href: `${b}/settings/integrations`, icon: Puzzle },
        { label: 'Settings',     href: `${b}/settings`,            icon: Settings },
      ],
    },
  ];
}

const PLAN_COLORS: Record<string, string> = {
  FREE: '#94a3b8', STARTER: '#3b82f6', PRO: '#60a5fa', BUSINESS: '#8b5cf6', ENTERPRISE: '#ec4899',
};

export function AppSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const { org, plan } = useOrg();
  const nav = buildNav(orgSlug);
  const planColor = PLAN_COLORS[plan] ?? '#60a5fa';
  const { open, close } = useMobileNav();

  useEffect(() => { close(); }, [pathname, close]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={close} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col h-screen flex-shrink-0 border-r border-[var(--border)]',
          'transform transition-transform duration-200 ease-out',
          'lg:static lg:translate-x-0 lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: 210, background: 'var(--bg2)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-2.5 px-4 py-4 border-b border-[var(--border)]">
          <Link href={`/org/${orgSlug}/dashboard`} className="flex items-center gap-2.5 transition-opacity hover:opacity-80 min-w-0">
            <div className="flex items-center justify-center rounded-xl flex-shrink-0 overflow-hidden"
              style={{ width: 36, height: 36, boxShadow: '0 0 14px rgba(59,130,246,0.55)' }}>
              <Image src="/zyphorix-mark.png" alt="Zyphorix" width={36} height={36} priority />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>Zyphorix Guard</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>AI-Powered Cybersecurity</p>
            </div>
          </Link>
          <button onClick={close} className="lg:hidden flex-shrink-0 transition-colors" style={{ color: 'var(--text-muted)' }} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {nav.map((section) => (
            <div key={section.title}>
              <p className="px-2 mb-1 text-xs font-semibold tracking-widest" style={{ color: 'var(--text-faint)' }}>
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== `/org/${orgSlug}/dashboard` && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  if (item.disabled) return (
                    <div key={item.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-35 cursor-not-allowed">
                      <Icon size={15} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                  );
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group cursor-pointer border',
                          isActive ? 'border-blue-500/40' : 'border-transparent hover:border-blue-500/15'
                        )}
                        style={{
                          background: isActive ? 'rgba(59,130,246,0.14)' : 'transparent',
                          boxShadow: isActive ? '0 0 16px rgba(59,130,246,0.18)' : 'none',
                        }}
                      >
                        <Icon size={15} className="flex-shrink-0 transition-colors" style={{ color: isActive ? '#60a5fa' : 'var(--text-muted)' }} />
                        <span
                          className={cn('text-xs flex-1 truncate transition-colors', isActive && 'font-medium')}
                          style={{ color: isActive ? '#93c5fd' : 'var(--text-secondary)' }}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Plan info footer */}
        <div className="px-4 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} style={{ color: planColor }} />
            <span className="text-sm font-bold" style={{ color: planColor }}>{plan} Plan</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Renews on Aug 15, 2025
          </p>
          <Link href={`/org/${orgSlug}/settings/billing`}>
            <div className="glow-btn w-full py-2 px-3 rounded-lg text-center text-xs font-semibold cursor-pointer"
              style={{ background: `${planColor}1f`, border: `1px solid ${planColor}55`, color: planColor }}>
              Manage Plan
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
