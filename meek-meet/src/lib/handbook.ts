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
import { emailShell, themed, EMAIL_THEMES } from "@/lib/emails/shell";
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

/** 1 → I, 3 → III, 4 → IV … for the seal. */
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
// Custom, minimal, ceremonial. Not the generic helpers — these emails are a
// different species from every other send.

/** The headline — large serif, the only loud thing in the email. */
function headline(text: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `<h1 style="font-family:${t.headingFont}; font-size:34px; line-height:1.25; font-weight:normal; color:${t.ink}; margin:6px 0 22px;">${text}</h1>`;
}

/** A short line of body copy — never more than a breath long. */
function line(text: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `<p style="font-family:${t.bodyFont}; font-size:15px; line-height:1.8; color:${t.muted}; margin:0 0 14px;">${text}</p>`;
}

/** The date, set in a thin plate — the one hard fact the email carries. */
function datePlate(text: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 26px;">
    <tr>
      <td align="center" style="border:1px solid ${t.rule}; border-radius:10px; padding:12px 26px;">
        <span style="font-family:${t.bodyFont}; font-size:12px; letter-spacing:0.28em; text-transform:uppercase; color:${t.accent};">${text}</span>
      </td>
    </tr>
  </table>`;
}

/** The mark of the draw — the numerals between hairlines, nothing more. */
function sealMark(topicCount: number, thresholdCount: number): string {
  const t = EMAIL_THEMES.sanctum;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="border-top:1px solid ${t.rule}; font-size:1px; line-height:1px;">&nbsp;</td>
      <td align="center" width="130" style="font-family:${t.headingFont}; font-size:20px; letter-spacing:0.3em; color:${t.accent}; white-space:nowrap;">${toRoman(topicCount)}&nbsp;&middot;&nbsp;${toRoman(thresholdCount)}</td>
      <td style="border-top:1px solid ${t.rule}; font-size:1px; line-height:1px;">&nbsp;</td>
    </tr>
  </table>`;
}

/** A thin rule with the ornament — the pause between movements. */
function ornamentRule(): string {
  const t = EMAIL_THEMES.sanctum;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;">
    <tr>
      <td style="border-top:1px solid ${t.rule}; font-size:1px; line-height:1px;">&nbsp;</td>
      <td align="center" width="60" style="color:${t.accent}; font-size:13px; letter-spacing:6px;">&#8258;</td>
      <td style="border-top:1px solid ${t.rule}; font-size:1px; line-height:1px;">&nbsp;</td>
    </tr>
  </table>`;
}

/** The single line beneath everything — quiet, final. */
function lastWord(text: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `<p style="font-family:${t.bodyFont}; font-size:12px; line-height:1.7; color:${t.faint}; margin:24px 0 0; text-align:center;">${text}</p>`;
}

/** The whisper at the end — one sentence, with teeth. */
function whisper(text: string): string {
  const t = EMAIL_THEMES.sanctum;
  return `<p style="font-family:${t.headingFont}; font-style:italic; font-size:14px; line-height:1.7; color:${t.muted}; margin:26px 0 0;"><strong style="color:${t.accent};">P.S.</strong> ${text}</p>`;
}

/**
 * The summons. Its power is truth, not theatre: tonight a draw actually
 * ran — sortition, the oldest fair instrument there is — and these specific
 * questions now exist under this member's name. No one chose them. The
 * theme, the place, the way in: all sealed behind sign-in.
 */
export function buildHandbookEmail(options: {
  recipientName: string;
  circleName: string;
  scheduledAt: string;
  variant: HandbookVariant;
  handbookUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const firstCircle = options.variant === "first_circle";
  const name = escapeHtml(options.recipientName || "Friend");
  const when = formatMeetingWhen(options.scheduledAt);

  const content = `
    ${h.eyebrow("The draw — four nights before the circle")}
    ${headline(firstCircle ? "Your questions exist now." : "The lot has fallen again.")}
    ${datePlate(when)}
    ${line(`${name} &mdash;`)}
    ${line("Tonight the lot ran for every circle gathering this week.")}
    ${line("From the theme of the night, <strong>three</strong> questions fell to you. A fourth crosses every circle in the country &mdash; the same question, everywhere, the same night.")}
    ${line("No one chose them. Not us, not your leader. The lot did &mdash; as it has been done since Athens, since the cloisters. What is asked of you was written for no one in particular. What you write back will be yours alone.")}
    ${sealMark(HANDBOOK_QUESTION_COUNT, HANDBOOK_THRESHOLD_COUNT)}
    ${line("Your questions are sealed under your name. So are the theme, the place, and the way in.")}
    ${h.button(options.handbookUrl, "SEE WHAT WAS DRAWN")}
    ${lastWord("Answer in writing before you arrive. In the room, you read what you wrote &mdash; nothing else is asked.")}
    ${whisper(
      firstCircle
        ? "The circle knows your name. It does not yet know your answers."
        : "Someone on your street has never heard of us. After the fourth night, they are yours."
    )}
  `;

  return {
    subject: firstCircle
      ? "The lot has fallen"
      : `${escapeHtml(options.circleName)} — the lot has fallen`,
    html: emailShell({
      preheader: "Three questions drawn by lot. One that crosses the country. Sealed under your name.",
      eyebrow: "The draw",
      contentHtml: content,
      theme: "sanctum",
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
 * The leader's summons. The truth of their position, plainly: the draw is
 * done, the words are written, and the room needs an order-keeper — never a
 * clock-keeper. The roster, the run sheet, the liturgies and the way in
 * live behind their sign-in.
 */
export function buildLeaderPackEmail(options: {
  leaderName: string;
  circleName: string;
  scheduledAt: string;
  expectedCount: number;
  leaderRoomUrl: string;
}): { subject: string; html: string } {
  const h = themed(EMAIL_THEMES.sanctum);
  const name = escapeHtml(options.leaderName || "Leader");
  const when = formatMeetingWhen(options.scheduledAt);
  const souls = `${options.expectedCount} ${options.expectedCount === 1 ? "soul" : "souls"}`;

  const content = `
    ${h.eyebrow("The draw — four nights before the circle")}
    ${headline("The room is yours to keep.")}
    ${datePlate(when)}
    ${line(`${name} &mdash;`)}
    ${line(`${souls} ${options.expectedCount === 1 ? "is" : "are"} expected at ${escapeHtml(options.circleName)} in four nights. Their questions have been drawn &mdash; each by lot, each different from their neighbour&rsquo;s, each already answered in their own hand.`)}
    ${line("You will not teach them. You will not time them. You will hold the order while each voice lands &mdash; and you will read last.")}
    ${ornamentRule()}
    ${h.button(options.leaderRoomUrl, "ENTER THE LEADER ROOM")}
    ${lastWord("The roster, the words, the run sheet, the way in &mdash; inside, under your sign-in.")}
    ${whisper("First among shepherds. The tending is theirs; the order is yours.")}
  `;

  return {
    subject: `${escapeHtml(options.circleName)} — the room is yours`,
    html: emailShell({
      preheader: "The draw is done. The roster and the words wait inside.",
      eyebrow: "The leader's draw",
      contentHtml: content,
      theme: "sanctum",
    }),
  };
}
