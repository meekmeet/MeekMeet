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
    "x-forwarded-for": ip ?? `10.3.${++ipSeq}.1`,
  };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/send-reminders", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
});

describe("GET /api/send-reminders", () => {
  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_CRON_PER_MINUTE = "1";
    process.env.CRON_SECRET = "cron";
    await GET(cronRequest("cron", "9.9.9.7"));
    expect((await GET(cronRequest("cron", "9.9.9.7")).then((r) => r.status))).toBe(429);
    delete process.env.RATE_LIMIT_CRON_PER_MINUTE;
  });

  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("returns sent:0 when no meetings are scheduled tomorrow", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 0, message: "No meetings tomorrow" });
  });

  it("sends a reminder per going RSVP with an email", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([
      {
        scheduled_at: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        location_name: "Community Hall",
        location_address: "1 Main St",
        circles: { name: "Test Circle" },
        rsvps: [
          {
            user_id: "u1",
            status: "going",
            profiles: { email: "one@example.com", full_name: "One <b>" },
          },
          { user_id: "u2", status: "going", profiles: { email: "two@example.com", full_name: null } },
          { user_id: "u3", status: "maybe", profiles: { email: "three@example.com" } },
          { user_id: "u4", status: "going", profiles: null },
        ],
      },
    ]);
    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    // u1 (named) + u2 (no name → "Friend"); u3 is maybe, u4 has no profile.
    expect(body.sent).toBe(2);
    expect(sendMock).toHaveBeenCalledTimes(2);

    const first = sendMock.mock.calls[0][0];
    expect(first.to).toBe("one@example.com");
    expect(first.subject).toContain("Test Circle");
    expect(first.html).toContain("One &lt;b&gt;");
    expect(first.html).not.toContain("<b>");

    const second = sendMock.mock.calls[1][0];
    expect(second.to).toBe("two@example.com");
    expect(second.html).toContain("Hello Friend");
  });

  it("handles array-shaped relations from PostgREST", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([
      {
        scheduled_at: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        circles: [{ name: "Array Circle" }],
        rsvps: [
          { user_id: "u1", status: "going", profiles: [{ email: "arr@example.com" }] },
        ],
      },
    ]);
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).sent).toBe(1);
  });

  it("skips RSVPs with no email on file", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([
      {
        scheduled_at: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        rsvps: [
          { user_id: "u1", status: "going", profiles: { email: null, full_name: null } },
          { user_id: "u2", status: "going", profiles: { email: "  ", full_name: null } },
        ],
      },
    ]);
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("continues past individual send failures", async () => {
    process.env.CRON_SECRET = "cron";
    sendMock
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValueOnce({ id: "ok" });
    mockSupa.enqueue([
      {
        scheduled_at: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        rsvps: [
          { user_id: "u1", status: "going", profiles: { email: "bad@example.com" } },
          { user_id: "u2", status: "going", profiles: { email: "good@example.com" } },
        ],
      },
    ]);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).sent).toBe(1);
    errorSpy.mockRestore();
  });

  it("handles meetings with no RSVPs", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([
      { scheduled_at: new Date(Date.now() + 36 * 3600 * 1000).toISOString(), rsvps: null },
    ]);
    const res = await GET(cronRequest("cron"));
    expect((await res.json()).sent).toBe(0);
  });
});
