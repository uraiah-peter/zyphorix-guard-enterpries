export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, getPaginationParams } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { checkScanLimit } from '@/lib/billing';
import { runScan } from '@/lib/scanning/orchestrator';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createScanSchema = z.object({
  orgId: z.string().min(1),
  type: z.enum(['URL', 'EMAIL', 'FILE', 'DOMAIN_IP']),
  input: z.string().min(1, 'Input is required').max(50000),
  filename: z.string().max(255).optional(),
  mimeType: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const body = await req.json();
    const parsed = createScanSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());

    const { orgId, type, input, filename, mimeType } = parsed.data;
    await requirePermission(orgId, session.user.id, 'scan:create');

    // Enforce plan limits BEFORE processing
    const limitCheck = await checkScanLimit(orgId);
    if (!limitCheck.allowed) {
      return apiError('PLAN_LIMIT_EXCEEDED', limitCheck.reason ?? 'Scan limit reached', 402);
    }

    // Get org name for report context
    const org = await db.organization.findUnique({ where: { id: orgId }, select: { name: true } });

    await writeAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: 'SCAN_CREATED',
      resource: 'scan',
      metadata: { type, inputPreview: input.substring(0, 100) },
    });

    // Run synchronously (Inngest background jobs in Phase 7)
    const result = await runScan({
      organizationId: orgId,
      createdById: session.user.id,
      type,
      input,
      filename,
      mimeType,
      orgName: org?.name ?? 'Unknown',
    });

    return apiSuccess(result, 201);
  } catch (e) { return handleApiError(e); }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return apiError('VALIDATION_ERROR', 'orgId required', 400);

    await requireMembership(orgId, session.user.id);

    const { cursor, limit } = getPaginationParams(searchParams);
    const type = searchParams.get('type') ?? undefined;
    const riskLevel = searchParams.get('riskLevel') ?? undefined;

    const scans = await db.scan.findMany({
      where: {
        organizationId: orgId,
        ...(type ? { type: type as any } : {}),
        ...(riskLevel ? { riskLevel: riskLevel as any } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      select: {
        id: true, type: true, status: true, input: true, riskScore: true,
        riskLevel: true, classification: true, summary: true,
        createdAt: true, completedAt: true, durationMs: true,
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = scans.length > limit;
    const items = hasMore ? scans.slice(0, limit) : scans;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return apiSuccess({ items, nextCursor, hasMore });
  } catch (e) { return handleApiError(e); }
}
