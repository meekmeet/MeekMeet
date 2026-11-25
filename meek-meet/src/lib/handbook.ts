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
 * Draw a member's questions from the day's topic. `excludeIds` keeps a
 * redraw from ever returning a question already in the member's handbook.
 */
export function drawHandbookQuestions(
  topic: CircleTopic,
  count: number = HANDBOOK_QUESTION_COUNT,
  excludeIds: string[] = []
): HandbookQuestion[] {
  return buildHandbookQuestions(
    drawQuestions(topic, count, { excludeIds }).map((q: CircleTopicQuestion) => ({
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

/** The top band: the new moon the whole platform turns on. */
export const SANCTUM_MOON_BG_URL = "https://meekmeet.com/sacred/new-moon-bg.png";

/** The bottom band: the Seed of Life blooming from below the button and
 *  overflowing off the bottom edge of the letter. */
export const SANCTUM_SEED_BG_URL = "https://meekmeet.com/sacred/seed-bottom.png";

/** The black-letter shell: the new moon presides over the top of the
 *  letter; the Seed of Life blooms beneath the button and overflows off
 *  the bottom edge. Two anchored bands, so the composition holds at any
 *  email height. */
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
        <td align="center" bgcolor="${t.pageBg}" background="${SANCTUM_MOON_BG_URL}" style="background-color:${t.pageBg}; background-image:url('${SANCTUM_MOON_BG_URL}'); background-position:center top; background-repeat:no-repeat;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">
            <tr>
              <td align="center" style="padding:52px 40px 14px;">
                <img src="${SANCTUM_LOGO_URL}" alt="Meek Meet" width="52" height="52" style="display:inline-block; border-radius:13px; border:0;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 30px;">
                <span style="font-family:${t.headingFont}; font-size:19px; letter-spacing:0.26em; color:#ece8dc;">MEEK&nbsp;MEET</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 44px 40px; font-family:${t.bodyFont}; color:${t.ink};">
                ${options.contentHtml}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" valign="top" height="460" background="${SANCTUM_SEED_BG_URL}" style="background-image:url('${SANCTUM_SEED_BG_URL}'); background-position:center bottom; background-repeat:no-repeat; padding-top:24px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">
                  <tr>
                    <td align="center" style="padding:0 40px; font-family:${t.bodyFont}; font-size:11.5px; color:${t.faint}; line-height:2;">
                      <em style="font-size:13px; color:${t.accent};">&ldquo;Blessed are the meek, for they shall inherit the earth.&rdquo;</em><br />
                      <span style="font-size:10.5px;">The promise has many names: Matthew 5:5 &middot; Psalm 37:11 &middot; Qur&rsquo;an 21:105 &middot; Tao Te Ching 66</span><br />
                      <a href="https://meekmeet.com" style="color:${t.muted}; text-decoration:underline;">meekmeet.com</a>
                    </td>
                  </tr>
                </table>
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
  variant: HandbookVariant;
  handbookUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const firstCircle = options.variant === "first_circle";
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
    ${
      firstCircle
        ? line("Nothing will be asked of you on the spot. Everything you will say, you have already written.")
        : ""
    }
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

// ── The leader pack ────────────────────────────────────────────
// The leader's summons: the count, the charge in one breath, the door.
// The roster, the run sheet, the liturgies — all inside the leader room.

/** Read aloud to open the circle, after everyone has arrived. */
export const LEADER_OPENING_WORDS =
  "We gather in the open — every faith and none — under one promise: that the meek shall inherit the earth. Nobody here leads and nobody here follows; we are shepherds to each other and to the street outside. What is said in this circle is read from what each of us has already written — no one will be asked to think on the spot, and no one will be interrupted. Let us begin.";

/** Read aloud to close the circle, after the last member has spoken. */
export const LEADER_CLOSING_WORDS =
  "What was spoken here is carried now — anonymised, gathered with every other circle, and taken to the people with the power to act. You were heard. Go gently, and keep the street. The circle is closed.";

/** The shape of the night, step by step. The leader keeps order, never time. */
export const LEADER_RUN_SHEET: { title: string; body: string }[] = [
  {
    title: "Open",
    body: "Welcome everyone. Name the day's theme aloud — every circle gathering on this weekday, across the country, is sitting with the same theme tonight. Then read the opening words.",
  },
  {
    title: "Introductions",
    body: "Each member reads the introduction they wrote in their handbook. First-circle members read the fuller introduction; returning members keep it to name, passions, and what has happened since the last circle.",
  },
  {
    title: "The questions",
    body: "Go member by member. Each person reads their answers in order — the topic questions, then the threshold question. No interruptions, no fixing, no advice unless it is asked for. After each reader, let one breath of silence pass. You read last.",
  },
  {
    title: "Keep order, never the clock",
    body: "The session has no set time. It runs for as long as it takes for everyone to be heard. Your only job is the order of the room — who is speaking, who is next, and that every voice lands.",
  },
  {
    title: "Close",
    body: "Invite one sentence from each person — what are you carrying out of this room? Then read the closing words.",
  },
  {
    title: "After",
    body: "Mark who attended and who was absent in your leader room, and carry anything urgent — a member in crisis, a decision the circle reached — to us. We organise what the circle said and keep you in the loop of the motion it makes.",
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
