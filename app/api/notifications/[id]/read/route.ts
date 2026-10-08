export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';

interface P { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { id } = await params;
    const un = await db.userNotification.findFirst({ where:{ notificationId:id, userId:session.user.id } });
    if (!un) return apiError('NOT_FOUND','Notification not found',404);
    if (!un.readAt) await db.userNotification.update({ where:{ id:un.id }, data:{ readAt:new Date() } });
    return apiSuccess({ read:true });
  } catch (e) { return handleApiError(e); }
}
