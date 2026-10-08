export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { updateMemberRoleSchema } from '@/lib/validations/org';
import { requirePermission, canModifyRole } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import type { MemberRole } from '@prisma/client';

interface P { params: Promise<{ orgId:string; memberId:string }> }

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId, memberId } = await params;
    const actorMember = await requirePermission(orgId, session.user.id, 'member:manage');
    const target = await db.organizationMember.findUnique({ where:{ id:memberId, organizationId:orgId } });
    if (!target) return apiError('NOT_FOUND','Member not found',404);
    if (target.userId === session.user.id) return apiError('FORBIDDEN','Cannot change your own role',403);
    if (!canModifyRole(actorMember.role as MemberRole, target.role as MemberRole)) return apiError('FORBIDDEN','Cannot modify member with equal or higher role',403);
    const body = await req.json();
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid role',400,parsed.error.flatten());
    if (!canModifyRole(actorMember.role as MemberRole, parsed.data.role as MemberRole)) return apiError('FORBIDDEN','Cannot assign role equal to or higher than your own',403);
    const updated = await db.organizationMember.update({ where:{ id:memberId }, data:{ role: parsed.data.role as MemberRole }, include:{ user:{ select:{ id:true, name:true, email:true, image:true } } } });
    await audit.memberRoleChanged(orgId, session.user.id, target.userId, target.role, parsed.data.role);
    return apiSuccess(updated);
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId, memberId } = await params;
    const actorMember = await requirePermission(orgId, session.user.id, 'member:manage');
    const target = await db.organizationMember.findUnique({ where:{ id:memberId, organizationId:orgId } });
    if (!target) return apiError('NOT_FOUND','Member not found',404);
    if (target.userId === session.user.id) return apiError('FORBIDDEN','Cannot remove yourself',403);
    if (!canModifyRole(actorMember.role as MemberRole, target.role as MemberRole)) return apiError('FORBIDDEN','Cannot remove member with equal or higher role',403);
    await db.organizationMember.delete({ where:{ id:memberId } });
    await audit.memberRemoved(orgId, session.user.id, target.userId);
    return apiSuccess({ removed:true });
  } catch (e) { return handleApiError(e); }
}
