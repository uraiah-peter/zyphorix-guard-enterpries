import crypto from 'crypto';
import { db } from '@/lib/db';

const KEY_PREFIX = 'zg_live_';

export function generateRawApiKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`;
}
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}
export function getKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, 20) + '...';
}

export async function verifyApiKey(rawKey: string): Promise<{ organizationId:string; permissions:string[]; keyId:string }|null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;
  const hash = hashApiKey(rawKey);
  const key = await db.apiKey.findUnique({ where: { keyHash: hash }, select: { id:true, organizationId:true, permissions:true, revokedAt:true, expiresAt:true } });
  if (!key || key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  db.apiKey.update({ where: { keyHash: hash }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { organizationId: key.organizationId, permissions: key.permissions, keyId: key.id };
}
