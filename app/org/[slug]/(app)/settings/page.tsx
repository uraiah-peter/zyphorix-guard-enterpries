'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useOrg } from '@/components/layout/OrgProvider';
import { Building2, Globe, Users, Save, AlertTriangle, Trash2 } from 'lucide-react';
import {
  Card, CardHeader, CardTitle, SectionHeader,
  Input, Select, Divider, Badge,
} from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { updateOrgSchema, type UpdateOrgInput } from '@/lib/validations/org';
import { useRouter } from 'next/navigation';

const INDUSTRY_OPTIONS = [
  { value: '', label: 'Select industry' },
  { value: 'technology', label: 'Technology & Software' },
  { value: 'finance', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'government', label: 'Government' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

const SIZE_OPTIONS = [
  { value: '', label: 'Select team size' },
  { value: '1-10', label: '1–10 people' },
  { value: '11-50', label: '11–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '201-1000', label: '201–1,000 people' },
  { value: '1000+', label: '1,000+ people' },
];

export default function SettingsPage() {
  const { org, isOwner, canManage } = useOrg();
  const router = useRouter();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOrgInput>({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: {
      name: org.name,
      website: org.website ?? '',
      industry: org.industry ?? '',
      size: (org.size as any) ?? '',
    },
  });

  async function onSubmit(data: UpdateOrgInput) {
    const res = await fetch(`/api/orgs/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSaveSuccess(true);
      reset(data);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (deleteInput !== org.slug) return;
    setDeleting(true);
    const res = await fetch(`/api/orgs/${org.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/org-select');
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <SectionHeader
        title="Organization Settings"
        description="Manage your organization's profile and configuration"
      />

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <Badge variant="outline" className="text-xs">{org.slug}</Badge>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Organization name *"
            error={errors.name?.message}
            leftIcon={<Building2 size={14} />}
            disabled={!canManage}
            {...register('name')}
          />
          <Input
            label="Website"
            type="url"
            placeholder="https://yourcompany.com"
            error={errors.website?.message}
            leftIcon={<Globe size={14} />}
            disabled={!canManage}
            {...register('website')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Industry"
              options={INDUSTRY_OPTIONS}
              error={errors.industry?.message}
              disabled={!canManage}
              {...register('industry')}
            />
            <Select
              label="Team size"
              options={SIZE_OPTIONS}
              error={errors.size?.message}
              disabled={!canManage}
              {...register('size')}
            />
          </div>

          {canManage && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isDirty}
                icon={<Save size={14} />}
              >
                Save changes
              </Button>
              {saveSuccess && (
                <span className="text-sm text-emerald-400">✓ Changes saved</span>
              )}
            </div>
          )}
        </form>
      </Card>

      {/* Plan info */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <Badge variant={org.subscription?.plan === 'PRO' ? 'default' : 'outline'}>
            {org.subscription?.plan ?? 'FREE'} Plan
          </Badge>
        </CardHeader>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Manage your billing and subscription from the billing page.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/org/${org.slug}/settings/billing`)}
        >
          Manage billing
        </Button>
      </Card>

      {/* Danger zone — owner only */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
          </CardHeader>

          {!deleteConfirm ? (
            <div className="flex items-start gap-4">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">Delete this organization</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Permanently delete <strong>{org.name}</strong> and all associated data including scans,
                  incidents, and team members. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setDeleteConfirm(true)}
              >
                Delete
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/25">
                <p className="text-sm text-red-400 font-medium mb-1">This will permanently delete:</p>
                <ul className="text-xs text-red-400/80 space-y-1 list-disc list-inside">
                  <li>All scan history and reports</li>
                  <li>All incidents and updates</li>
                  <li>All team memberships</li>
                  <li>All API keys</li>
                  <li>All audit logs</li>
                </ul>
              </div>
              <Input
                label={`Type "${org.slug}" to confirm`}
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={org.slug}
              />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={deleting}
                  disabled={deleteInput !== org.slug}
                  onClick={handleDelete}
                  icon={<Trash2 size={14} />}
                >
                  Delete organization
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
