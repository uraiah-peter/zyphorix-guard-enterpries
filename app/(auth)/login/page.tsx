'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Github, Chrome, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';
import { loginSchema, type LoginInput } from '@/lib/validations/user';
import { getSafeRedirectPath } from '@/lib/utils';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeRedirectPath(searchParams.get('callbackUrl'));
  const [serverError, setServerError] = useState('');
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError('');
    const result = await signIn('credentials', { email: data.email, password: data.password, redirect: false });
    if (result?.error) {
      // Deliberately generic — distinguishing "wrong password" from
      // "account exists but unverified" lets an attacker enumerate which
      // emails have registered accounts.
      setServerError('Invalid email or password.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider);
    await signIn(provider, { callbackUrl });
    setOauthLoading(null);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center rounded-2xl mb-4"
          style={{ width:52,height:52,background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',boxShadow:'0 0 24px rgba(59,130,246,0.4)',fontSize:24,fontFamily:'monospace',fontWeight:900,color:'#fff' }}>
          Z
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Welcome back</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to Zyphorix Guard</p>
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
        <Input label="Email address" type="email" autoComplete="email"
          leftIcon={<Mail size={14} />} error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" autoComplete="current-password"
          leftIcon={<Lock size={14} />} error={errors.password?.message} {...register('password')} />
        {serverError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />{serverError}
          </div>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting} size="lg">Sign in</Button>
      </form>

      <div className="flex items-center justify-between mt-5 text-xs text-[var(--text-muted)]">
        <Link href="/register" className="hover:text-[var(--text-primary)] transition-colors">Create account</Link>
        <Link href="/forgot-password" className="hover:text-[var(--text-primary)] transition-colors">Forgot password?</Link>
      </div>
      <p className="text-center text-xs text-[var(--text-faint)] mt-3">
        <Link href="/verify-email" className="hover:text-[var(--text-primary)] transition-colors">Need to verify your email?</Link>
      </p>
      <p className="text-center text-xs text-[var(--text-faint)] mt-6">Protected by Zyphorix Guard Enterprise</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <Suspense fallback={
        <div className="w-full max-w-sm flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border2)] border-t-blue-400 animate-spin" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
