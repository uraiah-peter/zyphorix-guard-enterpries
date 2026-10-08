export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { z } from 'zod';

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
    const { email, token } = parsed.data;

    const record = await db.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token } },
    });
    if (!record || record.expires < new Date()) {
      // Clean up an expired-but-still-present token
      if (record) await db.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } }).catch(() => {});
      return apiError('INVALID_TOKEN', 'This verification link is invalid or has expired. Request a new one.', 400);
    }

    await db.$transaction([
      db.user.update({ where: { email }, data: { emailVerified: new Date() } }),
      db.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } }),
    ]);

    return apiSuccess({ message: 'Email verified. You can now sign in.' });
  } catch (error) { return handleApiError(error); }
}
