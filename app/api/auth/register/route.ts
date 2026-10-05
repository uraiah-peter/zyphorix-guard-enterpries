export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { registerSchema } from '@/lib/validations/user';
import { sendEmail, verificationEmailHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const { name, email, password } = parsed.data;
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return apiError('CONFLICT','An account with this email already exists.',409);
    const hash = await bcrypt.hash(password, 12);
    const user = await db.user.create({ data: { name, email, password: hash }, select: { id:true, email:true } });

    const token = crypto.randomBytes(32).toString('hex');
    await db.verificationToken.create({
      data: { identifier: email, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await sendEmail({ to: email, subject: 'Verify your Zyphorix Guard account', html: verificationEmailHtml(verifyUrl) });

    return apiSuccess({ message:'Account created. Check your email to verify your account before signing in.', userId: user.id }, 201);
  } catch (error) { return handleApiError(error); }
}
