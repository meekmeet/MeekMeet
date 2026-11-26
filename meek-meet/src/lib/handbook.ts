// The session handbook — the whole circle, pre-answered.
//
// Four days before a meeting, every member with a 'going' RSVP receives
// their SUMMONS: not the session, not even the theme — only the call. The
// questions are drawn and sealed; the theme, the place, the way in — all of
// it opens behind the member's sign-in. The email itself carries almost
// nothing, because almost nothing is what makes it powerful: a date, a seal,
// and a door.
//
// The questions are never fixed: each member draws their own set at random
// from the day's circle topic (see packages/core circle-topics — one theme
// per weekday, shared by every circle in the country that day), plus one
// threshold question that crosses every day, and may redraw any question
// that doesn't fit. Every redraw is logged, so the platform learns which
// questions people answer and which they skip.
//
// In the room, nobody is put on the spot — each member reads what they have
// already thought through, the leader holds the order (never the clock: the
// circle runs until everyone is heard), and the completed handbooks become
// the data the platform synthesises into anonymised reports.

import { escapeHtml } from "@/lib/validation";
import { themed, EMAIL_THEMES, SANCTUM_LOGO_URL } from "@/lib/emails/shell";
import {
  drawQuestions,
  THRESHOLD_TOPIC,
  type CircleTopic,
  type CircleTopicQuestion,
} from "@meekmeet/core/questions";

export const HANDBOOK_LEAD_DAYS = 4;

/** Questions drawn per member from the day's topic bank. */
export const HANDBOOK_QUESTION_COUNT = 3;

/**
 * Threshold questions drawn per member — one question that crosses every
 * day and every topic: the standing appointment with what carries us forward.
 */
export const HANDBOOK_THRESHOLD_COUNT = 1;

export type HandbookVariant = "first_circle" | "returning";

export interface HandbookQuestion {
  question_id: string;
  question: string;
  answer: string;
}

/** First handbook in this circle → the newcomer variant; otherwise returning. */
export function handbookVariant(priorCompletedInCircle: number): HandbookVariant {
  return priorCompletedInCircle > 0 ? "returning" : "first_circle";
}

/** The introduction section of the form, per variant. */
export const HANDBOOK_INTROS: Record<HandbookVariant, { title: string; guidance: string }> = {
  first_circle: {
    title: "Your introduction",
    guidance:
      "This is your first circle, so the circle begins with you. Write a short introduction — your name, where you are on the street, and one thing you hope this circle becomes. You will read it aloud when the leader invites you; writing it now means you never have to find the words on the spot.",
  },
  returning: {
    title: "Your check-in",
    guidance:
      "The circle knows your name — keep it modest. Your name, your passions, and one honest sentence about what has happened for you since the last circle: something that moved, something that stuck, something you are still carrying. You'll read it when the leader opens the circle.",
  },
};

/** Snapshot a list of drawn questions into a member's form (answers empty). */
export function buildHandbookQuestions(
  questions: { question_id: string; content: string }[]
): HandbookQuestion[] {
  return questions.map((q) => ({
    question_id: q.question_id,
    question: q.content,
    answer: "",
  }));
}

/**
 * Draw `count` questions from a bank, never repeating anything in
 * `excludeIds` (the member's history) — unless the bank is exhausted, in
 * which case the cycle begins again. Even then, no question repeats within
 * the same draw. This is the never-twice guarantee: with 21 questions per
 * theme and 3 drawn a week, a member sees seven weeks of fresh questions
 * before the well ever turns over.
 */
function drawWithRecycling(
  bank: CircleTopic,
  count: number,
  excludeIds: string[]
): CircleTopicQuestion[] {
  const fresh = drawQuestions(bank, count, { excludeIds });
  if (fresh.length >= count) return fresh;
  const refill = drawQuestions(bank, count - fresh.length, {
    excludeIds: fresh.map((q) => q.id),
  });
  return [...fresh, ...refill];
}

/**
 * Draw a member's questions from the day's topic. `excludeIds` carries the
 * member's full question history (every past handbook + redraw) so no
 * member is ever dealt the same question twice while fresh ones remain.
 */
export function drawHandbookQuestions(
  topic: CircleTopic,
  count: number = HANDBOOK_QUESTION_COUNT,
  excludeIds: string[] = []
): HandbookQuestion[] {
  return buildHandbookQuestions(
    drawWithRecycling(topic, count, excludeIds).map((q: CircleTopicQuestion) => ({
      question_id: q.id,
      content: q.text,
    }))
  );
}

/** Draw the member's threshold question(s) — the bank that crosses every day. */
export function drawThresholdQuestions(
  count: number = HANDBOOK_THRESHOLD_COUNT,
  excludeIds: string[] = []
): HandbookQuestion[] {
  return drawHandbookQuestions(THRESHOLD_TOPIC, count, excludeIds);
}

/** A handbook is complete when every question carries a written answer. */
export function handbookComplete(responses: HandbookQuestion[]): boolean {
  return (
    responses.length > 0 &&
    responses.every((r) => r.answer.trim().length > 0)
  );
}

/** The short ceremonial date: "Sunday 6 December · 6:30 pm". */
export function formatMeetingWhen(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const date = d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Sydney",
  });
  const time = d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
  return `${date} · ${time}`;
}

/** The short form for subject lines: "Sun 6 Dec · 6:30 pm". */
export function formatMeetingShort(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const date = d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Australia/Sydney",
  });
  const time = d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
  return `${date} · ${time}`;
}

/**
 * How the circle meets, as a phrase that fits after "meets {date} · ":
 * "online", "at {place}", or both. Null when nothing is known — the
 * sentence simply ends at the date. Every branch is variable-driven so the
 * template scales across every mode without rewriting.
 */
export function meetingModePhrase(
  meetingType: string | null | undefined,
  locationName: string | null | undefined
): string | null {
  const place = locationName?.trim() || null;
  if (meetingType === "digital") return "online";
  if (meetingType === "hybrid") return place ? `at ${place}, and online` : "online";
  return place ? `at ${place}` : null;
}

/** 1 → I, 3 → III, 4 → IV … (used by the handbook and leader room pages). */
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let rest = Math.max(0, Math.floor(n));
  let out = "";
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

// ── The summons chrome ─────────────────────────────────────────
// The email IS the black letter: the whole background is the sacred
// geometry (a hosted PNG; email clients cannot be trusted with SVG or CSS
// gradients), the copy sits directly on its darkened centre. No card, no
// ornaments, and no em dashes anywhere. Every sentence is built from
// variables so it scales to any date, any circle, any mode, at any volume.

/** The Seed of Life emblem (used on the site and in dark contexts). */
export const SANCTUM_EMBLEM_URL = "https://meekmeet.com/sacred/seed-of-life.png";

/** The letter's sky: sparse gold stars on true black. */
export const SANCTUM_SKY_BG_URL = "https://meekmeet.com/sacred/star-sky-bg.png";

/** The moon bearing the Seed of Life, carried as a real image between the
 *  wordmark and the copy so no text ever crosses her face. */
export const SANCTUM_MOON_IMG_URL = "https://meekmeet.com/sacred/moon-seed.png";

/** The black-letter shell: stars behind everything, the moon bearing the
 *  Seed of Life above the copy, the scripture footer closing it. The whole
 *  letter fits on one screen, so nothing is ever collapsed behind "show
 *  quoted text". */
function sanctumShell(options: { preheader: string; contentHtml: string }): string {
  const t = EMAIL_THEMES.sanctum;
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <title>Meek Meet</title>
  </head>
  <body style="margin:0; padding:0; background-color:${t.pageBg};">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${options.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${t.pageBg};">
      <tr>
        <td align="center" bgcolor="${t.pageBg}" background="${SANCTUM_SKY_BG_URL}" style="background-color:${t.pageBg}; background-image:url('${SANCTUM_SKY_BG_URL}'); background-position:center top; background-repeat:no-repeat;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">
            <tr>
              <td align="center" style="padding:28px 40px 8px;">
                <img src="${SANCTUM_LOGO_URL}" alt="Meek Meet" width="42" height="42" style="display:inline-block; border-radius:10px; border:0;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 6px;">
                <span style="font-family:${t.headingFont}; font-size:16px; letter-spacing:0.26em; color:#ece8dc;">MEEK&nbsp;MEET</span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 0 4px;">
                <img src="${SANCTUM_MOON_IMG_URL}" alt="" width="190" style="display:inline-block; width:190px; height:auto; border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0 44px 22px; font-family:${t.bodyFont}; color:${t.ink};">
                ${options.contentHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 30px; font-family:${t.bodyFont}; font-size:11.5px; color:${t.faint}; line-height:2;">
                <em style="font-size:13px; color:${t.accent};">&ldquo;Blessed are the meek, for they shall inherit the earth.&rdquo;</em><br />
                <span style="font-size:10.5px;">The promise has many names: Matthew 5:5 &middot; Psalm 37:11 &middot; Qur&rsquo;an 21:105 &middot; Tao Te Ching 66</span><br />
                <a href="https://meekmeet.com" style="color:${t.muted}; text-decoration:underline;">meekmeet.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/** A short line of body copy. */
function line(text: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `<p style="font-family:${t.bodyFont}; font-size:15px; line-height:1.8; color:${t.muted}; margin:0 0 14px;">${text}</p>`;
}

/** The final small line — the fact that makes it exclusive. */
function signoff(text: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `<p style="font-family:${t.bodyFont}; font-size:12.5px; line-height:1.7; color:${t.faint}; margin:22px 0 0;">${text}</p>`;
}

/**
 * The summons. A standing form — the same words every time, only the
 * variables change: that is what makes it a ritual instead of a newsletter.
 */
export function buildHandbookEmail(options: {
  recipientName: string;
  circleName: string;
  scheduledAt: string;
  meetingType?: string | null;
  locationName?: string | null;
  /** How many are attending this meeting (reserved seats, live count). */
  attendingCount: number;
  handbookUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const name = escapeHtml(options.recipientName || "Friend");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const mode = meetingModePhrase(options.meetingType, options.locationName);

  const attendance =
    options.attendingCount <= 1
      ? "You are the first name down. The way in opens for you alone."
      : `${options.attendingCount} are attending. Your seat is held under your name, and the way in opens for you alone.`;

  const content = `
    ${h.eyebrow("The summons")}
    ${line(`${name},`)}
    ${line(`${circle} meets ${when}${mode ? ` &middot; ${escapeHtml(mode)}` : ""}.`)}
    ${line("Your questions are waiting inside. Answer them before you join. In the circle, you read what you wrote.")}
    ${line("The handbook seals two hours before the circle. After that, the door is closed.")}
    ${h.button(options.handbookUrl, "ENTER YOUR HANDBOOK")}
    ${signoff(attendance)}
  `;

  return {
    subject: `${options.circleName} · ${formatMeetingShort(options.scheduledAt)}`,
    html: sanctumShell({
      preheader: "Your questions are inside. Answer before you join.",
      contentHtml: content,
    }),
  };
}

/** How long after the last touch (summons or reminder) a reminder falls due.
 *  Just under a day, so the daily cron never skips a member through drift. */
export const REMINDER_INTERVAL_HOURS = 20;

// ── The seal ───────────────────────────────────────────────────
// The handbook is not homework; it is the price of the door. Two hours
// before the circle gathers, the handbook seals: a member whose questions
// are still unanswered is not admitted — the circle proceeds without them,
// and the next summons will find them. The seal is enforced three ways:
// the join link never renders for an unsealed handbook, the save actions
// refuse writes after the seal, and the leader's roster names who the
// door closed for.

/** Hours before the circle begins when the handbook seals shut. */
export const HANDBOOK_LOCK_HOURS_BEFORE = 2;

/** The moment the handbook seals for a given meeting start. */
export function handbookSealsAt(scheduledAt: string): Date {
  return new Date(
    new Date(scheduledAt).getTime() - HANDBOOK_LOCK_HOURS_BEFORE * 3_600_000
  );
}

/** True once the handbook has sealed — no more writing, no way in. */
export function isHandbookSealed(scheduledAt: string, now: Date = new Date()): boolean {
  return now.getTime() >= handbookSealsAt(scheduledAt).getTime();
}

/** The door rule in one line, for pages that must say it plainly. */
export const HANDBOOK_SEAL_RULE =
  "The handbook seals two hours before the circle. After that, the door is closed.";

/**
 * The reminder. The summons, returned: shorter, plainer, and honest about
 * its own persistence — it comes back each day until the handbook is
 * complete, then never again.
 */
export function buildHandbookReminderEmail(options: {
  recipientName: string;
  circleName: string;
  scheduledAt: string;
  meetingType?: string | null;
  locationName?: string | null;
  handbookUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const name = escapeHtml(options.recipientName || "Friend");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const mode = meetingModePhrase(options.meetingType, options.locationName);

  const content = `
    ${h.eyebrow("The summons stands")}
    ${line(`${name},`)}
    ${line(`${circle} meets ${when}${mode ? ` &middot; ${escapeHtml(mode)}` : ""}.`)}
    ${line("Your questions are still unanswered. In the circle, you read what you wrote, so write it before you join.")}
    ${line("The handbook seals two hours before the circle. After that, the door is closed.")}
    ${h.button(options.handbookUrl, "COMPLETE YOUR HANDBOOK")}
    ${signoff("This reminder returns each day until your handbook is complete.")}
  `;

  return {
    subject: `${options.circleName} · your handbook is waiting`,
    html: sanctumShell({
      preheader: "Your questions are still unanswered.",
      contentHtml: content,
    }),
  };
}

// ── The leader pack ────────────────────────────────────────────
// The leader's summons: the count, the charge in one breath, the door.
// The roster, the run sheet, the liturgies — all inside the leader room.

/** Read aloud to open the circle, after everyone has arrived. */
export const LEADER_OPENING_WORDS =
  "We gather in the open, every faith and none, under one promise: that the meek shall inherit the earth. Nobody here leads and nobody here follows; we are shepherds to each other and to the street outside. What is said in this circle is read from what each of us has already written. No one will be asked to think on the spot, and no one will be interrupted. Let us begin.";

/** Read aloud to close the circle, after the last member has spoken. */
export const LEADER_CLOSING_WORDS =
  "What was spoken here is carried now: anonymised, gathered with every other circle, and taken to the people with the power to act. You were heard. Go gently, and keep the street. The circle is closed.";

/** The shape of the night, step by step. The leader keeps order, never time.
 *  The structure is strict; the room inside it is alive. */
export const LEADER_RUN_SHEET: { title: string; body: string }[] = [
  {
    title: "Before the night",
    body: "An hour early, walk the way in yourself: open the link, check the meeting ID and passcode, sit in the empty room for a moment. Then read your roster: who is coming, who is new, whose handbook has not sealed. Newcomers are nervous; know their names before they arrive.",
  },
  {
    title: "Open",
    body: "Welcome everyone as they land. Online, greet each by name as they enter the room; in person, at the door. When all are seated, name the day's theme aloud: every circle gathering on this weekday, across the country, is sitting with the same theme tonight. Then read the opening words, slowly.",
  },
  {
    title: "Introductions",
    body: "Each member reads the introduction they wrote in their handbook, in the order they sit. First-circle members read the fuller introduction; returning members keep it to name, passions, and what has happened since the last circle. Nobody comments, nobody jumps in. The circle simply receives each name.",
  },
  {
    title: "The questions",
    body: "Go member by member. Each person reads their own answers in order: the theme questions, then the threshold question. No interruptions, no fixing, no advice unless it is plainly asked for. After each reader, let one breath of silence pass before the next name. You read last.",
  },
  {
    title: "The open floor",
    body: "When the written questions are spent, the structure loosens, not the order. Call on the circle: what is still burning? If a thread deserves the whole room, draw one more question aloud from the night's theme and put it to them. You decide when the circle has said what it came to say.",
  },
  {
    title: "Keep order, never the clock",
    body: "The session has no set time. It runs for as long as it takes for everyone to be heard. Your only job is the order of the room: who is speaking, who is next, and that every voice lands. If one voice is taking the air, thank it and pass the turn.",
  },
  {
    title: "Close",
    body: "Invite one sentence from each person: what are you carrying out of this room? Then read the closing words. Online, wait until each person has left before you do.",
  },
  {
    title: "After",
    body: "Mark who attended and who was absent in your leader room, and carry anything urgent to us through the room: a member in crisis, a decision the circle reached. We organise what the circle said and keep you in the loop of the motion it makes.",
  },
];

/**
 * The leader's summons — the same standing form. Count, role, door. The
 * roster, the run sheet, the liturgies and the way in live behind sign-in.
 */
export function buildLeaderPackEmail(options: {
  leaderName: string;
  circleName: string;
  scheduledAt: string;
  meetingType?: string | null;
  locationName?: string | null;
  expectedCount: number;
  leaderRoomUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const name = escapeHtml(options.leaderName || "Leader");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const mode = meetingModePhrase(options.meetingType, options.locationName);

  const content = `
    ${h.eyebrow("The summons · for the one who keeps the room")}
    ${line(`${name},`)}
    ${line(`${circle} meets ${when}${mode ? ` &middot; ${escapeHtml(mode)}` : ""} &middot; ${options.expectedCount} reserved.`)}
    ${line("Their questions are drawn and answered in writing. You hold the order. You read last. It ends when everyone has been heard.")}
    ${h.button(options.leaderRoomUrl, "OPEN THE LEADER ROOM")}
    ${signoff("The roster, the words, and the way in are inside, under your sign-in alone.")}
  `;

  return {
    subject: `${options.circleName} · ${formatMeetingShort(options.scheduledAt)}`,
    html: sanctumShell({
      preheader: "The draw is done. The roster and the words wait inside.",
      contentHtml: content,
    }),
  };
}

/** One line of the way in, only when the detail exists. */
function accessLine(label: string, value: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `<p style="font-family:${t.bodyFont}; font-size:14.5px; line-height:1.8; color:${t.muted}; margin:0 0 6px;">${label}: <strong style="color:${t.ink}; letter-spacing:0.08em;">${escapeHtml(value)}</strong></p>`;
}

/**
 * The way in, sent to every reserved member when the leader sets or changes
 * the room details. The sanctum rules hold: near-empty, one door, nothing
 * forwardable that the circle would not say aloud.
 */
export function buildJoinDetailsEmail(options: {
  recipientName: string;
  circleName: string;
  scheduledAt: string;
  meetingType?: string | null;
  locationName?: string | null;
  joinUrl: string;
  accessId?: string | null;
  accessCode?: string | null;
  handbookUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const name = escapeHtml(options.recipientName || "Friend");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const mode = meetingModePhrase(options.meetingType, options.locationName);

  const content = `
    ${h.eyebrow("The way in")}
    ${line(`${name},`)}
    ${line(`${circle} meets ${when}${mode ? ` &middot; ${escapeHtml(mode)}` : ""}.`)}
    ${line("The way in is set. Keep these details to yourself and the circle: the door opens for the reserved alone.")}
    ${h.button(options.joinUrl, "OPEN THE ROOM")}
    ${options.accessId ? accessLine("Meeting ID", options.accessId) : ""}
    ${options.accessCode ? accessLine("Passcode", options.accessCode) : ""}
    ${signoff(HANDBOOK_SEAL_RULE)}
  `;

  return {
    subject: `${options.circleName} · the way in`,
    html: sanctumShell({
      preheader: "The way in is set. Keep it to the circle.",
      contentHtml: content,
    }),
  };
}

/**
 * The leader's countdown: one short letter at sixty, thirty, and fifteen
 * minutes before the circle. Counts, the way in when it exists, the door.
 */
export function buildLeaderReminderEmail(options: {
  leaderName: string;
  circleName: string;
  scheduledAt: string;
  meetingType?: string | null;
  locationName?: string | null;
  minutes: 60 | 30 | 15;
  expectedCount: number;
  sealedCount: number;
  joinUrl?: string | null;
  accessId?: string | null;
  accessCode?: string | null;
  leaderRoomUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const name = escapeHtml(options.leaderName || "Leader");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const mode = meetingModePhrase(options.meetingType, options.locationName);

  const content = `
    ${h.eyebrow(`The summons &middot; ${options.minutes} minutes`)}
    ${line(`${name},`)}
    ${line(`${circle} gathers in ${options.minutes} minutes &middot; ${when}${mode ? ` &middot; ${escapeHtml(mode)}` : ""}.`)}
    ${line(`${options.expectedCount} reserved &middot; ${options.sealedCount} sealed.`)}
    ${options.joinUrl ? line("The way in is set. Walk it yourself before they arrive.") : line("The way in is not set yet. Set it now, in the leader room, and it reaches every reserved member in one breath.")}
    ${h.button(options.leaderRoomUrl, "OPEN THE LEADER ROOM")}
    ${options.joinUrl ? `${accessLine("Room", options.joinUrl)}${options.accessId ? accessLine("Meeting ID", options.accessId) : ""}${options.accessCode ? accessLine("Passcode", options.accessCode) : ""}` : ""}
    ${signoff("You hold the order. You read last. It ends when everyone has been heard.")}
  `;

  return {
    subject: `${options.circleName} · ${options.minutes} minutes`,
    html: sanctumShell({
      preheader: `${options.minutes} minutes. The roster and the way in wait inside.`,
      contentHtml: content,
    }),
  };
}
