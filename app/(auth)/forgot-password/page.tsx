'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/user';
import { extractApiError } from '@/lib/utils';

function ForgotPasswordForm() {
  const [serverError, setServerError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setServerError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { setServerError(await extractApiError(res, 'Something went wrong. Please try again.')); return; }
      setSubmitted(true);
    } catch {
      setServerError('Network error — please check your connection and try again.');
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center rounded-2xl mb-4 mx-auto"
          style={{ width: 52, height: 52, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle2 size={24} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Check your email</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          If an account exists for that email, we've sent instructions to reset your password.
        </p>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-6">
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center rounded-2xl mb-4"
          style={{ width:52,height:52,background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',boxShadow:'0 0 24px rgba(59,130,246,0.4)',fontSize:24,fontFamily:'monospace',fontWeight:900,color:'#fff' }}>
          Z
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Forgot your password?</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 text-center">
          Enter your email and we'll send you reset instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email address" type="email" autoComplete="email"
          leftIcon={<Mail size={14} />} error={errors.email?.message} {...register('email')} />
        {serverError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />{serverError}
          </div>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting} size="lg">Send reset instructions</Button>
      </form>

      <div className="flex items-center justify-center mt-5 text-xs text-[var(--text-muted)]">
        <Link href="/login" className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </div>
      <p className="text-center text-xs text-[var(--text-faint)] mt-6">Protected by Zyphorix Guard Enterprise</p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <ForgotPasswordForm />
    </div>
  );
}
