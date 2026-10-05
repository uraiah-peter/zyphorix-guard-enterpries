export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { z } from 'zod';
import crypto from 'crypto';

const schema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(1).max(100).default('Slack'),
  webhookUrl: z.string().url().startsWith('https://hooks.slack.com/', 'Must be a Slack webhook URL'),
  events: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());

    const { orgId, ...data } = parsed.data;
    await requirePermission(orgId, session.user.id, 'settings:manage');

    const secret = crypto.randomBytes(32).toString('hex');
    const integration = await db.integration.create({
      data: { organizationId: orgId, provider: 'SLACK', ...data, secret, isActive: true },
    });

    return apiSuccess(integration, 201);
  } catch (e) { return handleApiError(e); }
}
