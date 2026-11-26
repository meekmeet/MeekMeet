"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  isValidUuid,
  assertNonEmptyString,
  assertOptionalString,
  isValidUrl,
} from "@/lib/validation";

async function verifyShepherd(circleId: string) {
  if (!isValidUuid(circleId)) throw new Error("Invalid circle ID");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: shepherdRecord } = await supabase
    .from("circle_shepherds")
    .select("id, role")
    .eq("circle_id", circleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!shepherdRecord) {
    throw new Error("You are not the shepherd of this circle");
  }

  return { supabase, isLead: shepherdRecord.role === "lead" };
}

// Leaders do not write the questions. The questions are drawn by lot from
// the day's theme (see packages/core) and cross the deficit gate; the
// structure belongs to the platform, the room belongs to the leader. There
// is no question or routine editing here by design.

// ========== MEETINGS ==========


export async function createMeeting(
  circleId: string,
  scheduledAt: string,
  durationMinutes: number,
  locationName: string,
  locationAddress: string,
  notes: string,
  meetingType: "in_person" | "digital" | "hybrid" = "in_person",
  joinUrl?: string
) {
  const { supabase } = await verifyShepherd(circleId);

  const safeScheduledAt = assertNonEmptyString(scheduledAt, "Scheduled date", 50);
  const scheduledDate = new Date(safeScheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new Error("Invalid scheduled date");
  }

  const safeDuration =
    typeof durationMinutes === "number" && durationMinutes > 0 && durationMinutes <= 1440
      ? durationMinutes
      : 120;
  const safeLocationName = assertOptionalString(locationName, "Location name", 200);
  const safeLocationAddress = assertOptionalString(locationAddress, "Location address", 500);
  const safeNotes = assertOptionalString(notes, "Notes", 5000);
  const safeMeetingType = ["in_person", "digital", "hybrid"].includes(meetingType)
    ? meetingType
    : "in_person";
  let safeJoinUrl = joinUrl && joinUrl.trim() ? assertOptionalString(joinUrl, "Join URL", 500) : null;

  // Digital meetings fall back to the circle's standing room, so a circle
  // with a configured room always has a door to walk through.
  if (safeMeetingType === "digital" && !safeJoinUrl) {
    const { data: circleRoom } = await supabase
      .from("circles")
      .select("zoom_room_url")
      .eq("id", circleId)
      .single();
    if (circleRoom?.zoom_room_url) {
      safeJoinUrl = circleRoom.zoom_room_url;
    }
  }

  const { error } = await supabase.from("meetings").insert({
    circle_id: circleId,
    scheduled_at: safeScheduledAt,
    duration_minutes: safeDuration,
    location_name: safeLocationName,
    location_address: safeLocationAddress,
    notes: safeNotes,
    meeting_type: safeMeetingType,
    join_url: safeJoinUrl,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shepherd/${circleId}/meetings`);
  revalidatePath(`/circles/[slug]`);
}

export async function cancelMeeting(id: string) {
  if (!isValidUuid(id)) throw new Error("Invalid meeting ID");

  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("circle_id")
    .eq("id", id)
    .single();

  if (!meeting) throw new Error("Meeting not found");
  await verifyShepherd(meeting.circle_id);

  const { error } = await supabase
    .from("meetings")
    .update({ is_cancelled: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shepherd/${meeting.circle_id}/meetings`);
  revalidatePath(`/circles/[slug]`);
}

export async function deleteMeeting(id: string) {
  if (!isValidUuid(id)) throw new Error("Invalid meeting ID");

  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("circle_id")
    .eq("id", id)
    .single();

  if (!meeting) throw new Error("Meeting not found");
  await verifyShepherd(meeting.circle_id);

  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shepherd/${meeting.circle_id}/meetings`);
  revalidatePath(`/circles/[slug]`);
}

// ========== CIRCLE SETTINGS ==========

export async function updateCircle(
  circleId: string,
  data: {
    name: string;
    description: string;
    location: string;
    meetingPlace: string;
    meetingAddress: string;
    imageUrl: string;
    zoomRoomUrl?: string;
  }
) {
  const { supabase } = await verifyShepherd(circleId);

  const safeName = assertNonEmptyString(data.name, "Name", 200);
  const safeDescription = assertOptionalString(data.description, "Description", 5000);
  const safeLocation = assertNonEmptyString(data.location, "Location", 200);
  const safeMeetingPlace = assertOptionalString(data.meetingPlace, "Meeting place", 200);
  const safeMeetingAddress = assertOptionalString(data.meetingAddress, "Meeting address", 500);

  let safeImageUrl: string | null = null;
  if (data.imageUrl && data.imageUrl.trim()) {
    if (!isValidUrl(data.imageUrl.trim())) {
      throw new Error("Image URL must be a valid URL");
    }
    safeImageUrl = data.imageUrl.trim();
  }

  // The standing room: validated when present, cleared when blanked out.
  let safeZoomRoomUrl: string | null = null;
  if (data.zoomRoomUrl && data.zoomRoomUrl.trim()) {
    if (!isValidUrl(data.zoomRoomUrl.trim())) {
      throw new Error("Room URL must be a valid URL");
    }
    safeZoomRoomUrl = data.zoomRoomUrl.trim();
  }

  const { error } = await supabase
    .from("circles")
    .update({
      name: safeName,
      description: safeDescription,
      location: safeLocation,
      meeting_place: safeMeetingPlace,
      meeting_address: safeMeetingAddress,
      image_url: safeImageUrl,
      zoom_room_url: safeZoomRoomUrl,
    })
    .eq("id", circleId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shepherd/${circleId}/settings`);
  revalidatePath(`/circles/[slug]`);
}
