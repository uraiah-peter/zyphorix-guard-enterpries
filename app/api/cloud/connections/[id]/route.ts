export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { z } from 'zod';

interface P { params: Promise<{ id: string }> }
const updateSchema = z.object({ name: z.string().min(1).max(100).optional(), region: z.string().optional(), isActive: z.boolean().optional() });

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { id } = await params;
    const conn = await db.cloudConnection.findUnique({ where: { id } });
    if (!conn) return apiError('NOT_FOUND', 'Connection not found', 404);
    await requireMembership(conn.organizationId, session.user.id);
    return apiSuccess(conn);
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { id } = await params;
    const conn = await db.cloudConnection.findUnique({ where: { id }, select: { organizationId: true } });
    if (!conn) return apiError('NOT_FOUND', 'Connection not found', 404);
    await requirePermission(conn.organizationId, session.user.id, 'cloud:connect');
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
    const updated = await db.cloudConnection.update({ where: { id }, data: parsed.data });
    return apiSuccess(updated);
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Auth required', 401);
    const { id } = await params;
    const conn = await db.cloudConnection.findUnique({ where: { id }, select: { organizationId: true } });
    if (!conn) return apiError('NOT_FOUND', 'Connection not found', 404);
    await requirePermission(conn.organizationId, session.user.id, 'cloud:connect');
    await db.cloudConnection.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) { return handleApiError(e); }
}
