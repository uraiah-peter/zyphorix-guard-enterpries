export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

    const where: any = { userId: session.user.id, dismissedAt: null };
    if (unreadOnly) where.readAt = null;

    const userNotifications = await db.userNotification.findMany({
      where,
      include: { notification: orgId ? { where:{ organizationId:orgId } } : true },
      orderBy: { notification: { createdAt: 'desc' } },
      take: limit,
    });

    const filtered = userNotifications.filter(un => un.notification !== null);
    const unreadCount = await db.userNotification.count({
      where: { userId: session.user.id, readAt: null, dismissedAt: null },
    });

    return apiSuccess({ notifications: filtered, unreadCount });
  } catch (e) { return handleApiError(e); }
}
