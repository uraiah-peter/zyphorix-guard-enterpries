export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { sendEmail, verificationEmailHtml } from '@/lib/email';
import { forgotPasswordSchema } from '@/lib/validations/user'; // { email } shape, reused

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
    const { email } = parsed.data;

    const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });

    // Enumeration-safe: identical response whether or not the account
    // exists, or is already verified.
    if (user && !user.emailVerified) {
      // Clear any existing tokens for this email before issuing a new one
      await db.verificationToken.deleteMany({ where: { identifier: email } });
      const token = crypto.randomBytes(32).toString('hex');
      await db.verificationToken.create({
        data: { identifier: email, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      await sendEmail({ to: email, subject: 'Verify your Zyphorix Guard account', html: verificationEmailHtml(verifyUrl) });
    }

    return apiSuccess({ message: "If that account needs verifying, we've sent a new link." });
  } catch (error) { return handleApiError(error); }
}
