import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";
import { getTopicById, getTopicForDate, THRESHOLD_TOPIC } from "@meekmeet/core/questions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import {
  getMyHandbook,
  saveHandbook,
  regenerateHandbookQuestion,
} from "./actions";

const mockSupa = new MockSupabaseClient();
const USER = makeAuthUser();

const MEETING_ID = "11111111-1111-1111-1111-111111111111";
const TOPIC = getTopicById("home-and-street")!;

function topicResponses(ids: string[]) {
  return ids.map((id) => {
    const q = TOPIC.questions.find((t) => t.id === id)!;
    return { question_id: q.id, question: q.text, answer: "" };
  });
}

function handbookRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "hb-1",
    circle_id: "c1",
    topic_id: TOPIC.id,
    responses: topicResponses(["hom-1", "hom-2", "hom-3"]),
    meetings: { scheduled_at: "2026-12-01T09:00:00.000Z" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.updates.length = 0;
  mockSupa.inserts.length = 0;
  mockSupa.asUser(USER);
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("getMyHandbook", () => {
  function enqueueFullRow(meetingOverrides: Record<string, unknown> = {}) {
    mockSupa.enqueue({
      id: "hb-1",
      meeting_id: MEETING_ID,
      variant: "returning",
      topic_id: TOPIC.id,
      responses: topicResponses(["hom-1"]),
      intentions: null,
      completed_at: null,
      meetings: {
        scheduled_at: "2026-12-01T09:00:00.000Z",
        location_name: "Hall",
        meeting_type: "in_person",
        join_url: null,
        circles: { name: "Gosford Circle" },
        ...meetingOverrides,
      },
    });
  }

  it("returns the member's handbook with topic and circle name", async () => {
    enqueueFullRow();
    const data = await getMyHandbook(MEETING_ID);
    expect(data.topic_id).toBe(TOPIC.id);
    expect(data.meeting.circle_name).toBe("Gosford Circle");
    expect(data.variant).toBe("returning");
  });

  it("exposes the join link for digital meetings", async () => {
    enqueueFullRow({ meeting_type: "digital", join_url: "https://zoom.us/j/1" });
    const data = await getMyHandbook(MEETING_ID);
    expect(data.meeting.join_url).toBe("https://zoom.us/j/1");
  });

  it("exposes the join link for hybrid meetings", async () => {
    enqueueFullRow({ meeting_type: "hybrid", join_url: "https://meet.google.com/x" });
    const data = await getMyHandbook(MEETING_ID);
    expect(data.meeting.join_url).toBe("https://meet.google.com/x");
  });

  it("never exposes a join link on in-person meetings", async () => {
    enqueueFullRow({ meeting_type: "in_person", join_url: "https://zoom.us/j/leak" });
    const data = await getMyHandbook(MEETING_ID);
    expect(data.meeting.join_url).toBeNull();
  });

  it("throws when there is no handbook", async () => {
    mockSupa.enqueue(null, { message: "no rows" });
    await expect(getMyHandbook(MEETING_ID)).rejects.toThrow("No handbook found");
  });

  it("rejects unauthenticated callers", async () => {
    mockSupa.asUser(null);
    await expect(getMyHandbook(MEETING_ID)).rejects.toThrow("Not authenticated");
  });
});

describe("saveHandbook", () => {
  it("refuses to complete with unanswered questions", async () => {
    await expect(
      saveHandbook(MEETING_ID, topicResponses(["hom-1"]), "", true)
    ).rejects.toThrow("Answer every question");
  });

  it("saves a completed handbook when every question is answered", async () => {
    mockSupa.enqueue(null); // update
    const answered = topicResponses(["hom-1"]).map((r) => ({ ...r, answer: "Something true" }));
    const result = await saveHandbook(MEETING_ID, answered, "carry this", true);
    expect(result.completed).toBe(true);
    const update = mockSupa.updates[0] as { completed_at: string | null; intentions: string };
    expect(update.completed_at).not.toBeNull();
    expect(update.intentions).toBe("carry this");
  });

  it("refuses every write once the handbook has sealed", async () => {
    mockSupa.enqueue({ scheduled_at: "2020-01-01T09:00:00.000Z" }); // meetings select
    mockSupa.enqueue({ scheduled_at: "2020-01-01T09:00:00.000Z" }); // meetings select, second call
    const answered = topicResponses(["hom-1"]).map((r) => ({ ...r, answer: "Too late" }));
    await expect(
      saveHandbook(MEETING_ID, answered, "", true)
    ).rejects.toThrow("sealed");
    await expect(
      saveHandbook(MEETING_ID, topicResponses(["hom-1"]), "", false)
    ).rejects.toThrow("sealed");
    expect(mockSupa.updates).toHaveLength(0); // nothing was written
  });

  it("writes freely while the seal is still ahead", async () => {
    mockSupa.enqueue({ scheduled_at: "2999-01-01T09:00:00.000Z" }); // meetings select
    mockSupa.enqueue(null); // update
    const answered = topicResponses(["hom-1"]).map((r) => ({ ...r, answer: "In time" }));
    const result = await saveHandbook(MEETING_ID, answered, "", true);
    expect(result.completed).toBe(true);
    expect(mockSupa.updates).toHaveLength(1);
  });
});

describe("regenerateHandbookQuestion — the redraw engine", () => {
  it("replaces the question with a different one from the same topic and logs the swap", async () => {
    mockSupa.enqueue(handbookRow()); // load
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue(null); // update responses
    mockSupa.enqueue(null); // insert swap log

    const result = await regenerateHandbookQuestion(MEETING_ID, "hom-2");

    expect(result.responses).toHaveLength(3);
    const replaced = result.responses[1];
    expect(replaced.question_id).not.toBe("hom-2");
    expect(replaced.question_id).not.toBe("hom-1"); // not one already in play
    expect(replaced.question_id).not.toBe("hom-3");
    expect(TOPIC.questions.some((q) => q.id === replaced.question_id)).toBe(true);
    expect(replaced.answer).toBe(""); // a fresh question starts unwritten
    // Untouched slots keep their questions.
    expect(result.responses[0].question_id).toBe("hom-1");
    expect(result.responses[2].question_id).toBe("hom-3");

    // The self-assortment record.
    const swap = mockSupa.inserts[0] as Record<string, unknown>;
    expect(swap.old_question_id).toBe("hom-2");
    expect(swap.new_question_id).toBe(replaced.question_id);
    expect(swap.topic_id).toBe(TOPIC.id);
    expect(swap.slot).toBe(1);
    expect(swap.handbook_id).toBe("hb-1");
    expect(swap.profile_id).toBe(USER.id);
  });

  it("preserves the member's other written answers through a redraw", async () => {
    const answered = topicResponses(["hom-1", "hom-2", "hom-3"]);
    answered[0].answer = "My answer about home.";
    answered[2].answer = "My answer about the street.";
    mockSupa.enqueue(handbookRow({ responses: answered }));
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    const result = await regenerateHandbookQuestion(MEETING_ID, "hom-2");
    expect(result.responses[0].answer).toBe("My answer about home.");
    expect(result.responses[2].answer).toBe("My answer about the street.");
  });

  it("refuses to redraw a question that is not in the handbook", async () => {
    mockSupa.enqueue(handbookRow());
    await expect(
      regenerateHandbookQuestion(MEETING_ID, "hom-9")
    ).rejects.toThrow("not in your handbook");
  });

  it("redraws a threshold question within the threshold bank, logged as such", async () => {
    const thr = THRESHOLD_TOPIC.questions[0];
    mockSupa.enqueue(
      handbookRow({
        responses: [
          ...topicResponses(["hom-1", "hom-2"]),
          { question_id: thr.id, question: thr.text, answer: "" },
        ],
      })
    );
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue(null); // update
    mockSupa.enqueue(null); // swap log

    const result = await regenerateHandbookQuestion(MEETING_ID, thr.id);
    const replaced = result.responses[2];
    expect(replaced.question_id).not.toBe(thr.id);
    expect(THRESHOLD_TOPIC.questions.some((q) => q.id === replaced.question_id)).toBe(true);
    const swap = mockSupa.inserts[0] as { topic_id: string; old_question_id: string };
    expect(swap.topic_id).toBe("the-threshold");
    expect(swap.old_question_id).toBe(thr.id);
  });

  it("refuses to redraw a leader-set custom question", async () => {
    mockSupa.enqueue(
      handbookRow({
        responses: [
          ...topicResponses(["hom-1", "hom-2"]),
          { question_id: "custom-1", question: "A leader's own question?", answer: "" },
        ],
      })
    );
    await expect(
      regenerateHandbookQuestion(MEETING_ID, "custom-1")
    ).rejects.toThrow("set by your leader");
  });

  it("refuses when every question in the theme is already in play", async () => {
    mockSupa.enqueue(handbookRow({ responses: topicResponses(TOPIC.questions.map((q) => q.id)) }));
    await expect(
      regenerateHandbookQuestion(MEETING_ID, "hom-1")
    ).rejects.toThrow("already in your handbook");
  });

  it("falls back to the meeting's local day when no topic was stamped", async () => {
    const scheduledAt = "2026-12-05T09:00:00.000Z"; // Saturday in Sydney
    const fallbackTopic = getTopicForDate(new Date(scheduledAt));
    const responses = fallbackTopic.questions.slice(0, 3).map((q) => ({
      question_id: q.id,
      question: q.text,
      answer: "",
    }));
    mockSupa.enqueue(handbookRow({ topic_id: null, responses, meetings: { scheduled_at: scheduledAt } }));
    mockSupa.enqueue([]); // question history (never-twice)
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    const result = await regenerateHandbookQuestion(MEETING_ID, responses[0].question_id);
    expect(fallbackTopic.questions.some((q) => q.id === result.responses[0].question_id)).toBe(true);
    const swap = mockSupa.inserts[0] as { topic_id: string };
    expect(swap.topic_id).toBe(fallbackTopic.id);
  });

  it("prefers a question the member has never been dealt, across all past handbooks", async () => {
    // The handbook holds hom-1..3; the member has already seen every other
    // topic question except hom-21 in past circles.
    const seenElsewhere = TOPIC.questions
      .filter((q) => !["hom-1", "hom-2", "hom-3", "hom-21"].includes(q.id))
      .map((q) => ({ question_id: q.id, question: q.text, answer: "seen" }));
    mockSupa.enqueue(handbookRow()); // load
    mockSupa.enqueue([{ responses: seenElsewhere }]); // history
    mockSupa.enqueue(null); // update
    mockSupa.enqueue(null); // swap log

    const result = await regenerateHandbookQuestion(MEETING_ID, "hom-2");
    expect(result.responses[1].question_id).toBe("hom-21");
  });

  it("falls back to the seen pool only when every fresh question is exhausted", async () => {
    // Every pool question has been seen before — the cycle turns over, but
    // the redraw still never returns a question already in THIS handbook.
    const seenElsewhere = TOPIC.questions
      .filter((q) => !["hom-1", "hom-2", "hom-3"].includes(q.id))
      .map((q) => ({ question_id: q.id, question: q.text, answer: "seen" }));
    mockSupa.enqueue(handbookRow()); // load
    mockSupa.enqueue([{ responses: seenElsewhere }]); // history
    mockSupa.enqueue(null); // update
    mockSupa.enqueue(null); // swap log

    const result = await regenerateHandbookQuestion(MEETING_ID, "hom-2");
    const replaced = result.responses[1];
    expect(replaced.question_id).not.toBe("hom-1");
    expect(replaced.question_id).not.toBe("hom-2");
    expect(replaced.question_id).not.toBe("hom-3");
    expect(TOPIC.questions.some((q) => q.id === replaced.question_id)).toBe(true);
  });

  it("refuses to redraw once the handbook has sealed", async () => {
    mockSupa.enqueue(
      handbookRow({ meetings: { scheduled_at: "2020-01-01T09:00:00.000Z" } })
    );
    await expect(
      regenerateHandbookQuestion(MEETING_ID, "hom-2")
    ).rejects.toThrow("sealed");
    expect(mockSupa.updates).toHaveLength(0);
    expect(mockSupa.inserts).toHaveLength(0);
  });

  it("rejects unauthenticated callers", async () => {
    mockSupa.asUser(null);
    await expect(
      regenerateHandbookQuestion(MEETING_ID, "hom-1")
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when there is no handbook to redraw from", async () => {
    mockSupa.enqueue(null, { message: "no rows" });
    await expect(
      regenerateHandbookQuestion(MEETING_ID, "hom-1")
    ).rejects.toThrow("No handbook found");
  });
});
