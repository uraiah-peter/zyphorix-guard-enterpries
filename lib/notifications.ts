import type {
  NotificationType,
  RiskLevel,
  Prisma,
} from '@prisma/client';

import { db } from '@/lib/db';

interface CreateNotificationParams {
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: RiskLevel;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  recipientUserIds?: string[];
}

export async function createNotification(
  p: CreateNotificationParams
): Promise<void> {
  try {
    const n = await db.notification.create({
      data: {
        organizationId: p.organizationId,
        type: p.type,
        title: p.title,
        message: p.message,
        severity: p.severity,
        actionUrl: p.actionUrl,
        metadata: p.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    const ids =
      p.recipientUserIds ??
      (
        await db.organizationMember.findMany({
          where: {
            organizationId: p.organizationId,
          },
          select: {
            userId: true,
          },
        })
      ).map((m) => m.userId);

    if (ids.length > 0) {
      await db.userNotification.createMany({
        data: ids.map((userId) => ({
          notificationId: n.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }
  } catch {
    console.error('[Notifications] Failed to create notification');
  }
}