// Error monitoring. Reports to Sentry when a DSN is configured, and always
// logs to the console so local/dev environments keep visibility.
//
// Server-side route/page errors are captured automatically via the
// `onRequestError` hook in instrumentation.ts. Use captureError/captureMessage
// for client-side error boundaries and for handled failures that are still
// worth tracking (e.g. an upstream edge function returning 502).

import { captureException, captureMessage, withScope } from "@sentry/nextjs";

export interface ErrorContext {
  [key: string]: unknown;
}

export function monitoringEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function captureError(
  error: unknown,
  context?: ErrorContext,
  level: "fatal" | "error" | "warning" = "error"
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (monitoringEnabled()) {
    withScope((scope) => {
      if (context) scope.setContext("details", context);
      scope.setLevel(level);
      captureException(err);
    });
  } else {
    // Keep a breadcrumb in logs even when monitoring is off.
    if (context) {
      console.error(`[monitor:${level}]`, err.message, context);
    } else {
      console.error(`[monitor:${level}]`, err);
    }
  }
}

export function captureMonitoringMessage(
  message: string,
  context?: ErrorContext,
  level: "info" | "warning" | "error" = "warning"
): void {
  if (monitoringEnabled()) {
    withScope((scope) => {
      if (context) scope.setContext("details", context);
      scope.setLevel(level);
      captureMessage(message);
    });
  } else {
    console.log(`[monitor:${level}]`, message, context ?? "");
  }
}
