'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, AlertCircle, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';
import { extractApiError } from '@/lib/utils';

const resetFormSchema = z.object({
  password: z.string().min(8, 'Min 8 characters').max(128)
    .regex(/[A-Z]/, 'Need uppercase').regex(/[a-z]/, 'Need lowercase').regex(/[0-9]/, 'Need number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type ResetForm = z.infer<typeof resetFormSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(resetFormSchema),
  });

  if (!token || !email) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center rounded-2xl mb-4 mx-auto"
          style={{ width: 52, height: 52, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <XCircle size={24} className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Invalid reset link</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">This link is missing required information. Request a new one.</p>
        <Link href="/forgot-password"><Button className="w-full">Request new link</Button></Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center rounded-2xl mb-4 mx-auto"
          style={{ width: 52, height: 52, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle2 size={24} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Password updated</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">You've been signed out everywhere for security. Sign in with your new password.</p>
        <Link href="/login"><Button className="w-full">Sign in</Button></Link>
      </div>
    );
  }

  async function onSubmit(data: ResetForm) {
    setServerError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password: data.password }),
      });
      if (!res.ok) { setServerError(await extractApiError(res, 'Something went wrong. Please try again.')); return; }
      setSuccess(true);
    } catch {
      setServerError('Network error — please check your connection and try again.');
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center rounded-2xl mb-4"
          style={{ width:52,height:52,background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',boxShadow:'0 0 24px rgba(59,130,246,0.4)',fontSize:24,fontFamily:'monospace',fontWeight:900,color:'#fff' }}>
          Z
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Set a new password</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 text-center">Choose a strong new password for your account.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="New password" type="password" autoComplete="new-password"
          leftIcon={<Lock size={14} />} error={errors.password?.message} {...register('password')} />
        <Input label="Confirm new password" type="password" autoComplete="new-password"
          leftIcon={<Lock size={14} />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        {serverError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />{serverError}
          </div>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting} size="lg">Update password</Button>
      </form>

      <div className="flex items-center justify-center mt-5 text-xs text-[var(--text-muted)]">
        <Link href="/login" className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <ResetPasswordForm />
    </div>
  );
}
