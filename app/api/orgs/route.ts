export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, generateUniqueSlug } from '@/lib/utils';
import { createOrgSchema } from '@/lib/validations/org';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Authentication required',401);
    const memberships = await db.organizationMember.findMany({
      where: { userId: session.user.id },
      include: { organization: { include: { subscription: { select:{ plan:true, status:true } }, _count: { select:{ members:true, scans:true } } } } },
      orderBy: { joinedAt: 'desc' },
    });
    return apiSuccess(memberships.map(m => ({ ...m.organization, role: m.role, joinedAt: m.joinedAt })));
  } catch (error) { return handleApiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError('UNAUTHORIZED','Authentication required',401);
    const body = await req.json();
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const { name, industry, size, website, slug: reqSlug } = parsed.data;
    const slug = await generateUniqueSlug(reqSlug ?? name, async (s) => !!(await db.organization.findUnique({ where:{ slug:s } })));
    const org = await db.$transaction(async (tx) => {
      const o = await tx.organization.create({ data: { name, slug, industry, size, website: website||null } });
      await tx.organizationMember.create({ data: { organizationId:o.id, userId:session.user!.id!, role:'OWNER', joinedAt:new Date() } });
      await tx.organizationSettings.create({ data: { organizationId:o.id } });
      await tx.subscription.create({ data: { organizationId:o.id, plan:'FREE', status:'ACTIVE' } });
      return o;
    });
    await writeAuditLog({ organizationId:org.id, userId:session.user.id, action:'ORG_CREATED', resource:'organization', resourceId:org.id, metadata:{ name, slug } });
    return apiSuccess(org, 201);
  } catch (error) { return handleApiError(error); }
}
