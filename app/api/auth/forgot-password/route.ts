export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { forgotPasswordSchema } from '@/lib/validations/user';
import { sendEmail, resetPasswordEmailHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());

    const { email } = parsed.data;
    const user = await db.user.findUnique({ where: { email }, select: { id: true, password: true } });

    // Always return the same generic response whether or not the account
    // exists — prevents attackers from using this endpoint to enumerate
    // registered emails.
    //
    // Only credentials-based accounts (user.password set) get a reset
    // token — an OAuth-only account has no password to reset, and issuing
    // a token for one would be a dead end that just adds noise.
    if (user?.password) {
      // Namespaced identifier ("reset:") distinguishes password-reset
      // tokens from email-verification tokens sharing the same table.
      const identifier = `reset:${email}`;
      await db.verificationToken.deleteMany({ where: { identifier } }); // invalidate any prior reset link
      const token = crypto.randomBytes(32).toString('hex');
      await db.verificationToken.create({
        data: { identifier, token, expires: new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour — shorter-lived than email verification, since this grants account takeover if leaked
      });
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await sendEmail({ to: email, subject: 'Reset your Zyphorix Guard password', html: resetPasswordEmailHtml(resetUrl) });
    }

    return apiSuccess({ message: "If an account exists for that email, we've sent password reset instructions." });
  } catch (error) {
    return handleApiError(error);
  }
}
