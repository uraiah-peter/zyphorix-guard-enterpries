import type { MemberRole } from '@prisma/client';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export type Permission = 'scan:create'|'scan:read'|'scan:delete'|'report:read'|'incident:create'|'incident:manage'|'asset:manage'|'cloud:connect'|'member:invite'|'member:manage'|'apikey:manage'|'auditlog:read'|'settings:manage'|'billing:manage'|'org:delete';

const PERMS: Record<MemberRole, Permission[]> = {
  OWNER:   ['scan:create','scan:read','scan:delete','report:read','incident:create','incident:manage','asset:manage','cloud:connect','member:invite','member:manage','apikey:manage','auditlog:read','settings:manage','billing:manage','org:delete'],
  ADMIN:   ['scan:create','scan:read','scan:delete','report:read','incident:create','incident:manage','asset:manage','cloud:connect','member:invite','member:manage','apikey:manage','auditlog:read','settings:manage'],
  ANALYST: ['scan:create','scan:read','report:read','incident:create','incident:manage','asset:manage'],
  VIEWER:  ['scan:read','report:read'],
};

export class ForbiddenError extends Error { constructor(m='Forbidden'){super(m);this.name='ForbiddenError';} }
export class UnauthorizedError extends Error { constructor(m='Unauthorized'){super(m);this.name='UnauthorizedError';} }
export class NotFoundError extends Error { constructor(m='Not found'){super(m);this.name='NotFoundError';} }

export function hasPermission(role: MemberRole, perm: Permission): boolean { return PERMS[role]?.includes(perm)??false; }

export async function requireMembership(orgId: string, userId: string) {
  const m = await db.organizationMember.findUnique({ where: { organizationId_userId: { organizationId:orgId, userId } } });
  if (!m) throw new ForbiddenError('You are not a member of this organization');
  return m;
}

export async function requirePermission(orgId: string, userId: string, perm: Permission) {
  const m = await requireMembership(orgId, userId);
  if (!hasPermission(m.role as MemberRole, perm)) throw new ForbiddenError(`Your role does not have '${perm}' permission`);
  return m;
}

export function canModifyRole(actor: MemberRole, target: MemberRole): boolean {
  const order: MemberRole[] = ['VIEWER','ANALYST','ADMIN','OWNER'];
  return order.indexOf(actor) > order.indexOf(target);
}

/**
 * Page-level RBAC guard for use in server layouts (not API routes).
 * Unlike requirePermission (which throws for API error responses), this
 * redirects the user to a branded Forbidden page — appropriate for full
 * page navigations rather than fetch() calls.
 */
export async function requirePagePermission(orgSlug: string, userId: string, perm: Permission) {
  const org = await db.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
  if (!org) redirect('/org-select');

  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  });
  if (!membership) redirect('/org-select');

  if (!hasPermission(membership.role as MemberRole, perm)) {
    redirect(`/org/${orgSlug}/forbidden?perm=${encodeURIComponent(perm)}&role=${membership.role}`);
  }

  return membership;
}
