export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { revokeAllSessions } from '@/lib/session-revocation';
import { z } from 'zod';

const resetSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8, 'Min 8 characters').max(128)
    .regex(/[A-Z]/, 'Need uppercase').regex(/[a-z]/, 'Need lowercase').regex(/[0-9]/, 'Need number'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
    const { email, token, password } = parsed.data;

    const identifier = `reset:${email}`;
    const record = await db.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });
    if (!record || record.expires < new Date()) {
      if (record) await db.verificationToken.delete({ where: { identifier_token: { identifier, token } } }).catch(() => {});
      return apiError('INVALID_TOKEN', 'This reset link is invalid or has expired. Request a new one.', 400);
    }

    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return apiError('INVALID_TOKEN', 'This reset link is invalid or has expired. Request a new one.', 400);

    const hash = await bcrypt.hash(password, 12);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { password: hash } }),
      db.verificationToken.delete({ where: { identifier_token: { identifier, token } } }),
    ]);

    // The actual point of the whole revocation mechanism: any session
    // token issued before this moment — including one an attacker may have
    // stolen — stops working immediately, rather than remaining valid for
    // up to 30 more days.
    await revokeAllSessions(user.id);

    return apiSuccess({ message: 'Password updated. Please sign in with your new password.' });
  } catch (error) { return handleApiError(error); }
}
