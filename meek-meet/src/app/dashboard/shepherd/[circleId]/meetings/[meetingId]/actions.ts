"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/validation";
import type { HandbookQuestion, HandbookVariant } from "@/lib/handbook";

export interface LeaderRoomMember {
  rsvpId: string;
  userId: string;
  name: string;
  status: string;
  attendance: "attended" | "absent" | null;
  handbook: {
    variant: HandbookVariant;
    completed: boolean;
    responses: HandbookQuestion[];
    intentions: string | null;
  } | null;
}

export interface LeaderRoomData {
  meeting: {
    id: string;
    circle_id: string;
    circle_name: string;
    scheduled_at: string;
    location_name: string | null;
    location_address: string | null;
    meeting_type: string | null;
    join_url: string | null;
    notes: string | null;
  };
  roster: LeaderRoomMember[];
}

async function requireLeader(circleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [{ data: leaderRow }, { data: profile }] = await Promise.all([
    supabase
      .from("circle_shepherds")
      .select("circle_id")
      .eq("circle_id", circleId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  if (!leaderRow && profile?.role !== "admin") {
    throw new Error("Only the circle's leader can open the leader room");
  }
  return supabase;
}

/**
 * Everything the leader needs for the night: the meeting, the roster with
 * each member's attendance and handbook (RLS lets leaders read handbooks in
 * their circles — that is how the session is led).
 */
export async function getLeaderRoomData(
  circleId: string,
  meetingId: string
): Promise<LeaderRoomData> {
  if (!isValidUuid(circleId)) throw new Error("Invalid circle ID");
  if (!isValidUuid(meetingId)) throw new Error("Invalid meeting ID");
  const supabase = await requireLeader(circleId);

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, circle_id, scheduled_at, location_name, location_address, meeting_type, join_url, notes, circles(name)")
    .eq("id", meetingId)
    .eq("circle_id", circleId)
    .single();

  if (meetingError || !meeting) throw new Error("Meeting not found");

  const circleRel = meeting.circles;
  const circleName = Array.isArray(circleRel)
    ? circleRel[0]?.name
    : (circleRel as { name: string | null } | null)?.name;

  const { data: rsvps, error: rsvpError } = await supabase
    .from("rsvps")
    .select("id, user_id, status, attendance, profiles(full_name)")
    .eq("meeting_id", meetingId)
    .in("status", ["going", "maybe"])
    .order("created_at", { ascending: true });

  if (rsvpError) throw new Error(rsvpError.message);

  const { data: handbooks } = await supabase
    .from("session_handbooks")
    .select("profile_id, variant, completed_at, responses, intentions")
    .eq("meeting_id", meetingId);

  const handbookByProfile = new Map(
    (handbooks ?? []).map((h) => [h.profile_id as string, h])
  );

  const roster: LeaderRoomMember[] = (rsvps ?? []).map((r) => {
    const profileRel = r.profiles;
    const name =
      (Array.isArray(profileRel)
        ? profileRel[0]?.full_name
        : (profileRel as { full_name: string | null } | null)?.full_name) ?? "A member";
    const hb = handbookByProfile.get(r.user_id as string);
    return {
      rsvpId: r.id as string,
      userId: r.user_id as string,
      name,
      status: r.status as string,
      attendance: (r.attendance as "attended" | "absent" | null) ?? null,
      handbook: hb
        ? {
            variant: hb.variant as HandbookVariant,
            completed: hb.completed_at !== null,
            responses: (hb.responses ?? []) as HandbookQuestion[],
            intentions: (hb.intentions as string | null) ?? null,
          }
        : null,
    };
  });

  return {
    meeting: {
      id: meeting.id as string,
      circle_id: meeting.circle_id as string,
      circle_name: circleName ?? "Your circle",
      scheduled_at: meeting.scheduled_at as string,
      location_name: (meeting.location_name as string | null) ?? null,
      location_address: (meeting.location_address as string | null) ?? null,
      meeting_type: (meeting.meeting_type as string | null) ?? null,
      join_url: (meeting.join_url as string | null) ?? null,
      notes: (meeting.notes as string | null) ?? null,
    },
    roster,
  };
}

/**
 * Mark one RSVP attended / absent (or clear with null). The write goes
 * through the mark_attendance RPC — the only path allowed to touch these
 * columns — which re-verifies leadership in the database.
 */
export async function markRsvpAttendance(
  rsvpId: string,
  attendance: "attended" | "absent" | null
): Promise<void> {
  if (!isValidUuid(rsvpId)) throw new Error("Invalid RSVP ID");
  if (attendance !== null && attendance !== "attended" && attendance !== "absent") {
    throw new Error("Invalid attendance value");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("mark_attendance", {
    p_rsvp_id: rsvpId,
    p_attendance: attendance,
  });

  if (error) throw new Error(error.message);
}
