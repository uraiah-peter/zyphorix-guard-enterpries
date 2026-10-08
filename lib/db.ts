import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch {
    // During build without generated client, return a proxy
    return new Proxy({} as PrismaClient, {
      get: () => new Proxy(() => Promise.resolve(null), { get: () => () => Promise.resolve(null) }),
    });
  }
}

export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
