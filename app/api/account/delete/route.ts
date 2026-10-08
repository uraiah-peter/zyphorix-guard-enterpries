export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { deleteUserAccount, SoleOwnerError } from '@/lib/account-deletion';
import { z } from 'zod';

const deleteSchema = z.object({
  password: z.string().optional(), // required only for credentials-based accounts
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
    return apiSuccess({ hasPassword: !!user?.password });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { password: true, deletedAt: true } });
    if (!user || user.deletedAt) return apiError('NOT_FOUND', 'Account not found', 404);

    // Credentials-based accounts must re-confirm their password. OAuth-only
    // accounts have no password to check — the confirmation text the
    // frontend requires before submitting is their equivalent safeguard.
    if (user.password) {
      if (!parsed.data.password) return apiError('VALIDATION_ERROR', 'Password required to delete your account', 400);
      const valid = await bcrypt.compare(parsed.data.password, user.password);
      if (!valid) return apiError('INVALID_CREDENTIALS', 'Incorrect password', 401);
    }

    await deleteUserAccount(session.user.id);

    return apiSuccess({ message: 'Account deleted.' });
  } catch (error) {
    if (error instanceof SoleOwnerError) {
      return apiError('SOLE_OWNER', error.message, 409, { organizations: error.orgNames });
    }
    return handleApiError(error);
  }
}
