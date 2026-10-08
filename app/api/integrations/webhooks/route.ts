export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { z } from 'zod';
import crypto from 'crypto';

const createSchema = z.object({
  orgId: z.string().min(1),
  provider: z.enum(['SLACK', 'WEBHOOK', 'DISCORD', 'TEAMS']),
  name: z.string().min(1).max(100),
  webhookUrl: z.string().url('Must be a valid URL'),
  events: z.array(
    z.enum([
      'THREAT_DETECTED',
      'CRITICAL_THREAT',
      'INCIDENT_CREATED',
      'INCIDENT_P1',
      'CLOUD_ISSUE_FOUND',
      'SCAN_COMPLETED',
      'MEMBER_JOINED',
      'WEEKLY_DIGEST',
    ])
  ).min(1, 'Select at least one event'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Auth required', 401);
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return apiError('VALIDATION_ERROR', 'orgId required', 400);
    }

    await requireMembership(orgId, session.user.id);

    const integrations = await db.integration.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    const masked = integrations.map((i: any) => ({
      ...i,
      webhookUrl: i.webhookUrl.slice(0, 40) + '...',
      secret: i.secret ? '••••••••' : null,
    }));

    return apiSuccess(masked);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Auth required', 401);
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Invalid input',
        400,
        parsed.error.flatten()
      );
    }

    const {
      orgId,
      provider,
      name,
      webhookUrl,
      events,
    } = parsed.data;

    await requirePermission(orgId, session.user.id, 'settings:manage');

    const secret = crypto.randomBytes(32).toString('hex');

    const integration = await db.integration.create({
      data: {
        provider,
        name,
        webhookUrl,
        events,
        secret,
        isActive: true,
        organization: {
          connect: {
            id: orgId,
          },
        },
      },
    });

    return apiSuccess({ ...integration, secret }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}