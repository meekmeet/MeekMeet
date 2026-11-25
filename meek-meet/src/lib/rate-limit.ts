import { NextRequest, NextResponse } from "next/server";

// Fixed-window, in-memory rate limiter for API route handlers.
//
// Scope: this limits per server instance. On Vercel each function instance
// keeps its own counters, so an aggressive client can do `limit × instances`
// requests — still bounded, and Vercel's own platform protections sit in
// front. If strict global limits are ever needed, swap the bucket store for
// Upstash Redis behind the same interface.
//
// Limits can be tuned per route via environment variables (see limiters
// below) without code changes.

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Occasional sweep so expired buckets don't accumulate forever.
let lastSweep = Date.now();
function sweepIfDue() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitOutcome =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSeconds: number };

/**
 * Check (and record) a request against a limit. Keyed by route + client IP.
 */
export function rateLimit(
  request: NextRequest,
  routeKey: string,
  rule: RateLimitRule
): RateLimitOutcome {
  sweepIfDue();

  const key = `${routeKey}:${getClientIp(request)}`;
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > rule.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: rule.limit - bucket.count, resetAt: bucket.resetAt };
}

export function rateLimitResponse(outcome: { retryAfterSeconds: number }): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(outcome.retryAfterSeconds) },
    }
  );
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Per-route limiters. Env overrides allow tuning without a redeploy of code. */
export const limiters = {
  /** Authenticated document uploads (shepherd applications). */
  uploadDocument: (): RateLimitRule => ({
    limit: intFromEnv("RATE_LIMIT_UPLOAD_PER_MINUTE", 10),
    windowMs: 60_000,
  }),
  /** Admin/cron circle auto-organization. */
  circleOrganizer: (): RateLimitRule => ({
    limit: intFromEnv("RATE_LIMIT_CIRCLE_ORGANIZER_PER_MINUTE", 30),
    windowMs: 60_000,
  }),
  /** Cron-only endpoints; protects against CRON_SECRET brute force. */
  cron: (): RateLimitRule => ({
    limit: intFromEnv("RATE_LIMIT_CRON_PER_MINUTE", 30),
    windowMs: 60_000,
  }),
  /** Public, ISR-cached insights feed. */
  publicInsights: (): RateLimitRule => ({
    limit: intFromEnv("RATE_LIMIT_PUBLIC_INSIGHTS_PER_MINUTE", 120),
    windowMs: 60_000,
  }),
  /** Auth callback (OAuth/magic link code exchange). */
  authCallback: (): RateLimitRule => ({
    limit: intFromEnv("RATE_LIMIT_AUTH_CALLBACK_PER_MINUTE", 60),
    windowMs: 60_000,
  }),
} as const;
