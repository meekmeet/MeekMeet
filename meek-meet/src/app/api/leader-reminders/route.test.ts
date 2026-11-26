import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { MockSupabaseClient } from "@/test/mock-supabase";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

const mockSupa = new MockSupabaseClient();

let ipSeq = 0;
function cronRequest(secret?: string, ip?: string): NextRequest {
  const headers: Record<string, string> = {
    "x-forwarded-for": ip ?? `10.4.${++ipSeq}.1`,
  };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/leader-reminders", { headers });
}

function meeting(minutesFromNow: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `m-${minutesFromNow}`,
    circle_id: "c-1",
    scheduled_at: new Date(Date.now() + minutesFromNow * 60_000).toISOString(),
    meeting_type: "digital",
    location_name: null,
    join_url: "https://zoom.us/j/room",
    access_id: "852 0149 6332",
    access_code: "MEEK",
    circles: { name: "Gosford Circle" },
    ...overrides,
  };
}

/** Queue the four per-meeting lookups: leaders, rsvp count, sealed count, ledger. */
function enqueueMeetingContext(
  leaders: unknown,
  ledger: unknown = [],
  reserved = 5,
  sealed = 3
) {
  mockSupa.enqueue(leaders);
  mockSupa.results.push({ data: null, error: null, count: reserved } as never);
  mockSupa.results.push({ data: null, error: null, count: sealed } as never);
  mockSupa.enqueue(ledger);
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.inserts.length = 0;
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
});

describe("GET /api/leader-reminders", () => {
  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_CRON_PER_MINUTE = "1";
    process.env.CRON_SECRET = "cron";
    const ip = "9.9.9.9";
    await GET(cronRequest("cron", ip));
    expect((await GET(cronRequest("cron", ip)).then((r) => r.status))).toBe(429);
    delete process.env.RATE_LIMIT_CRON_PER_MINUTE;
  });

  it("sends the 60, 30, and 15 minute reminders with counts and the way in", async () => {
    process.env.CRON_SECRET = "cron";
    // The route walks step by step: meetings, then that meeting's context.
    // Step 60 window: now+52..now+68; step 30: now+22..now+38; step 15: now+7..now+23.
    const leader = {
      user_id: "leader-1",
      profiles: { email: "leader@example.com", full_name: "Miriam" },
    };
    mockSupa.enqueue([meeting(60)]);
    enqueueMeetingContext([leader]);
    mockSupa.enqueue({}); // the ledger claim for step 60
    mockSupa.enqueue([meeting(30)]);
    enqueueMeetingContext([leader]);
    mockSupa.enqueue({}); // the ledger claim for step 30
    mockSupa.enqueue([meeting(15)]);
    enqueueMeetingContext([leader]);
    mockSupa.enqueue({}); // the ledger claim for step 15

    const res = await GET(cronRequest("cron"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(3);
    expect(sendMock).toHaveBeenCalledTimes(3);

    const subjects = sendMock.mock.calls.map((c) => c[0].subject as string);
    expect(subjects.some((s) => s.includes("60 minutes"))).toBe(true);
    expect(subjects.some((s) => s.includes("30 minutes"))).toBe(true);
    expect(subjects.some((s) => s.includes("15 minutes"))).toBe(true);

    const first = sendMock.mock.calls[0][0];
    expect(first.to).toBe("leader@example.com");
    expect(first.html).toContain("gathers in 60 minutes");
    expect(first.html).toContain("5 reserved");
    expect(first.html).toContain("3 sealed");
    expect(first.html).toContain("https://zoom.us/j/room");
    expect(first.html).toContain("852 0149 6332");
    expect(first.html).toContain("OPEN THE LEADER ROOM");
    // Ledger claimed once per send.
    expect(mockSupa.inserts).toHaveLength(3);
    expect(mockSupa.inserts[0]).toMatchObject({
      meeting_id: "m-60",
      user_id: "leader-1",
      step: 60,
    });
    expect(mockSupa.inserts[2]).toMatchObject({ meeting_id: "m-15", step: 15 });
  });

  it("skips (meeting, leader, step) rows already in the ledger", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    mockSupa.enqueue([]);
    mockSupa.enqueue([meeting(15)]);
    enqueueMeetingContext(
      [{ user_id: "leader-1", profiles: { email: "leader@example.com" } }],
      [{ user_id: "leader-1", step: 15 }]
    );

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(sendMock).not.toHaveBeenCalled();
    expect(mockSupa.inserts).toHaveLength(0);
  });

  it("rolls the ledger row back when the send fails", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    mockSupa.enqueue([]);
    mockSupa.enqueue([meeting(15)]);
    enqueueMeetingContext([
      { user_id: "leader-1", profiles: { email: "leader@example.com" } },
    ]);
    sendMock.mockRejectedValueOnce(new Error("resend down"));

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
    // select + insert + rollback delete: three touches of the ledger table.
    expect(mockSupa.tables.filter((t) => t === "meeting_leader_reminders")).toHaveLength(3);
  });

  it("leaders without an email are skipped without claiming the ledger", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    mockSupa.enqueue([]);
    mockSupa.enqueue([meeting(15)]);
    enqueueMeetingContext([{ user_id: "leader-1", profiles: { email: null } }]);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
    expect(mockSupa.inserts).toHaveLength(0);
  });
});
