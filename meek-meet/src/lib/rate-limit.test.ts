import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  rateLimit,
  rateLimitResponse,
  getClientIp,
  limiters,
} from "./rate-limit";

function makeRequest(ip?: string): NextRequest {
  const headers = new Headers();
  if (ip) headers.set("x-forwarded-for", ip);
  return new NextRequest("http://localhost/api/test", { headers });
}

// Each test uses a distinct route key so buckets never leak between tests.
let routeSeq = 0;
function freshKey() {
  return `test-route-${++routeSeq}`;
}

describe("getClientIp", () => {
  it("takes the first x-forwarded-for value", () => {
    const req = new NextRequest("http://localhost/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace around the ip", () => {
    const req = new NextRequest("http://localhost/", {
      headers: { "x-forwarded-for": "  1.2.3.4  " },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new NextRequest("http://localhost/", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("returns 'unknown' when no ip headers exist", () => {
    expect(getClientIp(makeRequest())).toBe("unknown");
  });
});

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const rule = { limit: 3, windowMs: 60_000 };
    const key = freshKey();
    expect(rateLimit(makeRequest("1.1.1.1"), key, rule).ok).toBe(true);
    expect(rateLimit(makeRequest("1.1.1.1"), key, rule).ok).toBe(true);
    expect(rateLimit(makeRequest("1.1.1.1"), key, rule).ok).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    const rule = { limit: 2, windowMs: 60_000 };
    const key = freshKey();
    rateLimit(makeRequest("1.1.1.2"), key, rule);
    rateLimit(makeRequest("1.1.1.2"), key, rule);
    const outcome = rateLimit(makeRequest("1.1.1.2"), key, rule);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.retryAfterSeconds).toBeGreaterThan(0);
      expect(outcome.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("tracks different IPs independently", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    const key = freshKey();
    expect(rateLimit(makeRequest("1.1.1.3"), key, rule).ok).toBe(true);
    expect(rateLimit(makeRequest("1.1.1.4"), key, rule).ok).toBe(true);
    expect(rateLimit(makeRequest("1.1.1.3"), key, rule).ok).toBe(false);
  });

  it("tracks different routes independently for the same IP", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(rateLimit(makeRequest("1.1.1.5"), freshKey(), rule).ok).toBe(true);
    expect(rateLimit(makeRequest("1.1.1.5"), freshKey(), rule).ok).toBe(true);
  });

  it("resets the window after it expires", () => {
    const rule = { limit: 1, windowMs: 1 }; // 1ms window
    const key = freshKey();
    expect(rateLimit(makeRequest("1.1.1.6"), key, rule).ok).toBe(true);
    // Wait out the window, then a new request should be allowed again.
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(rateLimit(makeRequest("1.1.1.6"), key, rule).ok).toBe(true);
        resolve();
      }, 10)
    );
  });

  it("reports remaining count on success", () => {
    const rule = { limit: 5, windowMs: 60_000 };
    const key = freshKey();
    const outcome = rateLimit(makeRequest("1.1.1.7"), key, rule);
    expect(outcome).toMatchObject({ ok: true, remaining: 4 });
  });

  it("counts requests without x-forwarded-for under a shared 'unknown' bucket", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    const key = freshKey();
    expect(rateLimit(makeRequest(), key, rule).ok).toBe(true);
    expect(rateLimit(makeRequest(), key, rule).ok).toBe(false);
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After header and JSON body", async () => {
    const res = rateLimitResponse({ retryAfterSeconds: 42 });
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });
});

describe("limiters", () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_UPLOAD_PER_MINUTE;
    delete process.env.RATE_LIMIT_CRON_PER_MINUTE;
  });

  it("returns sensible defaults when no env overrides exist", () => {
    expect(limiters.uploadDocument()).toEqual({ limit: 10, windowMs: 60_000 });
    expect(limiters.circleOrganizer()).toEqual({ limit: 30, windowMs: 60_000 });
    expect(limiters.cron()).toEqual({ limit: 30, windowMs: 60_000 });
    expect(limiters.publicInsights()).toEqual({ limit: 120, windowMs: 60_000 });
    expect(limiters.authCallback()).toEqual({ limit: 60, windowMs: 60_000 });
  });

  it("respects env overrides", () => {
    process.env.RATE_LIMIT_UPLOAD_PER_MINUTE = "3";
    expect(limiters.uploadDocument().limit).toBe(3);
  });

  it("falls back to defaults for invalid env values", () => {
    process.env.RATE_LIMIT_CRON_PER_MINUTE = "not-a-number";
    expect(limiters.cron().limit).toBe(30);
    process.env.RATE_LIMIT_CRON_PER_MINUTE = "0";
    expect(limiters.cron().limit).toBe(30);
    process.env.RATE_LIMIT_CRON_PER_MINUTE = "-5";
    expect(limiters.cron().limit).toBe(30);
  });

  it("accepts positive numeric env overrides", () => {
    process.env.RATE_LIMIT_PUBLIC_INSIGHTS_PER_MINUTE = "500";
    expect(limiters.publicInsights().limit).toBe(500);
    delete process.env.RATE_LIMIT_PUBLIC_INSIGHTS_PER_MINUTE;
  });
});
