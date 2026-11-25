// The session handbook — the whole circle, pre-answered.
//
// Four days before a meeting, every member with a 'going' RSVP receives
// their SUMMONS: not the session, but the call to it. The questions are
// drawn and sealed — they open only behind the member's sign-in, on the
// handbook page. The email reveals the theme, the night, and the law of the
// circle; everything else waits inside. Ancient in manner, exact in
// practice: answer in writing before you arrive; read what you wrote when
// you are called.
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
  return `${date}, ${time}`;
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

/**
 * The seal — the ceremonial heart of the summons. It reveals the SHAPE of
 * what is coming (in Roman numerals, because some things should feel older
 * than the week they arrive in) and nothing of the content.
 */
function sealBlock(topicQuestionCount: number, thresholdCount: number): string {
  const t = EMAIL_THEMES.sanctum;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;">
    <tr>
      <td align="center" style="padding:26px 18px; border-top:1px solid ${t.rule}; border-bottom:1px solid ${t.rule};">
        <p style="font-family:${t.bodyFont}; font-size:10px; letter-spacing:0.34em; text-transform:uppercase; color:${t.accent}; margin:0 0 12px;">Sealed until you enter</p>
        <p style="font-family:${t.headingFont}; font-size:34px; letter-spacing:0.18em; color:${t.ink}; margin:0 0 12px;">${toRoman(topicQuestionCount)}&nbsp;·&nbsp;${toRoman(thresholdCount)}</p>
        <p style="font-family:${t.bodyFont}; font-size:13px; line-height:1.7; color:${t.muted}; margin:0;">
          ${toRoman(topicQuestionCount) === "I" ? "question" : "questions"} drawn for you by lot, from the bank of the night&rsquo;s theme<br />
          and ${toRoman(thresholdCount) === "I" ? "one threshold question" : `${toRoman(thresholdCount)} threshold questions`} — the question that crosses every circle, every day
        </p>
      </td>
    </tr>
  </table>`;
}

/**
 * The summons. It does not contain the session — the session is sealed in
 * the member's handbook, behind their sign-in. The email carries the theme,
 * the night, the law of the circle, and the way in. Nothing more, because
 * nothing more is needed to make someone come.
 */
export function buildHandbookEmail(options: {
  recipientName: string;
  circleName: string;
  scheduledAt: string;
  variant: HandbookVariant;
  topic: CircleTopic;
  handbookUrl: string;
}): { subject: string; html: string } {
  const t = EMAIL_THEMES.sanctum;
  const h = themed(t);
  const name = escapeHtml(options.recipientName || "Friend");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const firstCircle = options.variant === "first_circle";

  const content = `
    ${h.heading(
      firstCircle
        ? "Four nights from now, the circle gathers. You are expected."
        : "The circle turns again in four nights."
    )}
    ${h.paragraph(`Dear ${name},`)}
    ${h.paragraph(
      `<strong>${circle}</strong> convenes on <strong>${when}</strong>. What follows is not the session — the session is sealed. This is only the summons.`
    )}
    ${h.callout(
      `<strong>The theme of the night: ${escapeHtml(options.topic.name)} — ${escapeHtml(options.topic.epithet)}.</strong> ${escapeHtml(options.topic.symbolism)} Every circle gathering on this day, across the country, sits with this same theme — each behind its own seal.`
    )}
    ${sealBlock(HANDBOOK_QUESTION_COUNT, HANDBOOK_THRESHOLD_COUNT)}
    ${h.paragraph(
      "The law of the circle is one sentence: <strong>answer in writing before you arrive; read what you wrote when you are called.</strong> Nothing will be asked of you that you have not already written. If a question does not fit, you may draw another within the theme — as often as you need. The theme stays; the question changes."
    )}
    ${h.button(options.handbookUrl, "BREAK THE SEAL")}
    ${h.finePrint(
      "You will be asked to sign in — the handbook answers to your eyes alone. The place, or the way in online, is shown inside, to the reserved only, and never travels by email. What you write becomes the circle's record: anonymised, gathered with every other voice, and carried to the people with the power to act."
    )}
    ${h.ps(
      firstCircle
        ? "You are not the audience of this circle. Every soul in that room is a shepherd; the leader only keeps the order. Come as you are — the seal does the rest."
        : "Somewhere on your street is a person who has never heard of this circle. They are your work as a shepherd — the leader keeps the room; you keep the street."
    )}
  `;

  return {
    subject: firstCircle
      ? "You are expected — the circle gathers in four nights"
      : `${circle} turns in four nights — your questions are sealed`,
    html: emailShell({
      preheader:
        "Questions drawn by lot. One threshold. Sealed until you enter.",
      eyebrow: firstCircle ? "The first summons" : "The summons",
      contentHtml: content,
      theme: "sanctum",
    }),
  };
}

// ── The leader pack ────────────────────────────────────────────
// The leader's summons: the charge, the roster, the way in. The full run
// sheet and the liturgies live in the leader room, behind sign-in.

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
 * The leader's summons — the charge and the roster, sealed in the same
 * manner as the members' summons. The run sheet, the liturgies, the
 * completed handbooks and the way in all live in the leader room.
 */
export function buildLeaderPackEmail(options: {
  leaderName: string;
  circleName: string;
  scheduledAt: string;
  topic: CircleTopic;
  roster: { name: string; variant: HandbookVariant }[];
  leaderRoomUrl: string;
}): { subject: string; html: string } {
  const t = EMAIL_THEMES.sanctum;
  const h = themed(t);
  const name = escapeHtml(options.leaderName || "Leader");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);

  const rosterRows = options.roster
    .map(
      (m) =>
        `<tr>
          <td style="padding:8px 0; border-bottom:1px solid ${t.rule}; font-size:15px; color:${t.ink};">
            ${escapeHtml(m.name)}
            ${m.variant === "first_circle" ? `<span style="color:${t.accent}; font-size:12px; letter-spacing:0.14em;"> &nbsp;· FIRST CIRCLE</span>` : ""}
          </td>
        </tr>`
    )
    .join("");

  const content = `
    ${h.heading("Four nights. The room is yours to keep.")}
    ${h.paragraph(`Dear ${name},`)}
    ${h.paragraph(
      `<strong>${circle}</strong> convenes on <strong>${when}</strong>. Every reserved member has received their summons; their questions are drawn and sealed. What they will read aloud, they have already written. Your work is the order of the room — never the clock.`
    )}
    ${h.callout(
      `<strong>The theme of the night: ${escapeHtml(options.topic.name)} — ${escapeHtml(options.topic.epithet)}.</strong> ${escapeHtml(options.topic.symbolism)} Each member drew their own questions by lot and may redraw any that don't fit — no two handbooks in your room are the same. Each handbook also carries one threshold question: the one question the whole country is sitting with together. Let it breathe when it comes.`
    )}
    ${h.eyebrow("Who is expected")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">${rosterRows}</table>
    ${h.eyebrow("The charge")}
    ${h.steps([
      "Open with the words kept in your leader room.",
      "Go member by member. Each reads what they have written — the introduction first, then the questions in order. No interruptions, no fixing, no advice unless it is asked for. One breath of silence after each voice. You read last.",
      "Keep the order, never the clock. The session ends when everyone has been heard — and not before.",
      "Afterward, mark who came and who did not, and carry what must be carried to us.",
    ])}
    ${h.button(options.leaderRoomUrl, "OPEN YOUR LEADER ROOM")}
    ${h.finePrint(
      "The full run sheet, the opening and closing words, your members' completed handbooks, and the way in — all inside, behind your sign-in, and never sent by email."
    )}
    ${h.ps(
      "You are the first among shepherds, not a shepherd over sheep. The order is yours; the tending belongs to everyone in the room."
    )}
  `;

  return {
    subject: `${circle} — the room is yours in four nights`,
    html: emailShell({
      preheader:
        "The roster, the charge, the words — sealed inside your leader room.",
      eyebrow: "The leader's summons",
      contentHtml: content,
      theme: "sanctum",
    }),
  };
}
