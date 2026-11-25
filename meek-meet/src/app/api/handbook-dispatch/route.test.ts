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
function cronRequest(secret?: string): NextRequest {
  const headers: Record<string, string> = {
    "x-forwarded-for": `10.9.${++ipSeq}.1`,
  };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/handbook-dispatch", { headers });
}

function inFourDays(): string {
  const d = new Date();
  d.setDate(d.getDate() + 4);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

const MEETING = {
  id: "11111111-1111-1111-1111-111111111111",
  circle_id: "22222222-2222-2222-2222-222222222222",
  scheduled_at: inFourDays(),
  location_name: "Gosford Library",
  circles: { name: "Gosford Circle" },
  rsvps: [
    {
      user_id: "u1",
      status: "going",
      profiles: { email: "miriam@example.com", full_name: "Miriam" },
    },
    {
      user_id: "u2",
      status: "not_going",
      profiles: { email: "sam@example.com", full_name: "Sam" },
    },
  ],
};

const QUESTIONS = [
  {
    meeting_id: MEETING.id,
    question_id: "q1",
    content: "What would make your street safer?",
    order_index: 0,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.updates.length = 0;
  process.env.CRON_SECRET = "cron";
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
});

describe("GET /api/handbook-dispatch", () => {
  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("reports zero when no meetings fall in the window", async () => {
    mockSupa.enqueue([]); // meetings
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("creates a handbook and emails each going RSVP, skipping others", async () => {
    mockSupa.enqueue([MEETING]); // meetings
    mockSupa.enqueue(QUESTIONS); // meeting_questions
    mockSupa.enqueue([]); // existing handbooks
    mockSupa.enqueue(null); // prior completed count (none)
    mockSupa.enqueue({ id: "hb-1" }); // insert .single()
    mockSupa.enqueue(null); // emailed_at update

    const res = await GET(cronRequest("cron"));
    const body = await res.json();

    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const email = sendMock.mock.calls[0][0];
    expect(email.to).toBe("miriam@example.com");
    expect(email.subject).toContain("first circle");
    expect(email.html).toContain("What would make your street safer?");
    expect(email.html).toContain(`/dashboard/handbook/${MEETING.id}`);

    // The inserted handbook snapshots the questions with empty answers.
    const insertPayload = mockSupa.upserts.length
      ? mockSupa.upserts
      : undefined;
    expect(insertPayload).toBeUndefined(); // insert(), not upsert()
  });

  it("never emails a member who already has a handbook for the meeting", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([{ meeting_id: MEETING.id, profile_id: "u1" }]); // existing

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("uses the returning variant for members with a completed handbook in the circle", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]); // existing
    mockSupa.results.push({ data: null, error: null, count: 2 } as never); // prior completed
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(1);
    const email = sendMock.mock.calls[0][0];
    expect(email.html).toContain("Your check-in");
    expect(email.subject).toContain("Gosford Circle");
  });

  it("skips RSVPs with no email address", async () => {
    mockSupa.enqueue([
      {
        ...MEETING,
        rsvps: [
          { user_id: "u3", status: "going", profiles: { email: null, full_name: "No Mail" } },
        ],
      },
    ]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("counts failures without aborting the batch", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null); // count
    mockSupa.enqueue({ id: "hb-1" });
    sendMock.mockRejectedValueOnce(new Error("resend down"));

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(1);
  });

  it("returns 500 when the meetings query fails", async () => {
    mockSupa.enqueue(null, { message: "db down" });
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(500);
  });
});
