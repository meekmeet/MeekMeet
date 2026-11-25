"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUuid, assertNonEmptyString } from "@/lib/validation";
import { handbookComplete, type HandbookQuestion } from "@/lib/handbook";

const MAX_ANSWER_LENGTH = 4000;
const MAX_INTENTIONS_LENGTH = 2000;
const MAX_QUESTIONS = 20;

export interface HandbookData {
  id: string;
  meeting_id: string;
  variant: "first_circle" | "returning";
  responses: HandbookQuestion[];
  intentions: string | null;
  completed_at: string | null;
  meeting: {
    scheduled_at: string;
    location_name: string | null;
    circle_name: string;
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
      "id, meeting_id, variant, responses, intentions, completed_at, meetings(scheduled_at, location_name, circles(name))"
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

  return {
    id: row.id as string,
    meeting_id: row.meeting_id as string,
    variant: row.variant as "first_circle" | "returning",
    responses: (row.responses ?? []) as HandbookQuestion[],
    intentions: (row.intentions as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    meeting: {
      scheduled_at: meeting?.scheduled_at as string,
      location_name: (meeting?.location_name as string | null) ?? null,
      circle_name: circleName ?? "Your circle",
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
