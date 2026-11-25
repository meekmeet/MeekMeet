"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUuid, assertNonEmptyString } from "@/lib/validation";
import { handbookComplete, type HandbookQuestion } from "@/lib/handbook";
import { drawQuestions, getTopicById, getTopicForDate } from "@meekmeet/core/questions";

const MAX_ANSWER_LENGTH = 4000;
const MAX_INTENTIONS_LENGTH = 2000;
const MAX_QUESTIONS = 20;

export interface HandbookData {
  id: string;
  meeting_id: string;
  variant: "first_circle" | "returning";
  topic_id: string | null;
  responses: HandbookQuestion[];
  intentions: string | null;
  completed_at: string | null;
  meeting: {
    scheduled_at: string;
    location_name: string | null;
    circle_name: string;
    /** Personal join link — present only for digital/hybrid meetings. */
    join_url: string | null;
  };
}

/** The signed-in member's own handbook for a meeting (RLS scopes the row). */
export async function getMyHandbook(meetingId: string): Promise<HandbookData> {
  if (!isValidUuid(meetingId)) throw new Error("Invalid meeting ID");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: row, error } = await supabase
    .from("session_handbooks")
    .select(
      "id, meeting_id, variant, topic_id, responses, intentions, completed_at, meetings(scheduled_at, location_name, meeting_type, join_url, circles(name))"
    )
    .eq("meeting_id", meetingId)
    .eq("profile_id", user.id)
    .single();

  if (error || !row) throw new Error("No handbook found for this meeting");

  const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  const circleRel = meeting?.circles;
  const circleName = Array.isArray(circleRel)
    ? circleRel[0]?.name
    : (circleRel as { name: string | null } | null)?.name;

  const meetingType = meeting?.meeting_type as string | null;
  const joinUrl =
    meetingType === "digital" || meetingType === "hybrid"
      ? ((meeting?.join_url as string | null) ?? null)
      : null;

  return {
    id: row.id as string,
    meeting_id: row.meeting_id as string,
    variant: row.variant as "first_circle" | "returning",
    topic_id: (row.topic_id as string | null) ?? null,
    responses: (row.responses ?? []) as HandbookQuestion[],
    intentions: (row.intentions as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    meeting: {
      scheduled_at: meeting?.scheduled_at as string,
      location_name: (meeting?.location_name as string | null) ?? null,
      circle_name: circleName ?? "Your circle",
      join_url: joinUrl,
    },
  };
}

/**
 * Save the member's written answers. `complete: true` marks the handbook
 * finished — only allowed once every question carries a written answer.
 * Members can always return and revise before the circle gathers.
 */
export async function saveHandbook(
  meetingId: string,
  responses: HandbookQuestion[],
  intentions: string,
  complete: boolean
): Promise<{ completed: boolean }> {
  if (!isValidUuid(meetingId)) throw new Error("Invalid meeting ID");
  if (!Array.isArray(responses) || responses.length > MAX_QUESTIONS) {
    throw new Error("Invalid responses");
  }
  for (const r of responses) {
    assertNonEmptyString(r.question_id, "question id");
    if (typeof r.answer !== "string" || r.answer.length > MAX_ANSWER_LENGTH) {
      throw new Error("An answer is too long");
    }
  }
  if (intentions.length > MAX_INTENTIONS_LENGTH) {
    throw new Error("Intentions are too long");
  }
  if (complete && !handbookComplete(responses)) {
    throw new Error("Answer every question before completing your handbook");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("session_handbooks")
    .update({
      responses,
      intentions: intentions.trim() || null,
      completed_at: complete ? new Date().toISOString() : null,
    })
    .eq("meeting_id", meetingId)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
  return { completed: complete };
}

/**
 * Redraw one question of the member's handbook: the question is replaced by
 * a random different question from the SAME circle topic, and the swap is
 * logged — which questions members keep, and which they send back, is data
 * the platform listens to. Leader-added custom questions (not from the topic
 * bank) cannot be redrawn.
 */
export async function regenerateHandbookQuestion(
  meetingId: string,
  questionId: string
): Promise<{ responses: HandbookQuestion[]; swapped: { from: string; to: string } }> {
  if (!isValidUuid(meetingId)) throw new Error("Invalid meeting ID");
  assertNonEmptyString(questionId, "question id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: row, error } = await supabase
    .from("session_handbooks")
    .select("id, circle_id, topic_id, responses, meetings(scheduled_at)")
    .eq("meeting_id", meetingId)
    .eq("profile_id", user.id)
    .single();

  if (error || !row) throw new Error("No handbook found for this meeting");

  const responses = (row.responses ?? []) as HandbookQuestion[];
  const slot = responses.findIndex((r) => r.question_id === questionId);
  if (slot === -1) throw new Error("That question is not in your handbook");

  // The topic stored at dispatch; fall back to the meeting's local day.
  const meetingRel = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  const topic =
    (row.topic_id ? getTopicById(row.topic_id as string) : null) ??
    getTopicForDate(new Date(meetingRel?.scheduled_at as string));

  const current = responses[slot];
  const inBank = topic.questions.some((q) => q.id === current.question_id);
  if (!inBank) {
    throw new Error("This question was set by your leader and cannot be redrawn");
  }

  const [replacement] = drawQuestions(topic, 1, {
    excludeIds: responses.map((r) => r.question_id),
  });
  if (!replacement) {
    throw new Error("Every question in this theme is already in your handbook");
  }

  const next = responses.map((r, i) =>
    i === slot ? { question_id: replacement.id, question: replacement.text, answer: "" } : r
  );

  const { error: updateError } = await supabase
    .from("session_handbooks")
    .update({ responses: next })
    .eq("id", row.id as string)
    .eq("profile_id", user.id);

  if (updateError) throw new Error(updateError.message);

  // The self-assortment record. A failed log must not lose the member's
  // redraw — the update above already landed — so log-and-continue.
  const { error: swapError } = await supabase
    .from("handbook_question_swaps")
    .insert({
      handbook_id: row.id,
      meeting_id: meetingId,
      circle_id: row.circle_id,
      profile_id: user.id,
      topic_id: topic.id,
      slot,
      old_question_id: current.question_id,
      old_question: current.question,
      new_question_id: replacement.id,
      new_question: replacement.text,
    });
  if (swapError) console.error("Failed to log handbook question swap:", swapError);

  return {
    responses: next,
    swapped: { from: current.question, to: replacement.text },
  };
}
