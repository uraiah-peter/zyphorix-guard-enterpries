'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';

type Status = 'no-token' | 'verifying' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const [status, setStatus] = useState<Status>(token && emailParam ? 'verifying' : 'no-token');
  const [message, setMessage] = useState('');
  const [emailInput, setEmailInput] = useState(emailParam ?? '');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token || !emailParam) return;
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: emailParam }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStatus('error');
          setMessage(json.error?.message ?? 'This verification link is invalid or has expired.');
          return;
        }
        setStatus('success');
      } catch {
        setStatus('error');
        setMessage('Network error — please check your connection and try again.');
      }
    })();
  }, [token, emailParam]);

  async function handleResend(email: string) {
    if (!email) return;
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-sm text-center">
      {status === 'no-token' && (
        <>
          <div className="flex items-center justify-center rounded-2xl mb-4 mx-auto"
            style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', boxShadow: '0 0 24px rgba(59,130,246,0.4)' }}>
            <Mail size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Verify your email</h1>
          {resent ? (
            <p className="text-sm text-green-600 mt-4">If that account needs verifying, a link is on its way — check your inbox.</p>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)] mt-2 mb-5 text-left">Enter your email and we'll send you a new verification link.</p>
              <div className="text-left space-y-4">
                <Input label="Email address" type="email" value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)} leftIcon={<Mail size={14} />} />
                <Button className="w-full" onClick={() => handleResend(emailInput)} loading={resending} disabled={!emailInput}>
                  Send verification link
                </Button>
              </div>
            </>
          )}
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-6">
            <ArrowLeft size={12} /> Back to sign in
          </Link>
        </>
      )}

      {status === 'verifying' && (
        <>
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-[var(--text-muted)]" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Verifying your email…</h1>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="flex items-center justify-center rounded-2xl mb-4 mx-auto"
            style={{ width: 52, height: 52, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Email verified</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">Your account is ready. You can now sign in.</p>
          <Link href="/login"><Button className="w-full">Sign in</Button></Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="flex items-center justify-center rounded-2xl mb-4 mx-auto"
            style={{ width: 52, height: 52, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <XCircle size={24} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Verification failed</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">{message}</p>
          {resent ? (
            <p className="text-sm text-green-600">If that account needs verifying, a new link is on its way.</p>
          ) : (
            <Button className="w-full" onClick={() => handleResend(emailParam ?? '')} loading={resending} disabled={!emailParam}>
              Resend verification email
            </Button>
          )}
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-6">
            <ArrowLeft size={12} /> Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <VerifyEmailContent />
    </div>
  );
}

