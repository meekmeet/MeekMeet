// Marketing send pacing: a small daily budget (Resend free tier is ~100
// emails/day and transactional mail must fit inside it too), spread across
// four send windows so a 300-lead campaign goes out as a respectful trickle
// — ~20 emails at 9:30am, 12:30pm, 3:30pm and 6:30pm Sydney time — instead
// of a single 300-email burst that would exhaust the daily quota, starve
// customer email, and look like a spam flood to receiving providers.
//
// Queued sends are just marketing_sequences rows: status "active",
// current_step 0, next_run_at set to an assigned slot. The existing
// /api/marketing-drip cron picks them up when due — no separate queue table.
//
// Window times are fixed UTC (Vercel cron runs in UTC), chronological
// within the day. They map to 12:30pm, 3:30pm, 6:30pm and 9:30am the
// following morning in Sydney winter (AEST); during daylight saving the
// local times shift one hour later, still reasonable.
const WINDOW_UTC: readonly (readonly [number, number])[] = [
  [2, 30], // 12:30pm AEST
  [5, 30], // 3:30pm AEST
  [8, 30], // 6:30pm AEST
  [23, 30], // 9:30am AEST the following day
];

const DEFAULT_DAILY_BUDGET = 80; // leaves ~20/day of the Resend free tier for transactional mail

export function marketingDailyBudget(): number {
  const raw = process.env.MARKETING_DAILY_BUDGET;
  if (!raw) return DEFAULT_DAILY_BUDGET;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_BUDGET;
}

/** Max sends per cron window — the daily budget split across the windows. */
export function windowCapacity(budget: number = marketingDailyBudget()): number {
  return Math.max(1, Math.round(budget / WINDOW_UTC.length));
}

/** Midnight UTC for "how many marketing emails have gone out today". */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Assign `count` send slots, filling each window up to its capacity before
 * moving to the next. `alreadyQueued` slots are reserved for sequences that
 * were queued earlier, so a second bulk run never double-books a window.
 */
export function computeSendSlots(
  now: Date,
  alreadyQueued: number,
  count: number,
  budget: number = marketingDailyBudget()
): Date[] {
  const capacity = windowCapacity(budget);
  const needed = alreadyQueued + count;
  const slots: Date[] = [];
  const daysNeeded = Math.ceil(needed / capacity) + 1;
  for (let d = 0; d < daysNeeded && slots.length < needed; d++) {
    for (const [h, m] of WINDOW_UTC) {
      const t = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d, h, m)
      );
      // Every window contributes `capacity` slots: the cron fires each window
      // once and sends up to that many due sequences in one run.
      if (t.getTime() > now.getTime()) {
        for (let k = 0; k < capacity && slots.length < needed; k++) slots.push(t);
      }
    }
  }
  return slots.slice(alreadyQueued, alreadyQueued + count);
}

/** Human-readable window list for admin notices. */
export const WINDOW_LABEL = "9:30am, 12:30pm, 3:30pm and 6:30pm (Sydney time)";

/** Lead statuses that must never receive another automated email. */
export const SUPPRESSED_LEAD_STATUSES = ["bounced", "replied", "engaged"] as const;

/**
 * After a drip has sent anything (step ≥ 1), the same address must not
 * receive another ladder until this many days have passed — "straight after"
 * re-drips are how senders get reported. One-off sends remain available for
 * a deliberate, human-chosen re-send.
 */
export const DRIP_COOLDOWN_DAYS = 14;

export function dripCooldownCutoff(now: Date = new Date()): number {
  return now.getTime() - DRIP_COOLDOWN_DAYS * 24 * 3600 * 1000;
}
