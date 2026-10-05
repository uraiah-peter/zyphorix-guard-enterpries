'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Globe, Users, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Card } from '@/components/ui';
import { createOrgSchema, type CreateOrgInput } from '@/lib/validations/org';
import { cn } from '@/lib/utils';

const INDUSTRIES = [
  { value: '', label: 'Select industry' },
  { value: 'technology', label: 'Technology & Software' },
  { value: 'finance', label: 'Financial Services & Banking' },
  { value: 'healthcare', label: 'Healthcare & Life Sciences' },
  { value: 'government', label: 'Government & Public Sector' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'consulting', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

const SIZES = [
  { value: '', label: 'Select team size' },
  { value: '1-10', label: '1–10 people' },
  { value: '11-50', label: '11–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '201-1000', label: '201–1,000 people' },
  { value: '1000+', label: '1,000+ people' },
];

const FEATURES = [
  { icon: '🔍', title: 'AI Threat Scanning', desc: 'URL, email, file, and domain analysis powered by AI' },
  { icon: '🛡️', title: 'Incident Management', desc: 'Track and resolve security incidents across your team' },
  { icon: '☁️', title: 'Cloud Security', desc: 'Analyze your AWS, Azure, and GCP configurations' },
  { icon: '🤖', title: 'AI Copilot', desc: 'Ask security questions and get expert guidance 24/7' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'creating' | 'done'>('details');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgInput>({ resolver: zodResolver(createOrgSchema) });

  const orgName = watch('name', '');

  async function onSubmit(data: CreateOrgInput) {
    setServerError('');
    setStep('creating');

    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setStep('details');
        setServerError(json.error?.message ?? 'Failed to create organization. Please try again.');
        return;
      }

      setStep('done');
      setTimeout(() => {
        router.push(`/org/${json.data.slug}/dashboard`);
      }, 1200);
    } catch {
      setStep('details');
      setServerError('An unexpected error occurred. Please try again.');
    }
  }

  if (step === 'creating') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <Loader2 size={40} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-primary)] font-medium">Setting up your organization...</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">This only takes a moment</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-4" />
          <p className="text-[var(--text-primary)] font-bold text-xl">Organization created!</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center rounded-2xl mx-auto mb-4"
            style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', boxShadow: '0 0 24px rgba(59,130,246,0.4)', fontSize: 24, fontFamily: 'monospace', fontWeight: 900, color: '#fff' }}>
            Z
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Set up your organization</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Your organization is the workspace where your security team collaborates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* Form */}
          <div className="md:col-span-3">
            <Card>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="Organization name *"
                  placeholder="Acme Security Team"
                  error={errors.name?.message}
                  leftIcon={<Building2 size={14} />}
                  {...register('name')}
                />

                <Input
                  label="Website"
                  placeholder="https://acme.com"
                  type="url"
                  error={errors.website?.message}
                  leftIcon={<Globe size={14} />}
                  {...register('website')}
                />

                <Select
                  label="Industry"
                  options={INDUSTRIES}
                  error={errors.industry?.message}
                  {...register('industry')}
                />

                <Select
                  label="Team size"
                  options={SIZES}
                  error={errors.size?.message}
                  {...register('size')}
                />

                {serverError && (
                  <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 text-sm">
                    {serverError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={isSubmitting}
                  iconRight={<ChevronRight size={16} />}
                >
                  Create organization
                </Button>
              </form>
            </Card>
          </div>

          {/* Feature preview */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              What you get
            </p>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)]"
              >
                <span className="text-lg flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{f.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}

            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mt-2">
              <p className="text-xs text-emerald-600 font-medium">✓ Free plan included</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                10 scans/month, 1 user. Upgrade anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
