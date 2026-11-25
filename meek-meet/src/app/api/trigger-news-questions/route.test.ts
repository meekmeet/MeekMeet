import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { captureMonitoringMessage } from "@/lib/monitor";

vi.mock("@/lib/monitor", () => ({
  captureMonitoringMessage: vi.fn(),
}));

import { GET } from "./route";

let ipSeq = 0;
function cronRequest(secret?: string, ip?: string): NextRequest {
  const headers: Record<string, string> = {
    "x-forwarded-for": ip ?? `10.4.${++ipSeq}.1`,
  };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/trigger-news-questions", { headers });
}

function mockEdgeResponse(status: number, payload: unknown = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("GET /api/trigger-news-questions", () => {
  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_CRON_PER_MINUTE = "1";
    process.env.CRON_SECRET = "cron";
    mockEdgeResponse(200, { ok: true });
    await GET(cronRequest("cron", "9.9.9.6"));
    const res = await GET(cronRequest("cron", "9.9.9.6"));
    expect(res.status).toBe(429);
    delete process.env.RATE_LIMIT_CRON_PER_MINUTE;
  });

  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
  });

  it("returns 500 when the project ref cannot be determined", async () => {
    process.env.CRON_SECRET = "cron";
    const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    mockEdgeResponse(200, {});
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/project ref/i);
    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("proxies a successful edge function response", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    mockEdgeResponse(200, { generated: 3 });
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, generated: 3 });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("forwards the service key to the edge function", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    mockEdgeResponse(200, {});
    await GET(cronRequest("cron"));
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer service-key");
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("returns 502 and captures monitoring when the edge function fails", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    mockEdgeResponse(500, { error: "groq exploded" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Edge function failed");
    expect(body.details).toEqual({ error: "groq exploded" });
    expect(captureMonitoringMessage).toHaveBeenCalledWith(
      "generate-news-questions edge function failed",
      expect.objectContaining({ status: 500 })
    );
    errorSpy.mockRestore();
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("returns 500 when the fetch itself throws", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to trigger news questions");
    errorSpy.mockRestore();
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("tolerates non-JSON error bodies", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("not json");
        },
      })
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(502);
    errorSpy.mockRestore();
    delete process.env.SUPABASE_SECRET_KEY;
  });
});
