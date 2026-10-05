export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    let notifIds: string[] | undefined;
    if (orgId) {
      const notifs = await db.notification.findMany({ where:{ organizationId:orgId }, select:{ id:true } });
      notifIds = notifs.map(n => n.id);
    }
    await db.userNotification.updateMany({
      where: { userId:session.user.id, readAt:null, ...(notifIds ? { notificationId:{ in:notifIds } } : {}) },
      data: { readAt:new Date() },
    });
    return apiSuccess({ marked:true });
  } catch (e) { return handleApiError(e); }
}
