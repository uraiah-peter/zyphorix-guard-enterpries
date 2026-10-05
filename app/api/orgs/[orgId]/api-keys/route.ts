export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/utils';
import { createApiKeySchema } from '@/lib/validations/api-key';
import { requirePermission } from '@/lib/permissions';
import { generateRawApiKey, hashApiKey, getKeyPrefix } from '@/lib/api-keys';
import { audit } from '@/lib/audit';

interface P { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'apikey:manage');
    const keys = await db.apiKey.findMany({ where:{ organizationId:orgId, revokedAt:null }, select:{ id:true, name:true, keyPrefix:true, permissions:true, lastUsedAt:true, expiresAt:true, createdAt:true }, orderBy:{ createdAt:'desc' } });
    return apiSuccess(keys);
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: NextRequest, { params }: P) {
  try {
    const session = await auth(); if (!session?.user?.id) return apiError('UNAUTHORIZED','Auth required',401);
    const { orgId } = await params;
    await requirePermission(orgId, session.user.id, 'apikey:manage');
    const body = await req.json();
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR','Invalid input',400,parsed.error.flatten());
    const rawKey = generateRawApiKey();
    const apiKey = await db.apiKey.create({
      data: { organizationId:orgId, createdById:session.user.id, name:parsed.data.name, keyHash:hashApiKey(rawKey), keyPrefix:getKeyPrefix(rawKey), permissions:parsed.data.permissions, expiresAt:parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null },
      select: { id:true, name:true, keyPrefix:true, permissions:true, expiresAt:true, createdAt:true },
    });
    await audit.apiKeyCreated(orgId, session.user.id, parsed.data.name);
    return apiSuccess({ ...apiKey, rawKey }, 201);
  } catch (e) { return handleApiError(e); }
}
