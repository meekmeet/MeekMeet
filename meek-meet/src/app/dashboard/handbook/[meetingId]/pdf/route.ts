import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/validation";
import { buildHandbookPdf } from "@/lib/handbook-pdf";
import { HANDBOOK_INTROS, type HandbookQuestion, type HandbookVariant } from "@/lib/handbook";
import { getTopicById } from "@meekmeet/core/questions";

// GET /dashboard/handbook/[meetingId]/pdf
// The member's own handbook as a downloadable PDF — every question in order
// with their written answer. RLS scopes the read to the member's own row, so
// nobody can pull another member's handbook through this route.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  if (!isValidUuid(meetingId)) {
    return NextResponse.json({ error: "Invalid meeting ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("session_handbooks")
    .select(
      "variant, topic_id, responses, intentions, meetings(scheduled_at, location_name, circles(name)), profiles(full_name)"
    )
    .eq("meeting_id", meetingId)
    .eq("profile_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "No handbook found for this meeting" }, { status: 404 });
  }

  const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  const circleRel = meeting?.circles;
  const circleName =
    (Array.isArray(circleRel) ? circleRel[0]?.name : (circleRel as { name: string | null } | null)?.name) ??
    "Your circle";
  const profileRel = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const memberName =
    (profileRel as { full_name: string | null } | null)?.full_name?.trim() || "A member of the circle";

  const variant = row.variant as HandbookVariant;
  const topic = row.topic_id ? getTopicById(row.topic_id as string) : null;

  const pdf = await buildHandbookPdf({
    memberName,
    circleName,
    scheduledAt: meeting?.scheduled_at as string,
    locationName: (meeting?.location_name as string | null) ?? null,
    variant,
    topicName: topic?.name ?? null,
    topicEpithet: topic?.epithet ?? null,
    introTitle: HANDBOOK_INTROS[variant].title,
    responses: (row.responses ?? []) as HandbookQuestion[],
    intentions: (row.intentions as string | null) ?? null,
  });

  const dateStamp = new Date(meeting?.scheduled_at as string).toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="meek-meet-handbook-${dateStamp}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
