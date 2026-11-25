import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { rateLimit, rateLimitResponse, limiters } from "@/lib/rate-limit";
import { sendSequenceStep } from "@/lib/marketing/drip";
import {
  SUPPRESSED_LEAD_STATUSES,
  marketingDailyBudget,
  startOfUtcDay,
  windowCapacity,
} from "@/lib/marketing/pace";
import { captureMonitoringMessage } from "@/lib/monitor";

// Paced drip pass. Fires at each send window (vercel.json — 9:30am, 12:30pm,
// 3:30pm, 6:30pm Sydney). Each run sends at most one window's worth
// (dailyBudget ÷ windows) AND never more than today's remaining budget, so
// marketing never exhausts the Resend daily quota or starves transactional
// mail. Queued day-0 sequences (bulk campaigns) and day-7/day-14 follow-ups
// are both picked up here, oldest slot first.
export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "marketing-drip", limiters.cron());
  if (!limit.ok) return rateLimitResponse(limit);

  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Daily budget: how many marketing emails already went out today (UTC)?
  const { data: sentToday } = await supabase
    .from("marketing_sends")
    .select("id")
    .gte("created_at", startOfUtcDay(new Date()).toISOString())
    .eq("status", "sent");
  const remainingToday = marketingDailyBudget() - (sentToday?.length ?? 0);
  const cap = Math.max(0, Math.min(windowCapacity(), remainingToday));

  if (cap === 0) {
    return NextResponse.json({
      due: 0, sent: 0, failed: 0, completed: 0, errors: [],
      budgetExhausted: true, remainingBudget: 0,
    });
  }

  const { data: due, error: dueError } = await supabase
    .from("marketing_sequences")
    .select("*")
    .eq("status", "active")
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(cap);

  if (dueError) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  // Suppression guard: a lead marked bounced / replied / engaged must never
  // receive another automated email — stop those ladders outright.
  let dueList = due ?? [];
  let suppressedStopped = 0;
  if (dueList.length > 0) {
    const emails = dueList.map((s) => s.recipient_email.toLowerCase());
    const { data: suppressed } = await supabase
      .from("marketing_leads")
      .select("email")
      .in("email", emails)
      .in("status", [...SUPPRESSED_LEAD_STATUSES]);
    if (suppressed && suppressed.length > 0) {
      const bad = new Set(suppressed.map((r) => r.email.toLowerCase()));
      const stopIds = dueList
        .filter((s) => bad.has(s.recipient_email.toLowerCase()))
        .map((s) => s.id);
      if (stopIds.length > 0) {
        await supabase
          .from("marketing_sequences")
          .update({ status: "stopped_suppressed", stopped_at: now })
          .in("id", stopIds);
        suppressedStopped = stopIds.length;
        dueList = dueList.filter((s) => !bad.has(s.recipient_email.toLowerCase()));
      }
    }
  }

  const results = {
    sent: 0,
    failed: 0,
    completed: 0,
    errors: [] as string[],
    suppressedStopped,
    remainingBudget: remainingToday,
  };

  for (const sequence of dueList) {
    try {
      const outcome = await sendSequenceStep(supabase, sequence);
      if (outcome.sent) results.sent += 1;
      else results.failed += 1;
      if (outcome.step >= 3) results.completed += 1;
    } catch (err) {
      results.errors.push(
        `${sequence.recipient_email}: ${err instanceof Error ? err.message : "unknown"}`
      );
    }
  }

  if (results.failed > 0) {
    captureMonitoringMessage("marketing drip sends failed", { failed: results.failed });
  }

  return NextResponse.json({ due: (due ?? []).length, ...results });
}
