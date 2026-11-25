import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

let ipSeq = 0;
function makeRequest(ip?: string): NextRequest {
  return new NextRequest("http://localhost/api/public/insights", {
    headers: { "x-forwarded-for": ip ?? `10.2.${++ipSeq}.1` },
  });
}

const globalInsight = {
  response_count: 50,
  dominant_theme: "Community",
  generated_at: "2026-01-01T00:00:00Z",
};

const regionalInsight = {
  region_code: "sydney",
  response_count: 20,
  generated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// The route constructs its own supabase-js client; intercept the network layer.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";

function mockSupabaseResponses(responses: Array<{ data: unknown; error: unknown }>) {
  const queue = [...responses];
  const buildChain = (): unknown => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve(queue.shift() ?? { data: null, error: null }),
      maybeSingle: () => Promise.resolve(queue.shift() ?? { data: null, error: null }),
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(queue.shift() ?? { data: null, error: null }).then(onFulfilled, onRejected),
    };
    return chain;
  };
  vi.mocked(createClient).mockReturnValue({
    from: () => buildChain(),
  } as never);
}

describe("GET /api/public/insights", () => {
  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_PUBLIC_INSIGHTS_PER_MINUTE = "1";
    mockSupabaseResponses([]);
    await GET(makeRequest("9.9.9.8"));
    const res = await GET(makeRequest("9.9.9.8"));
    expect(res.status).toBe(429);
    delete process.env.RATE_LIMIT_PUBLIC_INSIGHTS_PER_MINUTE;
  });

  it("returns global and regional insights", async () => {
    mockSupabaseResponses([
      { data: globalInsight, error: null },
      { data: [regionalInsight], error: null },
    ]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.global).toEqual(globalInsight);
    expect(body.regional).toEqual([regionalInsight]);
    expect(body.meta.time_window).toBe("all_time");
    expect(body.meta.note).toMatch(/anonymised/i);
  });

  it("returns null global and empty regional when nothing exists", async () => {
    mockSupabaseResponses([
      { data: null, error: { message: "no rows" } },
      { data: null, error: null },
    ]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.global).toBeNull();
    expect(body.regional).toEqual([]);
  });

  it("returns 500 when the query throws", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: () => {
        throw new Error("client exploded");
      },
    } as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to load/i);
    errorSpy.mockRestore();
  });

  it("uses the anon/publishable key, not the secret key", async () => {
    process.env.SUPABASE_SECRET_KEY = "must-not-leak";
    mockSupabaseResponses([{ data: null, error: null }, { data: [], error: null }]);
    await GET(makeRequest());
    const [url, key] = vi.mocked(createClient).mock.calls[0];
    expect(url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL);
    expect(key).not.toBe("must-not-leak");
    delete process.env.SUPABASE_SECRET_KEY;
  });
});
