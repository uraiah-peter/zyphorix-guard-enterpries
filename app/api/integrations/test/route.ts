export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { sendSlackTestMessage } from '@/lib/integrations/slack';
import { sendWebhook } from '@/lib/integrations/webhook';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { integrationId, orgId } = await req.json();
    if (!integrationId || !orgId) return apiError('VALIDATION_ERROR', 'integrationId and orgId required', 400);
    await requirePermission(orgId, session.user.id, 'settings:manage');

    const integration = await db.integration.findUnique({ where: { id: integrationId } });
    if (!integration || integration.organizationId !== orgId) return apiError('NOT_FOUND', 'Integration not found', 404);

    const org = await db.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const orgName = org?.name ?? 'Your Organization';

    let result: { success: boolean; error?: string };

    if (integration.provider === 'SLACK') {
      result = await sendSlackTestMessage(integration.webhookUrl, orgName);
    } else {
      const webhookResult = await sendWebhook(
        integration.webhookUrl,
        {
          event: 'THREAT_DETECTED',
          orgName,
          orgSlug: '',
          title: 'Zyphorix Guard — Test Alert',
          message: `This is a test alert from Zyphorix Guard. Your webhook integration "${integration.name}" is working correctly.`,
          severity: 'LOW',
          timestamp: new Date().toISOString(),
        },
        integration.secret ?? undefined
      );
      result = { success: webhookResult.success, error: webhookResult.error };
    }

    await db.integration.update({
      where: { id: integrationId },
      data: {
        lastUsedAt: new Date(),
        lastError: result.success ? null : result.error,
      },
    });

    return apiSuccess({ success: result.success, error: result.error });
  } catch (e) { return handleApiError(e); }
}
