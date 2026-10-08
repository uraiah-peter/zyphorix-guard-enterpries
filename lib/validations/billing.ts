import { z } from 'zod';

export const createCheckoutSchema = z.object({
  plan: z.enum(['STARTER', 'PRO']),
  orgId: z.string().min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createPortalSchema = z.object({
  orgId: z.string().min(1),
  returnUrl: z.string().url().optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
