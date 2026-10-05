'use client';

import { createContext, useContext } from 'react';
import type { Organization, OrganizationMember, Subscription } from '@prisma/client';
import type { MemberRole } from '@/types';

// ─── Org Context ───────────────────────────────────────────────────────────

interface OrgContextValue {
  org: Organization & { subscription: Subscription | null };
  membership: OrganizationMember;
  role: MemberRole;
  plan: string;
  isOwner: boolean;
  isAdmin: boolean;
  canManage: boolean; // ADMIN or OWNER
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  children,
  org,
  membership,
}: {
  children: React.ReactNode;
  org: Organization & { subscription: Subscription | null };
  membership: OrganizationMember;
}) {
  const role = membership.role as MemberRole;

  const value: OrgContextValue = {
    org,
    membership,
    role,
    plan: org.subscription?.plan ?? 'FREE',
    isOwner: role === 'OWNER',
    isAdmin: role === 'ADMIN' || role === 'OWNER',
    canManage: role === 'ADMIN' || role === 'OWNER',
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return ctx;
}
