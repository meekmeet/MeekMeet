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
    mockSupa.enqueue([]); // question history (never-twice)
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

  it("never deals a member a question they have already been given", async () => {
    const expectedTopic = getTopicForDate(new Date(MEETING.scheduled_at));
    // The member has already seen 18 of this topic's 21 questions.
    const seen = expectedTopic.questions.slice(0, 18);
    const unseen = new Set(expectedTopic.questions.slice(18).map((q) => q.id));

    mockSupa.enqueue([MEETING]); // meetings
    mockSupa.enqueue(QUESTIONS); // meeting_questions
    mockSupa.enqueue([]); // existing handbooks
    mockSupa.enqueue(null); // prior completed count
    mockSupa.enqueue([{ responses: seen.map((q) => ({ question_id: q.id, question: q.text, answer: "x" })) }]); // history
    mockSupa.enqueue({ id: "hb-1" }); // insert .single()
    mockSupa.enqueue(null); // emailed_at update
    enqueueLeaderPack();

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(1);

    const insert = mockSupa.inserts[0] as {
      responses: { question_id: string }[];
    };
    const drawnIds = insert.responses.slice(0, HANDBOOK_QUESTION_COUNT).map((r) => r.question_id);
    expect(drawnIds).toHaveLength(HANDBOOK_QUESTION_COUNT);
    for (const id of drawnIds) {
      expect(unseen.has(id), `drawn ${id} was already dealt`).toBe(true);
    }
  });

  it("emails the member their summons — theme revealed, questions sealed", async () => {
    mockSupa.enqueue([MEETING]);
    mockSupa.enqueue(QUESTIONS);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    await GET(cronRequest("cron"));

    const memberEmail = sendMock.mock.calls.find((c) => c[0].to === "miriam@example.com")?.[0];
    expect(memberEmail).toBeDefined();
    expect(memberEmail.subject).toContain("Gosford Circle");
    expect(memberEmail.html).toContain("ENTER YOUR HANDBOOK");
    expect(memberEmail.html).toContain(`/dashboard/handbook/${MEETING.id}`);
    expect(memberEmail.html).toContain("You are the first name down"); // 1 going RSVP
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
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.leaderPacks).toBe(1);

    const leaderEmail = sendMock.mock.calls.find((c) => c[0].to === "leah@example.com")?.[0];
    expect(leaderEmail).toBeDefined();
    expect(leaderEmail.html).toContain("You hold the order. You read last.");
    expect(leaderEmail.html).toContain("1 reserved"); // the count, never the names
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
    mockSupa.enqueue([]); // question history (never-twice)
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
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue({ id: "hb-1" });
    mockSupa.enqueue(null);
    enqueueLeaderPack();

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(1);
    const insert = mockSupa.inserts[0] as { variant: string };
    expect(insert.variant).toBe("returning");
    const memberEmail = sendMock.mock.calls.find((c) => c[0].to === "miriam@example.com")?.[0];
    expect(memberEmail.subject).toContain("Gosford Circle");
    expect(memberEmail.html).toContain("The summons");
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
    mockSupa.enqueue([]); // question history (never-twice)
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
    mockSupa.enqueue([]); // question history (never-twice)
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
    mockSupa.enqueue([]); // question history (never-twice)
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

describe("GET /api/handbook-dispatch — the daily reminder", () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

  const PENDING = {
    id: "hb-9",
    meeting_id: MEETING.id,
    responses: [
      { question_id: "q1", question: "What do you carry?", answer: "" },
      { question_id: "q2", question: "What would you change?", answer: "Something" },
    ],
    emailed_at: hoursAgo(30),
    last_reminder_at: null,
    meetings: {
      scheduled_at: inFourDays(),
      meeting_type: "digital",
      location_name: null,
      circles: { name: "Gosford Circle" },
    },
    profiles: { email: "miriam@example.com", full_name: "Miriam" },
  };

  it("reminds an unanswered handbook once the summons is over 20h old — even with no meetings in the window", async () => {
    mockSupa.enqueue([]); // no meetings in the dispatch window
    mockSupa.enqueue([PENDING]); // the reminder scan
    mockSupa.enqueue(null); // last_reminder_at stamp

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.meetings).toBe(0);
    expect(body.reminders).toBe(1);

    const email = sendMock.mock.calls.find((c) => c[0].to === "miriam@example.com")?.[0];
    expect(email).toBeDefined();
    expect(email.subject).toContain("Gosford Circle");
    expect(email.html).toContain("still unanswered");
    expect(email.html).toContain("COMPLETE YOUR HANDBOOK");
    expect(email.html).toContain(`/dashboard/handbook/${MEETING.id}`);
    expect(email.html).toContain("returns each day until your handbook is complete");
    expect(email.html).not.toContain("zoom.us");

    const stamp = mockSupa.updates.find(
      (u) => typeof u === "object" && u !== null && "last_reminder_at" in u
    );
    expect(stamp).toBeDefined();
  });

  it("does not remind twice inside the interval", async () => {
    mockSupa.enqueue([]);
    mockSupa.enqueue([{ ...PENDING, last_reminder_at: hoursAgo(5) }]);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.reminders).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("reminds again the next day, and keeps returning until complete", async () => {
    mockSupa.enqueue([]);
    mockSupa.enqueue([{ ...PENDING, last_reminder_at: hoursAgo(26) }]);
    mockSupa.enqueue(null);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.reminders).toBe(1);
  });

  it("never reminds a handbook whose answers are all written, even if completed_at lags", async () => {
    mockSupa.enqueue([]);
    mockSupa.enqueue([
      {
        ...PENDING,
        responses: [
          { question_id: "q1", question: "What do you carry?", answer: "A question" },
          { question_id: "q2", question: "What would you change?", answer: "Something" },
        ],
      },
    ]);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.reminders).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("never reminds a member with no email address", async () => {
    mockSupa.enqueue([]);
    mockSupa.enqueue([{ ...PENDING, profiles: { email: null, full_name: "No Mail" } }]);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.reminders).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("counts a failed reminder without aborting the run", async () => {
    mockSupa.enqueue([]);
    mockSupa.enqueue([PENDING]);
    sendMock.mockRejectedValueOnce(new Error("resend down"));

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.reminders).toBe(0);
    expect(body.failed).toBe(1);
  });

  it("sends the summons and the reminders in the same run", async () => {
    mockSupa.enqueue([MEETING]); // meetings
    mockSupa.enqueue(QUESTIONS); // meeting_questions
    mockSupa.enqueue([]); // existing handbooks
    mockSupa.enqueue(null); // prior completed count
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue({ id: "hb-1" }); // insert
    mockSupa.enqueue(null); // emailed_at stamp
    enqueueLeaderPack();
    mockSupa.enqueue([PENDING]); // reminder scan
    mockSupa.enqueue(null); // last_reminder_at stamp

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.leaderPacks).toBe(1);
    expect(body.reminders).toBe(1);
  });
});
