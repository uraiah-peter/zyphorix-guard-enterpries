import { z } from 'zod';
const sizes = ['1-10','11-50','51-200','201-1000','1000+'] as const;
export const createOrgSchema = z.object({
  name: z.string().min(2,'Too short').max(64,'Too long'),
  slug: z.string().min(2).max(48).regex(/^[a-z0-9-]+$/,'Lowercase, numbers, hyphens only').optional(),
  industry: z.string().max(64).optional(),
  size: z.enum(sizes).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});
export const updateOrgSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  website: z.string().url().optional().nullable(),
  industry: z.string().max(64).optional().nullable(),
  size: z.enum(sizes).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
});
export const updateOrgSettingsSchema = z.object({
  allowedDomains: z.array(z.string()).optional(),
  mfaRequired: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().min(15).max(10080).optional(),
  scanRetentionDays: z.number().int().min(7).max(365).optional(),
  auditLogRetentionDays: z.number().int().min(30).max(2555).optional(), // min 30 days, max ~7 years (common compliance ceiling)
  notificationsEnabled: z.boolean().optional(),
  weeklyReportEnabled: z.boolean().optional(),
});
export const inviteMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['OWNER','ADMIN','ANALYST','VIEWER']).default('ANALYST'),
});
export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER','ADMIN','ANALYST','VIEWER']),
});
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
