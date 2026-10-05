import { db } from '@/lib/db';

/**
 * Gathers a user's personal data into a structured export (Article 20 —
 * right to data portability). Scoped to what's actually theirs: their own
 * account fields, their memberships, and content they personally created.
 * Deliberately excludes other members' data, org billing/secrets, and
 * anything belonging to the organization rather than to them individually.
 */
export async function exportUserData(userId: string) {
  const [user, memberships, scans, incidentUpdates, apiKeys, notifications, auditLogs] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, emailVerified: true },
    }),
    db.organizationMember.findMany({
      where: { userId },
      select: { role: true, joinedAt: true, organization: { select: { name: true, slug: true } } },
    }),
    db.scan.findMany({
      where: { createdById: userId },
      select: { id: true, type: true, status: true, riskLevel: true, classification: true, createdAt: true, organization: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.incidentUpdate.findMany({
      where: { authorId: userId },
      select: { id: true, content: true, createdAt: true, incident: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.apiKey.findMany({
      // Metadata only — never the key hash itself
      where: { createdById: userId },
      select: { id: true, name: true, keyPrefix: true, permissions: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.userNotification.findMany({
      where: { userId },
      select: { readAt: true, dismissedAt: true, createdAt: true, notification: { select: { type: true, title: true, message: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500, // most-recent 500 — notification history isn't the kind of record this right is meant to preserve indefinitely
    }),
    db.auditLog.findMany({
      where: { userId },
      select: { action: true, resource: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: user,
    organizationMemberships: memberships,
    scansCreated: scans,
    incidentComments: incidentUpdates,
    apiKeys: apiKeys,
    notifications,
    auditActivity: auditLogs,
  };
}
