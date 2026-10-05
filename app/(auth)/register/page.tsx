'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { User, Mail, Lock, Github, Chrome, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';
import { registerSchema, type RegisterInput } from '@/lib/validations/user';

function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];

  async function onSubmit(data: RegisterInput) {
    setServerError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password, confirmPassword: data.confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        const fieldErrors = json.error?.details?.fieldErrors as Record<string, string[]> | undefined;
        const firstFieldError = fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
        setServerError(firstFieldError ?? json.error?.message ?? 'Registration failed.');
        return;
      }
      setSuccess(true);
    } catch { setServerError('An unexpected error occurred.'); }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider);
    await signIn(provider, { callbackUrl: '/org-select' });
    setOauthLoading(null);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Check your email</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">We've sent a verification link to your email address. Verify your account to sign in.</p>
        <Link href="/login"><Button variant="secondary" className="w-full">Go to sign in</Button></Link>
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
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Create your account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Start securing your organization today</p>
      </div>

      <div className="space-y-2.5 mb-6">
        <Button variant="secondary" className="w-full" onClick={() => handleOAuth('google')}
          loading={oauthLoading === 'google'} icon={<Chrome size={16} />}>Continue with Google</Button>
        <Button variant="secondary" className="w-full" onClick={() => handleOAuth('github')}
          loading={oauthLoading === 'github'} icon={<Github size={16} />}>Continue with GitHub</Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--text-faint)]">or</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full name" type="text" autoComplete="name"
          leftIcon={<User size={14} />} error={errors.name?.message} {...register('name')} />
        <Input label="Email address" type="email" autoComplete="email"
          leftIcon={<Mail size={14} />} error={errors.email?.message} {...register('email')} />
        <div>
          <Input label="Password" type="password" autoComplete="new-password"
            leftIcon={<Lock size={14} />} error={errors.password?.message} {...register('password')} />
          {password && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {checks.map(c => (
                <div key={c.label} className={c.ok ? 'flex items-center gap-1 text-xs text-emerald-600' : 'flex items-center gap-1 text-xs text-[var(--text-faint)]'}>
                  <span>{c.ok ? '✓' : '·'}</span>{c.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <Input label="Confirm password" type="password" autoComplete="new-password"
          leftIcon={<Lock size={14} />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        {serverError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />{serverError}
          </div>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting} size="lg">Create account</Button>
      </form>

      <p className="text-center text-xs text-[var(--text-muted)] mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-600 transition-colors">Sign in</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'var(--bg)' }}>
      <Suspense fallback={
        <div className="w-6 h-6 rounded-full border-2 border-[var(--border2)] border-t-blue-400 animate-spin" />
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
