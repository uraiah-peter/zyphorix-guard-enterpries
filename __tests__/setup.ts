// Global test setup
import { vi } from 'vitest';

// Mock Next.js server-only modules
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    next: () => ({}),
    redirect: (url: string) => ({ redirect: url }),
  },
}));

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  db: {
    scan: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    scanFinding: { createMany: vi.fn(), count: vi.fn() },
    organization: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    usageRecord: { create: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
  },
}));

// Suppress console.error in tests
vi.spyOn(console, 'error').mockImplementation(() => {});
