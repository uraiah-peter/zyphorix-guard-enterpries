export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { inviteMemberSchema } from '@/lib/validations/org';
import { requirePermission, requireMembership } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

interface P { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requireMembership(orgId, session.user.id);
    const members = await db.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select:{ id:true, name:true, email:true, image:true, createdAt:true } }, invitedBy: { select:{ id:true, name:true, email:true } } },
      orderBy: [{ role:'asc' }, { joinedAt:'asc' }],
    });
    return apiSuccess(members);
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'member:invite');
    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const { email, role } = parsed.data;
    const sub = await db.subscription.findUnique({ where:{ organizationId:orgId } });
    const memberCount = await db.organizationMember.count({ where:{ organizationId:orgId } });
    const limits: Record<string,number> = { FREE:1, STARTER:5, PRO:25, ENTERPRISE:-1 };
    const limit = limits[sub?.plan ?? 'FREE'];
    if (limit !== -1 && memberCount >= limit) return apiError('PLAN_LIMIT_EXCEEDED',`Your plan supports max ${limit} member(s). Upgrade to add more.`,402);
    const invitedUser = await db.user.findUnique({ where:{ email }, select:{ id:true, name:true } });
    if (!invitedUser) return apiSuccess({ invited:true, email, role, message:'Invite email will be sent when email provider is configured.' });
    const existing = await db.organizationMember.findUnique({ where:{ organizationId_userId:{ organizationId:orgId, userId:invitedUser.id } } });
    if (existing) return apiError('CONFLICT','User is already a member',409);
    const member = await db.organizationMember.create({ data: { organizationId:orgId, userId:invitedUser.id, role, invitedById:session.user.id, joinedAt:new Date() }, include:{ user:{ select:{ id:true, name:true, email:true, image:true } } } });
    await audit.memberInvited(orgId, session.user.id, email, role);
    await createNotification({ organizationId:orgId, type:'MEMBER_JOINED', title:'New team member added', message:`${invitedUser.name ?? email} has been added as ${role}.` });
    return apiSuccess(member, 201);
  } catch (e) { return handleApiError(e); }
}
