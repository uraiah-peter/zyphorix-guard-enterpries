import type { AuditAction, Prisma } from '@prisma/client';
import { db } from '@/lib/db';

interface AuditParams {
  organizationId: string;
  userId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

export async function writeAuditLog(
  p: AuditParams
): Promise<void> {
  try {
    const ip =
      p.request?.headers
        .get('x-forwarded-for')
        ?.split(',')[0]
        .trim() ?? undefined;

    const ua =
      p.request?.headers.get('user-agent') ?? undefined;

    await db.auditLog.create({
      data: {
        organizationId: p.organizationId,
        userId: p.userId,
        action: p.action,
        resource: p.resource,
        resourceId: p.resourceId,
        metadata:
          p.metadata === undefined
            ? undefined
            : (p.metadata as Prisma.InputJsonValue),
        ipAddress: ip,
        userAgent: ua,
      },
    });
  } catch {
    console.error(
      '[AuditLog] Failed to write:',
      p.action
    );
  }
}

export const audit = {
  memberInvited: (
    o: string,
    a: string,
    e: string,
    r: string
  ) =>
    writeAuditLog({
      organizationId: o,
      userId: a,
      action: 'MEMBER_INVITED',
      resource: 'member',
      metadata: {
        invitedEmail: e,
        role: r,
      },
    }),

  memberRoleChanged: (
    o: string,
    a: string,
    t: string,
    or: string,
    nr: string
  ) =>
    writeAuditLog({
      organizationId: o,
      userId: a,
      action: 'MEMBER_ROLE_CHANGED',
      resource: 'member',
      resourceId: t,
      metadata: {
        oldRole: or,
        newRole: nr,
      },
    }),

  memberRemoved: (
    o: string,
    a: string,
    t: string
  ) =>
    writeAuditLog({
      organizationId: o,
      userId: a,
      action: 'MEMBER_REMOVED',
      resource: 'member',
      resourceId: t,
    }),

  orgUpdated: (
    o: string,
    a: string,
    c: Record<string, unknown>
  ) =>
    writeAuditLog({
      organizationId: o,
      userId: a,
      action: 'ORG_UPDATED',
      resource: 'organization',
      resourceId: o,
      metadata: {
        changes: c,
      },
    }),

  settingsUpdated: (
    o: string,
    a: string
  ) =>
    writeAuditLog({
      organizationId: o,
      userId: a,
      action: 'ORG_SETTINGS_UPDATED',
      resource: 'settings',
      resourceId: o,
    }),

  apiKeyCreated: (
    o: string,
    a: string,
    n: string
  ) =>
    writeAuditLog({
      organizationId: o,
      userId: a,
      action: 'API_KEY_CREATED',
      resource: 'api_key',
      metadata: {
        keyName: n,
      },
    }),

  apiKeyRevoked: (
    o: string,
    a: string,
    k: string
  ) =>
    writeAuditLog({
      organizationId: o,
      userId: a,
      action: 'API_KEY_REVOKED',
      resource: 'api_key',
      resourceId: k,
    }),
};
