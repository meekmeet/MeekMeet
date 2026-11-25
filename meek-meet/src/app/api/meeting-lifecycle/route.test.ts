import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { MockSupabaseClient } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

const mockSupa = new MockSupabaseClient();

let ipSeq = 0;
function cronRequest(secret?: string, ip?: string): NextRequest {
  const headers: Record<string, string> = {
    "x-forwarded-for": ip ?? `10.5.${++ipSeq}.1`,
  };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/meeting-lifecycle", { headers });
}

const past = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/meeting-lifecycle", () => {
  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_CRON_PER_MINUTE = "1";
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    await GET(cronRequest("cron", "9.9.9.5"));
    const res = await GET(cronRequest("cron", "9.9.9.5"));
    expect(res.status).toBe(429);
    delete process.env.RATE_LIMIT_CRON_PER_MINUTE;
  });

  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
  });

  it("completes meetings that have ended", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const endedAgo = 25; // started 25h ago, default 120min duration → ended
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(endedAgo), duration_minutes: 120, status: "scheduled" },
        { id: "m2", circle_id: "c1", scheduled_at: past(1), duration_minutes: 120, status: "live" },
      ])
      .enqueue(null) // status update
      .enqueue([{ circle_id: "c1" }]) // completed circles
      .enqueue({ id: "insight-1" }); // has insight
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.completed).toBe(1);
    expect(body.insightsGenerated).toBe(1);
    expect(body.questionsGenerated).toBe(1);
    expect(body.reportsGenerated).toBe(0);
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("completes nothing when all past meetings are still within their duration", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(0.5), duration_minutes: 120, status: "scheduled" },
      ])
      .enqueue([]);
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.completed).toBe(0);
    expect(mockSupa.tables).not.toContain("meetings-update"); // update never attempted
  });

  it("respects custom durations when deciding if a meeting ended", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa
      .enqueue([
        // started 3h ago with 30min duration → ended; 2h ago w/ 240min → still running
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
        { id: "m2", circle_id: "c2", scheduled_at: past(2), duration_minutes: 240, status: "scheduled" },
      ])
      .enqueue(null) // update
      .enqueue([{ circle_id: "c1" }, { circle_id: "c2" }]);
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).completed).toBe(1);
  });

  it("returns 500 when the past-meetings query fails", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue(null, { message: "db error" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal error");
    expect(body.results.completed).toBe(0);
    errorSpy.mockRestore();
  });

  it("deduplicates circle ids before synthesis", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
        { id: "m2", circle_id: "c1", scheduled_at: past(4), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }, { circle_id: "c1" }])
      .enqueue({ id: "insight-1" });
    await GET(cronRequest("cron"));
    // One synthesize-circle call + one generate-next-questions call.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("synthesize-circle");
    expect(fetchMock.mock.calls[1][0]).toContain("generate-next-questions");
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("records errors for failed synthesis without aborting", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 }) // synthesize fails
      .mockResolvedValueOnce({ ok: true, status: 200 }); // next-questions ok
    vi.stubGlobal("fetch", fetchMock);
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }])
      .enqueue({ id: "insight-1" });
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.insightsGenerated).toBe(0);
    expect(body.questionsGenerated).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("synthesize-circle");
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("skips question generation when the circle has no insight", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.SUPABASE_SECRET_KEY = "service-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }])
      .enqueue(null, { message: "no insight" });
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.insightsGenerated).toBe(1);
    expect(body.questionsGenerated).toBe(0);
    // Only the synthesize call was made.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("skips synthesis entirely when edge config is absent", async () => {
    process.env.CRON_SECRET = "cron";
    delete process.env.SUPABASE_SECRET_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }]);
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.completed).toBe(1);
    expect(body.insightsGenerated).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generates monthly draft reports on the first of the month", async () => {
    process.env.CRON_SECRET = "cron";
    // Pin "today" to the 1st of a month.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }])
      .enqueue(null, { message: "no report" }) // no existing report
      .enqueue({ name: "Circle One", location: "Sydney" })
      .enqueue({ raw_summary: "Summary", response_count: 5, meeting_count: 1 })
      .enqueue(null); // report insert
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.reportsGenerated).toBe(1);
  });

  it("does not generate reports on other days", async () => {
    process.env.CRON_SECRET = "cron";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:00:00Z"));
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }]);
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).reportsGenerated).toBe(0);
    expect(mockSupa.tables).not.toContain("reports");
  });

  it("skips monthly report when one already exists", async () => {
    process.env.CRON_SECRET = "cron";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }])
      .enqueue({ id: "existing-report" }); // already generated
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).reportsGenerated).toBe(0);
  });

  it("skips report generation gracefully when the circle fetch errors", async () => {
    process.env.CRON_SECRET = "cron";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }])
      .enqueue(null, { message: "no report" })
      .enqueue(null, { message: "circle missing" }); // circle fetch error
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.reportsGenerated).toBe(0);
    expect(body.errors).toEqual([]);
  });

  it("skips report when the circle has no insight", async () => {
    process.env.CRON_SECRET = "cron";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    mockSupa
      .enqueue([
        { id: "m1", circle_id: "c1", scheduled_at: past(3), duration_minutes: 30, status: "scheduled" },
      ])
      .enqueue(null)
      .enqueue([{ circle_id: "c1" }])
      .enqueue(null, { message: "no report" })
      .enqueue({ name: "Circle One" })
      .enqueue(null, { message: "no insight" });
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).reportsGenerated).toBe(0);
  });
});
