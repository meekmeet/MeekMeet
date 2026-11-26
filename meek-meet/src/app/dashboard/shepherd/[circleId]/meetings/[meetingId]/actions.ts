"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { isValidUuid, assertOptionalString, isValidUrl } from "@/lib/validation";
import { buildJoinDetailsEmail, type HandbookQuestion } from "@/lib/handbook";
import type { HandbookVariant } from "@/lib/handbook";

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
    access_id: string | null;
    access_code: string | null;
    notes: string | null;
  };
  circle: {
    name: string;
    description: string | null;
    location: string | null;
    meeting_place: string | null;
    meeting_address: string | null;
    image_url: string | null;
    zoom_room_url: string | null;
  };
  roster: LeaderRoomMember[];
  counts: {
    reserved: number;
    maybe: number;
    sealed: number;
    firstCircle: number;
  };
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
  return { supabase, user };
}

/**
 * Everything the leader needs for the night: the meeting, the circle, the
 * roster with each member's attendance and handbook (RLS lets leaders read
 * handbooks in their circles — that is how the session is led).
 */
export async function getLeaderRoomData(
  circleId: string,
  meetingId: string
): Promise<LeaderRoomData> {
  if (!isValidUuid(circleId)) throw new Error("Invalid circle ID");
  if (!isValidUuid(meetingId)) throw new Error("Invalid meeting ID");
  const { supabase } = await requireLeader(circleId);

  const [{ data: meeting, error: meetingError }, { data: circle }] =
    await Promise.all([
      supabase
        .from("meetings")
        .select("id, circle_id, scheduled_at, location_name, location_address, meeting_type, join_url, access_id, access_code, notes, circles(name)")
        .eq("id", meetingId)
        .eq("circle_id", circleId)
        .single(),
      supabase
        .from("circles")
        .select("name, description, location, meeting_place, meeting_address, image_url, zoom_room_url")
        .eq("id", circleId)
        .single(),
    ]);

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
        : (profileRel as { full_name: string | null } | null)?.full_name) ??
      "A member";
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
      access_id: (meeting.access_id as string | null) ?? null,
      access_code: (meeting.access_code as string | null) ?? null,
      notes: (meeting.notes as string | null) ?? null,
    },
    circle: {
      name: (circle?.name as string | null) ?? circleName ?? "Your circle",
      description: (circle?.description as string | null) ?? null,
      location: (circle?.location as string | null) ?? null,
      meeting_place: (circle?.meeting_place as string | null) ?? null,
      meeting_address: (circle?.meeting_address as string | null) ?? null,
      image_url: (circle?.image_url as string | null) ?? null,
      zoom_room_url: (circle?.zoom_room_url as string | null) ?? null,
    },
    roster,
    counts: {
      reserved: roster.filter((m) => m.status === "going").length,
      maybe: roster.filter((m) => m.status === "maybe").length,
      sealed: roster.filter((m) => m.handbook?.completed).length,
      firstCircle: roster.filter((m) => m.handbook?.variant === "first_circle")
        .length,
    },
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

/** The way in: join link, meeting ID, passcode. Blank fields clear. */
export interface MeetingAccessInput {
  joinUrl: string;
  accessId: string;
  accessCode: string;
}

async function requireMeetingLeader(meetingId: string) {
  if (!isValidUuid(meetingId)) throw new Error("Invalid meeting ID");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("id, circle_id")
    .eq("id", meetingId)
    .single();
  if (error || !meeting) throw new Error("Meeting not found");

  const { data: leaderRow } = await supabase
    .from("circle_shepherds")
    .select("circle_id")
    .eq("circle_id", meeting.circle_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!leaderRow) throw new Error("Only the circle's leader can change the way in");

  return { supabase, meeting };
}

/**
 * Set (or clear) the way in for an online meeting. Saving is quiet — the
 * `notifyMembersOfJoinDetails` action carries the details to every reserved
 * member when the leader chooses.
 */
export async function updateMeetingAccess(
  meetingId: string,
  input: MeetingAccessInput
): Promise<void> {
  const { supabase, meeting } = await requireMeetingLeader(meetingId);

  const joinUrl = (assertOptionalString(input.joinUrl, "Join URL", 500) ?? "").trim();
  const accessId = (assertOptionalString(input.accessId, "Meeting ID", 100) ?? "").trim();
  const accessCode = (assertOptionalString(input.accessCode, "Passcode", 100) ?? "").trim();

  if (joinUrl && !isValidUrl(joinUrl)) {
    throw new Error("Join URL must be a valid URL");
  }

  const { error } = await supabase
    .from("meetings")
    .update({
      join_url: joinUrl || null,
      access_id: accessId || null,
      access_code: accessCode || null,
    })
    .eq("id", meetingId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shepherd/${meeting.circle_id}/meetings/${meetingId}`);
}

/**
 * Send the way in to every reserved member ("going" RSVPs). The join link
 * must be set first; the meeting ID and passcode ride along when present.
 */
export async function notifyMembersOfJoinDetails(
  meetingId: string
): Promise<{ notified: number }> {
  const { supabase, meeting } = await requireMeetingLeader(meetingId);

  const { data: meetingRow } = await supabase
    .from("meetings")
    .select("scheduled_at, meeting_type, location_name, join_url, access_id, access_code, circles(name)")
    .eq("id", meetingId)
    .single();
  if (!meetingRow?.join_url) {
    throw new Error("Set the way in first — a join link is required.");
  }

  const circleRel = meetingRow.circles;
  const circleName = Array.isArray(circleRel)
    ? circleRel[0]?.name
    : (circleRel as { name: string | null } | null)?.name;

  const { data: rsvps, error: rsvpError } = await supabase
    .from("rsvps")
    .select("user_id, profiles(email, full_name)")
    .eq("meeting_id", meetingId)
    .eq("status", "going");

  if (rsvpError) throw new Error(rsvpError.message);

  let notified = 0;
  for (const r of (rsvps ?? []) as {
    user_id: string;
    profiles?: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
  }[]) {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const email = profile?.email?.trim();
    if (!email) continue;

    const { subject, html } = buildJoinDetailsEmail({
      recipientName: profile?.full_name ?? "Friend",
      circleName: circleName ?? "Your circle",
      scheduledAt: meetingRow.scheduled_at as string,
      meetingType: meetingRow.meeting_type as string | null,
      locationName: meetingRow.location_name as string | null,
      joinUrl: meetingRow.join_url,
      accessId: (meetingRow.access_id as string | null) ?? null,
      accessCode: (meetingRow.access_code as string | null) ?? null,
      handbookUrl: `https://meekmeet.com/dashboard/handbook/${meetingId}`,
    });

    try {
      await getResend().emails.send({
        from: "Meek Meet <hello@meekmeet.com>",
        to: email,
        subject,
        html,
      });
      notified++;
    } catch (err) {
      console.error(`Join-details email failed for ${r.user_id}:`, err);
    }
  }

  revalidatePath(`/dashboard/shepherd/${meeting.circle_id}/meetings/${meetingId}`);
  return { notified };
}
