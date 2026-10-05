import { z } from 'zod';
const VALID_PERMISSIONS = ['scan:create','scan:read','scan:delete','report:read','intel:read','admin:read'] as const;
export const createApiKeySchema = z.object({
  name: z.string().min(1,'Name required').max(64),
  permissions: z.array(z.enum(VALID_PERMISSIONS)).min(1,'Select at least one permission').default(['scan:create','scan:read']),
  expiresAt: z.string().datetime().optional().nullable(),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
