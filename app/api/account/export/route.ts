export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiError, handleApiError } from '@/lib/utils';
import { exportUserData } from '@/lib/account-export';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const data = await exportUserData(session.user.id);

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="zyphorix-account-data-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
