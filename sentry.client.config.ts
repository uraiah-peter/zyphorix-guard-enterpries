import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of transactions in production for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out noisy errors
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') return null;
    // Filter out browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
      f => f.filename?.includes('chrome-extension') || f.filename?.includes('moz-extension')
    )) return null;
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // Don't capture sensitive text
      blockAllMedia: false,
    }),
  ],
});
