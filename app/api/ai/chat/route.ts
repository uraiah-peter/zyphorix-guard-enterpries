export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError } from '@/lib/utils';
import { requireMembership } from '@/lib/permissions';
import { aiProvider } from '@/lib/ai/providers/registry';
import { buildOrgContext, buildSystemPrompt } from '@/lib/ai/context-builder';
import { z } from 'zod';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

const chatSchema = z.object({
  orgId: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(8000),
  })).min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
    }

    const { orgId, messages } = parsed.data;
    await requireMembership(orgId, session.user.id);

    // Burst protection — independent of the monthly plan quota below, so
    // even unlimited-tier (PRO/BUSINESS/ENTERPRISE) orgs can't hammer this
    // endpoint rapidly and run up the Groq bill or DoS the backend.
    const burstLimit = await checkRateLimit('aiChat', orgId);
    if (!burstLimit.success) return rateLimitResponse(burstLimit);

    // Plan gate — FREE plan users cannot use AI Copilot
    const sub = await db.subscription.findUnique({
      where: { organizationId: orgId },
      select: { plan: true },
    });
    if (sub?.plan === 'FREE') {
      return apiError('PLAN_LIMIT_EXCEEDED', 'AI Copilot requires Starter plan or higher. Upgrade to unlock.', 402);
    }

    // STARTER: 50 AI queries/month
    if (sub?.plan === 'STARTER') {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const aiUsage = await db.usageRecord.count({
        where: { subscription: { organizationId: orgId }, metric: 'ai_queries', recordedAt: { gte: monthStart } },
      });
      if (aiUsage >= 50) {
        return apiError('PLAN_LIMIT_EXCEEDED', 'You have used all 50 AI queries included in Starter this month. Upgrade to Pro ($99/mo) for unlimited AI access.', 402);
      }
    }
    // PRO, BUSINESS, ENTERPRISE: unlimited AI queries

    // Build org context (non-blocking — defaults to empty on DB error)
    let orgContext = '';
    try { orgContext = await buildOrgContext(orgId); } catch {}

    const systemPrompt = buildSystemPrompt(orgContext);

    // Sanitize user messages — wrap every user turn (not just the latest)
    // in <user_input> tags, since a multi-turn injection built up gradually
    // across several messages is otherwise just as effective as a single
    // malicious message.
    const sanitizedMessages = messages.map((m) => {
      if (m.role === 'user') {
        return { role: m.role as 'user', content: `<user_input>${m.content}</user_input>` };
      }
      return { role: m.role as 'user' | 'assistant', content: m.content };
    });

    // Stream from Groq
    const stream = await aiProvider.streamCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        ...sanitizedMessages,
      ],
      maxTokens: 1024,
      temperature: 0.4,
    });

    // Record usage (fire and forget)
    db.usageRecord.create({
      data: {
        subscriptionId: (await db.subscription.findUnique({ where: { organizationId: orgId }, select: { id: true } }))?.id ?? '',
        metric: 'ai_queries',
        quantity: 1,
        recordedAt: new Date(),
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      },
    }).catch(() => {});

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[AI Chat]', error);
    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return apiError('CONFIG_ERROR', 'AI Copilot is not configured. Add GROQ_API_KEY to environment variables.', 503);
    }
    return apiError('AI_ERROR', 'AI service temporarily unavailable', 503);
  }
}
