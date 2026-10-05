export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { sendSlackTestMessage } from '@/lib/integrations/slack';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { orgId, webhookUrl } = await req.json();
    if (!orgId || !webhookUrl) return apiError('VALIDATION_ERROR', 'orgId and webhookUrl required', 400);
    await requirePermission(orgId, session.user.id, 'settings:manage');
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return apiError('VALIDATION_ERROR', 'URL must be a valid Slack webhook (https://hooks.slack.com/...)', 400);
    }
    const result = await sendSlackTestMessage(webhookUrl, 'Your Organization');
    return apiSuccess(result);
  } catch (e) { return handleApiError(e); }
}
