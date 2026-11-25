import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { MockSupabaseClient } from "@/test/mock-supabase";
import { getTopicForDate, THRESHOLD_TOPIC } from "@meekmeet/core/questions";
import { HANDBOOK_QUESTION_COUNT, HANDBOOK_THRESHOLD_COUNT } from "@/lib/handbook";

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
  meeting_type: "in_person",
  join_url: null,
  leader_pack_sent_at: null,
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
    question_id: "custom-1",
    content: "What would make your street safer?",
    order_index: 0,
  },
];

const LEADER = {
  user_id: "leader-1",
  profiles: { email: "leah@example.com", full_name: "Leah" },
};

const ROSTER = [
  {
    profile_id: "u1",
    variant: "first_circle",
    completed_at: null,
    profiles: { full_name: "Miriam" },
  },
];

/** Queue the leader-pack queries for one meeting (leaders, roster, stamp). */
function enqueueLeaderPack(leaders: unknown[] = [LEADER], roster: unknown[] = ROSTER) {
  mockSupa.enqueue(leaders); // circle_shepherds
  mockSupa.enqueue(roster); // session_handbooks roster
  mockSupa.enqueue(null); // meetings leader_pack_sent_at update
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.updates.length = 0;
  mockSupa.inserts.length = 0;
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
    expect(body.leaderPacks).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("draws each member's questions from the day's topic, plus leader customs", async () => {
    mockSupa.enqueue([MEETING]); // meetings
    mockSupa.enqueue(QUESTIONS); // meeting_questions
    mockSupa.enqueue([]); // existing handbooks
    mockSupa.enqueue(null); // prior completed count (none)
    mockSupa.enqueue({ id: "hb-1" }); // insert .single()
    mockSupa.enqueue(null); // emailed_at update
    enqueueLeaderPack();

    const res = await GET(cronRequest("cron"));
    const body = await res.json();

    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);

    // The inserted handbook: topic stamped, drawn questions + one threshold
    // question + the custom one.
    const insert = mockSupa.inserts[0] as {
      topic_id: string;
      responses: { question_id: string; question: string; answer: string }[];
      variant: string;
    };
    const expectedTopic = getTopicForDate(new Date(MEETING.scheduled_at));
    expect(insert.topic_id).toBe(expectedTopic.id);
    expect(insert.variant).toBe("first_circle");
    expect(insert.responses).toHaveLength(
      HANDBOOK_QUESTION_COUNT + HANDBOOK_THRESHOLD_COUNT + 1
    );
    const drawnIds = insert.responses.slice(0, HANDBOOK_QUESTION_COUNT).map((r) => r.question_id);
    for (const id of drawnIds) {
      expect(expectedTopic.questions.some((q) => q.id === id)).toBe(true);
    }
    // The threshold question rides after the topic draw — it crosses every day.
    const threshold = insert.responses[HANDBOOK_QUESTION_COUNT];
    expect(THRESHOLD_TOPIC.questions.some((q) => q.id === threshold.question_id)).toBe(true);
    // The leader's custom question rides last, verbatim.
    const custom = insert.responses[insert.responses.length - 1];
    expect(custom.question_id).toBe("custom-1");
    expect(custom.question).toBe("What would make your street safer?");
    for (const r of insert.responses) expect(r.answer).toBe("");
  });

  it("emails the member their summons — theme revealed, questions sealed", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    await GET(cronRequest("cron"));

    const memberEmail = sendMock.mock.calls.find((c) => c[0].to === "miriam@example.com")?.[0];
    expect(memberEmail).toBeDefined();
    expect(memberEmail.subject).toBe("The lot has fallen");
    expect(memberEmail.html).toContain("SEE WHAT WAS DRAWN");
    expect(memberEmail.html).toContain(`/dashboard/handbook/${MEETING.id}`);
    // Sealed means sealed: no theme, no questions — not even the leader's
    // custom question — and no join link may appear in the email.
    expect(memberEmail.html).not.toContain(
      getTopicForDate(new Date(MEETING.scheduled_at)).name.replace(/&/g, "&amp;")
    );
    expect(memberEmail.html).not.toContain("What would make your street safer?");
    expect(memberEmail.html).not.toContain("zoom.us");
  });

  it("sends the leader their summons with roster, charge and room link", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.leaderPacks).toBe(1);

    const leaderEmail = sendMock.mock.calls.find((c) => c[0].to === "leah@example.com")?.[0];
    expect(leaderEmail).toBeDefined();
    expect(leaderEmail.html).toContain("The room is yours to keep.");
    expect(leaderEmail.html).toContain("1 soul is expected"); // the count, never the names
    expect(leaderEmail.html).not.toContain("Miriam");
    expect(leaderEmail.html).toContain(
      `/dashboard/shepherd/${MEETING.circle_id}/meetings/${MEETING.id}`
    );

    // The meeting is stamped so the pack never sends twice.
    const stamp = mockSupa.updates.find(
      (u) => typeof u === "object" && u !== null && "leader_pack_sent_at" in u
    );
    expect(stamp).toBeDefined();
  });

  it("never emails a member who already has a handbook for the meeting", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([{ meeting_id: MEETING.id, profile_id: "u1" }]); // existing
    enqueueLeaderPack([], []);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips the leader pack entirely when it was already sent", async () => {
    mockSupa.enqueue([{ ...MEETING, leader_pack_sent_at: "2026-01-01T00:00:00Z" }]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.leaderPacks).toBe(0);
    expect(sendMock).toHaveBeenCalledTimes(1); // member only
    const stamp = mockSupa.updates.find(
      (u) => typeof u === "object" && u !== null && "leader_pack_sent_at" in u
    );
    expect(stamp).toBeUndefined();
  });

  it("uses the returning variant for members with a completed handbook in the circle", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]); // existing
    mockSupa.results.push({ data: null, error: null, count: 2 } as never); // prior completed
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(1);
    const insert = mockSupa.inserts[0] as { variant: string };
    expect(insert.variant).toBe("returning");
    const memberEmail = sendMock.mock.calls.find((c) => c[0].to === "miriam@example.com")?.[0];
    expect(memberEmail.subject).toContain("the lot has fallen");
    expect(memberEmail.html).toContain("The draw");
  });

  it("never carries the join link, even for digital meetings — the way in lives behind sign-in", async () => {
    const digital = {
      ...MEETING,
      meeting_type: "digital",
      join_url: "https://zoom.us/j/abc123",
      location_name: null,
    };
    mockSupa.enqueue([digital]);
    mockSupa.enqueue([]);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    await GET(cronRequest("cron"));
    expect(sendMock).toHaveBeenCalledTimes(2); // member + leader
    for (const call of sendMock.mock.calls) {
      expect(call[0].html).not.toContain("zoom.us");
      expect(call[0].html).not.toContain("abc123");
    }
  });

  it("never leaks the join link for in-person meetings", async () => {
    mockSupa.enqueue([{ ...MEETING, join_url: "https://zoom.us/j/shouldnothide" }]);
    mockSupa.enqueue([]);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    await GET(cronRequest("cron"));
    for (const call of sendMock.mock.calls) {
      expect(call[0].html).not.toContain("shouldnothide");
    }
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
    enqueueLeaderPack([], []);

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
    enqueueLeaderPack([], []);

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
