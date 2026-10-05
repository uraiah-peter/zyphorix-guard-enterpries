'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Divider } from '@/components/ui';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(3,'Min 3 characters').max(200),
  description: z.string().min(10,'Min 10 characters').max(10000),
  severity: z.enum(['P1_CRITICAL','P2_HIGH','P3_MEDIUM','P4_LOW']),
});
type FormData = z.infer<typeof schema>;

export function CreateIncidentDialog({ orgId, onCreated, onClose }: { orgId:string; onCreated:()=>void; onClose:()=>void }) {
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState:{errors,isSubmitting} } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'P3_MEDIUM' },
  });

  async function onSubmit(data: FormData) {
    setServerError('');
    const res = await fetch('/api/incidents', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({orgId,...data}) });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error?.message ?? 'Failed to create incident'); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-orange-400" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Create incident</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input label="Title *" placeholder="e.g. Phishing campaign targeting finance team" error={errors.title?.message} {...register('title')} />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">Description *</label>
            <textarea placeholder="Describe what was detected, when, and initial observations..." rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-y"
              {...register('description')} />
            {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
          </div>
          <Select label="Severity *" error={errors.severity?.message}
            options={[
              {value:'P1_CRITICAL',label:'P1 Critical — Active breach, immediate action required'},
              {value:'P2_HIGH',label:'P2 High — Significant risk, respond within hours'},
              {value:'P3_MEDIUM',label:'P3 Medium — Moderate risk, respond within 24h'},
              {value:'P4_LOW',label:'P4 Low — Informational, respond within the week'},
            ]} {...register('severity')} />
          {serverError && <p className="text-sm text-red-400">{serverError}</p>}
          <Divider />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={isSubmitting} icon={<ShieldAlert size={14} />}>Create incident</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
