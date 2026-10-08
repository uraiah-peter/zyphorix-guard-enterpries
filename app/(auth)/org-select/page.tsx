export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Building2, Plus, ChevronRight, Shield, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function OrgSelectPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          subscription: { select: { plan: true } },
          _count: { select: { members: true, scans: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  // Single org — redirect directly
  if (memberships.length === 1) {
    redirect(`/org/${memberships[0].organization.slug}/dashboard`);
  }

  // No orgs — redirect to onboarding
  if (memberships.length === 0) {
    redirect('/onboarding');
  }

  const planColors: Record<string, string> = {
    FREE: 'text-[var(--text-muted)]',
    STARTER: 'text-blue-600',
    PRO: 'text-indigo-600',
    ENTERPRISE: 'text-purple-600',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center rounded-2xl mx-auto mb-4"
            style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', boxShadow: '0 0 24px rgba(59,130,246,0.4)', fontSize: 24, fontFamily: 'monospace', fontWeight: 900, color: '#fff' }}>
            Z
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Choose an organization</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Select which workspace to open
          </p>
        </div>

        {/* Org list */}
        <div className="space-y-2 mb-4">
          {memberships.map((m) => {
            const org = m.organization;
            const plan = org.subscription?.plan ?? 'FREE';
            return (
              <Link key={org.id} href={`/org/${org.slug}/dashboard`}>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border2)] hover:bg-[var(--card2)] transition-all group">
                  {/* Org avatar */}
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(59,130,246,0.25)' }}>
                    {org.logoUrl ? (
                      <Image src={org.logoUrl} alt={org.name} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Building2 size={20} className="text-blue-600" />
                    )}
                  </div>

                  {/* Org info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{org.name}</p>
                      <span className={`text-xs font-medium ${planColors[plan]}`}>{plan}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Users size={11} />
                        {org._count.members} member{org._count.members !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Shield size={11} />
                        {org._count.scans} scan{org._count.scans !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-[var(--text-faint)] capitalize">
                        {m.role.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-[var(--text-faint)] group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Create new org */}
        <Link href="/onboarding">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group cursor-pointer">
            <div className="flex items-center justify-center rounded-xl w-11 h-11 border border-dashed border-[var(--border2)] group-hover:border-blue-500/40">
              <Plus size={18} className="text-[var(--text-faint)] group-hover:text-blue-600 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                Create new organization
              </p>
              <p className="text-xs text-[var(--text-faint)]">Set up a new workspace</p>
            </div>
          </div>
        </Link>

        <p className="text-center text-xs text-[var(--text-faint)] mt-6">
          Signed in as <span className="text-[var(--text-muted)]">{user.email}</span>
        </p>
      </div>
    </div>
  );
}
