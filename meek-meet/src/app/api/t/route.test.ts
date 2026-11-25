import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { MockSupabaseClient } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

const mockSupa = new MockSupabaseClient();

let ipSeq = 0;
function clickRequest(params: Record<string, string>, ip?: string): NextRequest {
  const q = new URLSearchParams(params);
  return new NextRequest(`http://localhost/api/t?${q.toString()}`, {
    headers: { "x-forwarded-for": ip ?? `10.9.${++ipSeq}.1` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
});

describe("GET /api/t", () => {
  it("redirects to the destination and logs the click", async () => {
    const res = await GET(clickRequest({ d: "/circles", tpl: "invite_vision", t: "midnight" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/circles");
    expect(mockSupa.tables).toEqual(["marketing_events"]);
  });

  it("resolves the send and stops its active sequence", async () => {
    mockSupa
      .enqueue({ id: "send-1", recipient_email: "sam@example.com", sequence_id: "seq-1" })
      .enqueue(null) // event insert
      .enqueue(null); // sequence stop
    await GET(clickRequest({ d: "/shepherd", tpl: "invite_shepherd", t: "terracotta", s: "send-1" }));
    expect(mockSupa.tables).toEqual([
      "marketing_sends",
      "marketing_events",
      "marketing_sequences",
      "marketing_leads", // click marks the lead engaged
    ]);
  });

  it("marks the lead as engaged when a tracked click resolves", async () => {
    mockSupa.enqueue({ id: "send-9", recipient_email: "sam@example.com", sequence_id: null });
    await GET(clickRequest({ d: "/circles", tpl: "invite_vision", t: "parchment", s: "send-9" }));
    expect(mockSupa.tables).toContain("marketing_leads");
  });

  it.each([
    ["absolute URL", "https://evil.com"],
    ["protocol-relative", "//evil.com"],
    ["no leading slash", "circles"],
  ])("refuses unsafe destination: %s", async (_name, d) => {
    const res = await GET(clickRequest({ d, tpl: "x", t: "parchment" }));
    expect(res.headers.get("location")).toBe("http://localhost/circles");
  });

  it("defaults the destination to /circles", async () => {
    const res = await GET(clickRequest({ tpl: "invite_circle", t: "parchment" }));
    expect(res.headers.get("location")).toBe("http://localhost/circles");
  });
});
