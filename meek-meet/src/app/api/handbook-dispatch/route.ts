import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/resend";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { rateLimit, rateLimitResponse, limiters } from "@/lib/rate-limit";
import {
  HANDBOOK_LEAD_DAYS,
  buildHandbookEmail,
  buildHandbookQuestions,
  buildLeaderPackEmail,
  drawHandbookQuestions,
  drawThresholdQuestions,
  handbookVariant,
} from "@/lib/handbook";
import { getTopicForDate, type CircleTopic } from "@meekmeet/core/questions";

// Sends each reserved member their session handbook four days before the
// meeting — and the leader their run sheet. Runs daily; the
// (meeting_id, profile_id) unique constraint, emailed_at, and
// leader_pack_sent_at make re-runs idempotent. Runs with the service role
// to read across RLS.
//
// The questions are never fixed: each member draws their own set at random
// from the day's circle topic (one theme per weekday, shared by every
// circle in the country that day). Any questions the leader added to the
// meeting by hand are appended after the drawn ones, fixed and unswappable.

interface ProfileRel {
  email: string | null;
  full_name: string | null;
}

interface RsvpRel {
  user_id: string;
  status: string;
  profiles?: ProfileRel | ProfileRel[] | null;
}

interface MeetingRow {
  id: string;
  circle_id: string;
  scheduled_at: string;
  leader_pack_sent_at: string | null;
  circles?: { name: string | null } | { name: string | null }[] | null;
  rsvps?: RsvpRel[] | null;
}

interface MeetingQuestionRow {
  meeting_id: string;
  question_id: string;
  content: string;
  order_index: number | null;
}

function first<T>(rel: T | T[] | null | undefined): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : (rel ?? null);
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "handbook-dispatch", limiters.cron());
  if (!limit.ok) return rateLimitResponse(limit);

  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() + HANDBOOK_LEAD_DAYS);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);

  const { data: meetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("id, circle_id, scheduled_at, leader_pack_sent_at, circles(name), rsvps(user_id, status, profiles(email, full_name))")
    .gte("scheduled_at", windowStart.toISOString())
    .lt("scheduled_at", windowEnd.toISOString())
    .eq("is_cancelled", false)
    .eq("status", "scheduled");

  if (meetingsError) {
    return NextResponse.json({ error: meetingsError.message }, { status: 500 });
  }
  if (!meetings || meetings.length === 0) {
    return NextResponse.json({ sent: 0, leaderPacks: 0, meetings: 0, message: "No meetings in the handbook window" });
  }

  const meetingIds = (meetings as MeetingRow[]).map((m) => m.id);

  // Leader-added custom questions ride along after the drawn ones.
  const { data: questionRows } = await supabase
    .from("meeting_questions")
    .select("meeting_id, question_id, content, order_index")
    .in("meeting_id", meetingIds)
    .order("order_index", { ascending: true });

  const customByMeeting = new Map<string, MeetingQuestionRow[]>();
  for (const q of (questionRows ?? []) as MeetingQuestionRow[]) {
    const list = customByMeeting.get(q.meeting_id) ?? [];
    list.push(q);
    customByMeeting.set(q.meeting_id, list);
  }

  // Existing handbooks in this batch — never email the same member twice.
  const { data: existingRows } = await supabase
    .from("session_handbooks")
    .select("meeting_id, profile_id")
    .in("meeting_id", meetingIds);
  const existing = new Set(
    ((existingRows ?? []) as { meeting_id: string; profile_id: string }[]).map(
      (r) => `${r.meeting_id}:${r.profile_id}`
    )
  );

  let sent = 0;
  let leaderPacks = 0;
  let failed = 0;

  for (const meeting of meetings as MeetingRow[]) {
    const circleName = first(meeting.circles)?.name ?? "Your circle";
    // The theme follows the local day of the gathering, not UTC.
    const topic: CircleTopic = getTopicForDate(new Date(meeting.scheduled_at));
    const customQuestions = buildHandbookQuestions(
      (customByMeeting.get(meeting.id) ?? []).map((q) => ({
        question_id: q.question_id,
        content: q.content,
      }))
    );
    const goingRsvps = (meeting.rsvps ?? []).filter((r) => r.status === "going");

    for (const rsvp of goingRsvps) {
      if (existing.has(`${meeting.id}:${rsvp.user_id}`)) continue;
      const profile = first(rsvp.profiles);
      const email = profile?.email?.trim();
      if (!email) continue;

      // Variant: has this member completed a handbook in this circle before?
      const { count } = await supabase
        .from("session_handbooks")
        .select("id", { count: "exact", head: true })
        .eq("circle_id", meeting.circle_id)
        .eq("profile_id", rsvp.user_id)
        .not("completed_at", "is", null);
      const variant = handbookVariant(count ?? 0);

      // The member's own draw: the day's theme, then one threshold question
      // that crosses every day, then any leader-set custom questions.
      const drawn = drawHandbookQuestions(topic);
      const threshold = drawThresholdQuestions();
      const questions = [...drawn, ...threshold, ...customQuestions];

      const { data: inserted, error: insertError } = await supabase
        .from("session_handbooks")
        .insert({
          meeting_id: meeting.id,
          circle_id: meeting.circle_id,
          profile_id: rsvp.user_id,
          variant,
          topic_id: topic.id,
          responses: questions,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error(`Handbook insert failed for ${rsvp.user_id}:`, insertError);
        failed++;
        continue;
      }

      const { subject, html } = buildHandbookEmail({
        recipientName: profile?.full_name ?? "Friend",
        circleName,
        scheduledAt: meeting.scheduled_at,
        variant,
        handbookUrl: `https://meekmeet.com/dashboard/handbook/${meeting.id}`,
      });

      try {
        await getResend().emails.send({
          from: "Meek Meet <hello@meekmeet.com>",
          to: email,
          subject,
          html,
        });
        await supabase
          .from("session_handbooks")
          .update({ emailed_at: new Date().toISOString() })
          .eq("id", inserted.id);
        sent++;
      } catch (err) {
        console.error(`Handbook email failed for ${rsvp.user_id}:`, err);
        failed++;
      }
    }

    // ── The leader pack: run sheet, roster, opening/closing words ──
    if (!meeting.leader_pack_sent_at) {
      try {
        const { data: leaders } = await supabase
          .from("circle_shepherds")
          .select("user_id, profiles(email, full_name)")
          .eq("circle_id", meeting.circle_id);

        const { data: rosterRows } = await supabase
          .from("session_handbooks")
          .select("profile_id")
          .eq("meeting_id", meeting.id);

        const expectedCount = (rosterRows ?? []).length;

        for (const leader of (leaders ?? []) as { user_id: string; profiles?: ProfileRel | ProfileRel[] | null }[]) {
          const leaderProfile = first(leader.profiles);
          const leaderEmail = leaderProfile?.email?.trim();
          if (!leaderEmail) continue;

          const pack = buildLeaderPackEmail({
            leaderName: leaderProfile?.full_name ?? "Leader",
            circleName,
            scheduledAt: meeting.scheduled_at,
            expectedCount,
            leaderRoomUrl: `https://meekmeet.com/dashboard/shepherd/${meeting.circle_id}/meetings/${meeting.id}`,
          });

          await getResend().emails.send({
            from: "Meek Meet <hello@meekmeet.com>",
            to: leaderEmail,
            subject: pack.subject,
            html: pack.html,
          });
          leaderPacks++;
        }

        await supabase
          .from("meetings")
          .update({ leader_pack_sent_at: new Date().toISOString() })
          .eq("id", meeting.id);
      } catch (err) {
        console.error(`Leader pack failed for meeting ${meeting.id}:`, err);
        failed++;
      }
    }
  }

  return NextResponse.json({ sent, leaderPacks, failed, meetings: meetings.length });
}
