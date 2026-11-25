import * as Sentry from "@sentry/nextjs";

// Server-side instrumentation. Runs once per runtime (nodejs/edge) when the
// server boots. Without a DSN, Sentry stays inert — safe for local dev and CI.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Route handlers that throw are reported through onRequestError below.
      // Sampling can be tuned here once traffic grows.
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    });
  }
}

// Next.js 15+ hook: captures errors thrown in route handlers, server
// components, and server actions that aren't caught closer to the source.
export const onRequestError = Sentry.captureRequestError;
