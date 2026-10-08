import { db } from '@/lib/db';
import { revokeAllSessions } from '@/lib/session-revocation';
import crypto from 'crypto';

export class SoleOwnerError extends Error {
  constructor(public orgNames: string[]) {
    super(
      `You're the sole owner of ${orgNames.length === 1 ? 'an organization' : 'organizations'} with other members: ${orgNames.join(', ')}. Transfer ownership before deleting your account.`
    );
    this.name = 'SoleOwnerError';
  }
}

/**
 * Deletes a user account by anonymizing it rather than removing the row.
 * A hard delete isn't safe here: ApiKey.createdBy, Scan.createdBy, and
 * IncidentUpdate.author are all required (non-nullable) foreign keys with
 * no cascade behavior, so deleting a User row that's ever created a scan,
 * an API key, or commented on an incident — i.e. almost any real user —
 * would fail with a database constraint violation. Anonymizing instead:
 * blanks personal fields (name, email, image, password), keeps the row so
 * historical org records stay intact, and is itself GDPR-compliant since
 * anonymized data is no longer personal data under Article 4(1)/Recital 26.
 *
 * Organization handling:
 * - Orgs where the user is sole owner AND the only member: deleted entirely
 *   (cascades through the schema's existing onDelete: Cascade relations).
 * - Orgs where the user is sole owner WITH other members: blocks deletion —
 *   ownership must be transferred first, since silently reassigning
 *   ownership to another member is a judgment call this function shouldn't
 *   make unilaterally.
 * - Orgs where the user is a regular member: their membership is removed,
 *   the org and its data are untouched.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, _count: { select: { members: true } } } } },
  });

  const soleOwnerWithOthers = memberships.filter(
    (m) => m.role === 'OWNER' && m.organization._count.members > 1
  );
  if (soleOwnerWithOthers.length > 0) {
    // Only block if no other OWNER exists in that org either
    const blocking: string[] = [];
    for (const m of soleOwnerWithOthers) {
      const otherOwners = await db.organizationMember.count({
        where: { organizationId: m.organizationId, role: 'OWNER', userId: { not: userId } },
      });
      if (otherOwners === 0) blocking.push(m.organization.name);
    }
    if (blocking.length > 0) throw new SoleOwnerError(blocking);
  }

  const soleOwnerAlone = memberships.filter(
    (m) => m.role === 'OWNER' && m.organization._count.members === 1
  );
  const regularMemberships = memberships.filter(
    (m) => !soleOwnerAlone.some((s) => s.organizationId === m.organizationId)
  );

  // Anonymized placeholder — unique so the email column's unique constraint
  // never collides across multiple deleted accounts.
  const anonymizedEmail = `deleted-${crypto.randomBytes(8).toString('hex')}@deleted.zyphorix.internal`;

  await db.$transaction([
    // Orgs the user solely owned with no one else in them — nothing left
    // to preserve, delete the whole org (cascades to its scans, incidents, etc.)
    ...soleOwnerAlone.map((m) => db.organization.delete({ where: { id: m.organizationId } })),
    // Remove membership from every org the user doesn't solely own
    db.organizationMember.deleteMany({
      where: { userId, organizationId: { in: regularMemberships.map((m) => m.organizationId) } },
    }),
    // Unassign any open incidents rather than leaving them silently
    // assigned to a now-anonymized account
    db.incident.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } }),
    // Revoke API keys — they're still usable credentials even after the
    // owning account is anonymized, so they must be explicitly killed
    db.apiKey.updateMany({ where: { createdById: userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    // OAuth-linked accounts — cascade-deletes via the schema relation, but
    // explicit here for clarity and to not depend solely on cascade order
    db.account.deleteMany({ where: { userId } }),
    db.session.deleteMany({ where: { userId } }),
    // Anonymize the row itself — kept (not deleted) so createdById/authorId
    // references on their historical scans/incidents/API keys stay valid
    db.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted user',
        email: anonymizedEmail,
        image: null,
        password: null,
        emailVerified: null,
        deletedAt: new Date(),
      },
    }),
  ]);

  // Outside the transaction — Redis, not Postgres, so it isn't part of it.
  // Belt-and-suspenders: password is already nulled (blocks credentials
  // login) and OAuth Account rows are gone (blocks OAuth login), but this
  // also invalidates any session token issued before this moment.
  await revokeAllSessions(userId);
}
