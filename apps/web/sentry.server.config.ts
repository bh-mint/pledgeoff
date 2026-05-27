import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Capture 10% of transactions in prod for performance insights; 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.SENTRY_DSN,
  // Tag every event with the deployed commit for quick diff lookup
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // Pipeline errors get extra context via captureException in container.ts
  initialScope: {
    tags: { runtime: 'nodejs' },
  },
});
