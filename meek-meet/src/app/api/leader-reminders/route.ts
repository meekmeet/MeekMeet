import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/resend";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { rateLimit, rateLimitResponse, limiters } from "@/lib/rate-limit";
import { buildLeaderReminderEmail } from "@/lib/handbook";

// The leader's countdown: one short letter at sixty, thirty, and fifteen
// minutes before each circle — counts, the way in when it exists, the door.
//
// Designed for an external scheduler hitting this route every 15 minutes
// (Vercel Hobby cron is daily-only; see CRON_SETUP.md). Each (meeting,
// leader, step) is written to the meeting_leader_reminders ledger BEFORE the
// send and rolled back if the send fails, so a re-run or a drifted schedule
// can never double a reminder.

const STEPS = [60, 30, 15] as const;
/** Half-window around each step, in minutes — matches the 15-min cadence. */
const HALF_WINDOW_MINUTES = 8;

interface ProfileRel {
  email: string | null;
  full_name: string | null;
}

interface LeaderRow {
  user_id: string;
  profiles?: ProfileRel | ProfileRel[] | null;
}

interface MeetingRow {
  id: string;
  circle_id: string;
  scheduled_at: string;
  meeting_type: string | null;
  location_name: string | null;
  join_url: string | null;
  access_id: string | null;
  access_code: string | null;
  circles?: { name: string | null } | { name: string | null }[] | null;
}

function first<T>(rel: T | T[] | null | undefined): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : (rel ?? null);
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "leader-reminders", limiters.cron());
  if (!limit.ok) return rateLimitResponse(limit);

  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const step of STEPS) {
    const windowStart = new Date(now + (step - HALF_WINDOW_MINUTES) * 60_000);
    const windowEnd = new Date(now + (step + HALF_WINDOW_MINUTES) * 60_000);

    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select(
        "id, circle_id, scheduled_at, meeting_type, location_name, join_url, access_id, access_code, circles(name)"
      )
      .gte("scheduled_at", windowStart.toISOString())
      .lt("scheduled_at", windowEnd.toISOString())
      .eq("is_cancelled", false)
      .eq("status", "scheduled");

    if (meetingsError) {
      return NextResponse.json({ error: meetingsError.message }, { status: 500 });
    }

    for (const meeting of (meetings ?? []) as MeetingRow[]) {
      const circleName = first(meeting.circles)?.name ?? "Your circle";

      const [{ data: leaders }, { count: expectedCount }, { count: sealedCount }, { data: ledger }] =
        await Promise.all([
          supabase
            .from("circle_shepherds")
            .select("user_id, profiles(email, full_name)")
            .eq("circle_id", meeting.circle_id),
          supabase
            .from("rsvps")
            .select("id", { count: "exact", head: true })
            .eq("meeting_id", meeting.id)
            .eq("status", "going"),
          supabase
            .from("session_handbooks")
            .select("id", { count: "exact", head: true })
            .eq("meeting_id", meeting.id)
            .not("completed_at", "is", null),
          supabase
            .from("meeting_leader_reminders")
            .select("user_id, step")
            .eq("meeting_id", meeting.id),
        ]);

      const ledgerKeys = new Set(
        (ledger ?? []).map((r) => `${r.user_id}:${r.step}`)
      );

      for (const leader of (leaders ?? []) as LeaderRow[]) {
        if (ledgerKeys.has(`${leader.user_id}:${step}`)) {
          skipped++;
          continue;
        }
        const profile = first(leader.profiles);
        const email = profile?.email?.trim();
        if (!email) continue;

        // Claim the slot before sending; roll back on failure.
        const { error: ledgerError } = await supabase
          .from("meeting_leader_reminders")
          .insert({
            meeting_id: meeting.id,
            user_id: leader.user_id,
            step,
          });
        if (ledgerError) {
          // A concurrent run claimed it — or the table is missing. Either
          // way, do not send.
          skipped++;
          continue;
        }

        const { subject, html } = buildLeaderReminderEmail({
          leaderName: profile?.full_name ?? "Leader",
          circleName,
          scheduledAt: meeting.scheduled_at,
          meetingType: meeting.meeting_type,
          locationName: meeting.location_name,
          minutes: step,
          expectedCount: expectedCount ?? 0,
          sealedCount: sealedCount ?? 0,
          joinUrl: meeting.join_url,
          accessId: meeting.access_id,
          accessCode: meeting.access_code,
          leaderRoomUrl: `https://meekmeet.com/dashboard/shepherd/${meeting.circle_id}/meetings/${meeting.id}`,
        });

        try {
          await getResend().emails.send({
            from: "Meek Meet <hello@meekmeet.com>",
            to: email,
            subject,
            html,
          });
          sent++;
        } catch (err) {
          console.error(`Leader reminder failed for ${leader.user_id}:`, err);
          await supabase
            .from("meeting_leader_reminders")
            .delete()
            .eq("meeting_id", meeting.id)
            .eq("user_id", leader.user_id)
            .eq("step", step);
          failed++;
        }
      }
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
