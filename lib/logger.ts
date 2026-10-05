// ─── Structured Logger ─────────────────────────────────────────────────────
// Wraps pino for structured JSON logging in production.
// Falls back to console in development for readable output.
// Usage: import { logger } from '@/lib/logger'
//        logger.info({ orgId, scanId }, 'Scan completed')

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev ? {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  } : {
    // Production: structured JSON for log aggregation (Datadog, Logtail, etc.)
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: () => ({ service: 'zyphorix-guard', env: process.env.NODE_ENV }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});

// Convenience child loggers per domain
export const auditLogger  = logger.child({ domain: 'audit' });
export const scanLogger   = logger.child({ domain: 'scan' });
export const authLogger   = logger.child({ domain: 'auth' });
export const cloudLogger  = logger.child({ domain: 'cloud' });
export const billingLogger = logger.child({ domain: 'billing' });
