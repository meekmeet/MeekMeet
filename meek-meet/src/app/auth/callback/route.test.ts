import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { MockSupabaseClient } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

const mockSupa = new MockSupabaseClient();

let ipSeq = 0;
function callbackRequest(params: Record<string, string> = {}, ip?: string): NextRequest {
  const query = new URLSearchParams(params);
  return new NextRequest(`http://localhost/auth/callback?${query.toString()}`, {
    headers: { "x-forwarded-for": ip ?? `10.6.${++ipSeq}.1` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
  mockSupa.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_AUTH_CALLBACK_PER_MINUTE = "1";
    await GET(callbackRequest({ code: "abc" }, "9.9.9.4"));
    const res = await GET(callbackRequest({ code: "abc" }, "9.9.9.4"));
    expect(res.status).toBe(429);
    delete process.env.RATE_LIMIT_AUTH_CALLBACK_PER_MINUTE;
  });

  it("redirects to /dashboard on successful code exchange", async () => {
    const res = await GET(callbackRequest({ code: "valid-code" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
    expect(mockSupa.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
  });

  it("redirects to login with error when the code exchange fails", async () => {
    mockSupa.auth.exchangeCodeForSession = vi
      .fn()
      .mockResolvedValue({ error: { message: "expired" } });
    const res = await GET(callbackRequest({ code: "bad-code" }));
    expect(res.headers.get("location")).toContain("/login?error=auth_callback_failed");
  });

  it("redirects to login when no code param is present", async () => {
    const res = await GET(callbackRequest());
    expect(res.headers.get("location")).toContain("/login?error=auth_callback_failed");
    expect(mockSupa.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it.each([
    ["absolute https URL", "https://evil.com/steal"],
    ["absolute http URL", "http://evil.com/steal"],
    ["custom scheme", "javascript:alert(1)"],
    ["protocol-relative", "//evil.com/steal"],
    ["no leading slash", "dashboard/profile"],
    ["backslash", "/\\evil.com"],
    ["path traversal", "/..%2f..%2fetc"],
    ["dot-dot segments", "/foo/../bar"],
  ])("redirects to /dashboard for unsafe next=%s", async (_name, next) => {
    const res = await GET(callbackRequest({ code: "ok", next }));
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it.each([
    ["/dashboard/profile", "http://localhost/dashboard/profile"],
    ["/circles/my-circle", "http://localhost/circles/my-circle"],
    ["/", "http://localhost/"],
  ])("honours safe relative next=%s", async (next, expected) => {
    const res = await GET(callbackRequest({ code: "ok", next }));
    expect(res.headers.get("location")).toBe(expected);
  });

  it("defaults to /dashboard when next is absent", async () => {
    const res = await GET(callbackRequest({ code: "ok" }));
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });
});
