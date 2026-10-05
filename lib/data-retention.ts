import { db } from '@/lib/db';

/**
 * Purges scans and audit logs older than each organization's configured
 * retention period. Both OrganizationSettings.scanRetentionDays and
 * .auditLogRetentionDays exist as validated settings, but until this
 * function was wired into a cron route, nothing ever read them back out
 * to actually enforce them. Deleting a Scan cascades to its ScanFinding
 * and ScanReport rows via the existing schema relations.
 *
 * Orgs without a settings row, or with settings but no explicit value, use
 * the schema's own defaults (90 days for scans, 365 for audit logs).
 */
export async function purgeExpiredScans(): Promise<{ orgsProcessed: number; scansDeleted: number; auditLogsDeleted: number }> {
  const orgs = await db.organization.findMany({
    select: { id: true, settings: { select: { scanRetentionDays: true, auditLogRetentionDays: true } } },
  });

  let scansDeleted = 0;
  let auditLogsDeleted = 0;
  for (const org of orgs) {
    const scanRetentionDays = org.settings?.scanRetentionDays ?? 90;
    const scanCutoff = new Date(Date.now() - scanRetentionDays * 24 * 60 * 60 * 1000);
    const scanResult = await db.scan.deleteMany({
      where: { organizationId: org.id, createdAt: { lt: scanCutoff } },
    });
    scansDeleted += scanResult.count;

    const auditRetentionDays = org.settings?.auditLogRetentionDays ?? 365;
    const auditCutoff = new Date(Date.now() - auditRetentionDays * 24 * 60 * 60 * 1000);
    const auditResult = await db.auditLog.deleteMany({
      where: { organizationId: org.id, createdAt: { lt: auditCutoff } },
    });
    auditLogsDeleted += auditResult.count;
  }

  return { orgsProcessed: orgs.length, scansDeleted, auditLogsDeleted };
}
