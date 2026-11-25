import * as Sentry from "@sentry/nextjs";

// Browser-side instrumentation. Only activates when a DSN is configured;
// otherwise the SDK initialises inert and nothing is sent.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
});
