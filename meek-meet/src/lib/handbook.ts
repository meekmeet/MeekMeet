// The session handbook — the whole circle, pre-answered.
//
// Four days before a meeting, every member with a 'going' RSVP receives
// their handbook: the session's introduction and their questions, as a form.
// The questions are never fixed: each member draws their own set at random
// from the day's circle topic (see packages/core circle-topics — one theme
// per weekday, shared by every circle in the country that day), and may
// redraw any question that doesn't fit. Every redraw is logged, so the
// platform learns which questions people answer and which they skip.
//
// In the room, nobody is put on the spot — each member reads what they have
// already thought through, the leader holds the order (never the clock: the
// circle runs until everyone is heard), and the completed handbooks become
// the data the platform synthesises into anonymised reports.
//
// The form is variable: a member's first handbook in a circle ('first_circle')
// carries a warmer, slower introduction; long-standing members ('returning')
// get the shorter check-in.

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

/**
 * The four-days-before email. The whole session, in the email itself — the
 * member can read and think without clicking anything — with the button
 * carrying them to the form where their answers come back to us.
 */
export function buildHandbookEmail(options: {
  recipientName: string;
  circleName: string;
  scheduledAt: string;
  locationName?: string | null;
  /** Set when the circle meets online — the member's personal join link. */
  joinUrl?: string | null;
  variant: HandbookVariant;
  topic: CircleTopic;
  questions: HandbookQuestion[];
  handbookUrl: string;
}): { subject: string; html: string } {
  const t = EMAIL_THEMES.parchment;
  const h = themed(t);
  const name = escapeHtml(options.recipientName || "Friend");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const intro = HANDBOOK_INTROS[options.variant];

  const questionSteps = h.steps(
    options.questions.map((q) => escapeHtml(q.question))
  );

  const firstCircle = options.variant === "first_circle";
  const online = Boolean(options.joinUrl);

  const whereLine = online
    ? `online — your personal join link is below`
    : options.locationName
      ? `at <strong>${escapeHtml(options.locationName)}</strong>`
      : "";

  const content = `
    ${h.heading(
      firstCircle
        ? "Four days from now, the circle gathers. This is the whole of it."
        : "The circle turns again. Here is the whole of it, four days early."
    )}
    ${h.paragraph(`Dear ${name},`)}
    ${h.paragraph(
      firstCircle
        ? `You are reserved for <strong>${circle}</strong> on <strong>${when}</strong>${whereLine ? `, ${whereLine}` : ""}. Nothing about that evening will be sprung on you. This email — and the handbook behind it — is the entire session: the introduction, the questions, the shape of the night.`
        : `<strong>${circle}</strong> gathers again on <strong>${when}</strong>${whereLine ? `, ${whereLine}` : ""}. As always: no surprises. Below is the entire session — the check-in, the questions, the shape of the night.`
    )}
    ${h.paragraph(
      "The practice is simple, and it is the whole design: <strong>answer in writing now, read aloud later.</strong> Each question below has a space in your handbook. Write what is true. When the circle gathers, you will never be asked to think on the spot — you will read what you have already thought through, and the leader will hold the room while you do."
    )}
    ${h.callout(
      `<strong>Tonight's theme: ${escapeHtml(options.topic.name)} — ${escapeHtml(options.topic.epithet)}.</strong> ${escapeHtml(options.topic.symbolism)} Every circle gathering on this day, across the country, sits with this same theme — each with its own questions.`
    )}
    ${h.paragraph(
      `<strong>${intro.title}.</strong> ${intro.guidance}`
    )}
    ${h.eyebrow("Your questions — drawn for you by lot")}
    ${questionSteps}
    ${h.callout(
      "These questions were not chosen for you — they were drawn at random from the theme's bank, the way lots are drawn. If one of them does not fit — if it asks about a country you never lived in, a grief that is not yours — you may <strong>draw another</strong> on your handbook page, as many times as you need. The theme stays; the question changes. Which questions people keep, and which they send back, is itself something we listen to."
    )}
    ${h.paragraph(
      "The last of them is a <strong>threshold question</strong> — one question that crosses every circle, every day, everywhere we gather. It does not ask what is wrong with us; it asks what is holding back what is possible."
    )}
    ${h.paragraph(
      "Take the four days. Let the questions sit with you the way good questions do — in the car, at the sink, at three in the morning. The best answers are rarely the first ones."
    )}
    ${h.button(options.handbookUrl, "OPEN YOUR HANDBOOK")}
    ${
      online && options.joinUrl
        ? `${h.divider()}${h.eyebrow("Joining online")}
    ${h.paragraph(
      "The circle meets online. On the night, this link opens the room — it is yours; it is shown only to members who reserved, never published:"
    )}
    ${h.button(options.joinUrl, "JOIN THE CIRCLE ONLINE")}`
        : ""
    }
    ${h.finePrint(
      "Your written answers come back to us and become the circle's record — anonymised and gathered with everyone else's, they are how your street's voice reaches the people who decide its future. Only your circle's leader and our administrators ever see that they are yours."
    )}
    ${h.ps(
      firstCircle
        ? "You are not the audience of this circle. You are one of its shepherds — everyone in the room is. The leader only keeps the order; the tending is all of yours."
        : "Somebody on your street has never heard of this circle. When you have an evening to spare, that person is your work as a shepherd — the leader keeps the room; you keep the street."
    )}
  `;

  return {
    subject: firstCircle
      ? `Your first circle is four days away — here is the whole of it`
      : `Your handbook for ${circle} — four days out`,
    html: emailShell({
      preheader: firstCircle
        ? "The introduction, the questions, the shape of the night — answer in writing now, read aloud later."
        : "The whole session, four days early. Answer in writing now, read aloud later.",
      eyebrow: firstCircle ? "Your first circle" : "Your circle handbook",
      contentHtml: content,
      theme: "parchment",
    }),
  };
}

// ── The leader pack ────────────────────────────────────────────
// The same four-days-out moment, but for the leader: the run sheet for the
// night. The leader keeps the order — never the clock.

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
    body: "Go member by member. Each person reads their answers in order — question one, then two, then three. No interruptions, no fixing, no advice unless it is asked for. After each reader, let one breath of silence pass. You read last.",
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
 * The leader's four-days-out email: the theme, the roster, the run sheet,
 * the opening and closing words, and the attendance instruction.
 */
export function buildLeaderPackEmail(options: {
  leaderName: string;
  circleName: string;
  scheduledAt: string;
  locationName?: string | null;
  joinUrl?: string | null;
  topic: CircleTopic;
  roster: { name: string; variant: HandbookVariant; completed: boolean }[];
  leaderRoomUrl: string;
}): { subject: string; html: string } {
  const t = EMAIL_THEMES.midnight;
  const h = themed(t);
  const name = escapeHtml(options.leaderName || "Leader");
  const circle = escapeHtml(options.circleName);
  const when = formatMeetingWhen(options.scheduledAt);
  const online = Boolean(options.joinUrl);

  const rosterRows = options.roster
    .map(
      (m) =>
        `<tr>
          <td style="padding:8px 0; border-bottom:1px solid ${t.rule}; font-size:15px; color:${t.ink};">
            ${escapeHtml(m.name)}
            <span style="color:${t.faint}; font-size:13px;"> — ${m.variant === "first_circle" ? "first circle" : "returning"} · handbook ${m.completed ? "completed" : "in progress"}</span>
          </td>
        </tr>`
    )
    .join("");

  const content = `
    ${h.heading("Four days out — the night is yours to keep.")}
    ${h.paragraph(`Dear ${name},`)}
    ${h.paragraph(
      `<strong>${circle}</strong> gathers on <strong>${when}</strong>${
        online
          ? ", online — the join link is below"
          : options.locationName
            ? ` at <strong>${escapeHtml(options.locationName)}</strong>`
            : ""
      }. Every reserved member has just received their handbook — the whole session, pre-answered in writing. Your job on the night is not to teach or to time. It is to keep the order of the room while each person reads what they have already thought through.`
    )}
    ${h.callout(
      `<strong>The theme: ${escapeHtml(options.topic.name)} — ${escapeHtml(options.topic.epithet)}.</strong> ${escapeHtml(options.topic.symbolism)} Every circle meeting on this weekday shares this theme; within it, each member drew their own questions by lot, and may redraw any that don't fit. So no two handbooks in your room are the same — and no circle anywhere is repeating itself.`
    )}
    ${h.paragraph(
      "Each member's handbook also carries one <strong>threshold question</strong> — the question that crosses every circle, every day: not what is wrong with us, but what is holding back what is possible. When you reach it in the cycle, let it breathe; it is the one question the whole country is sitting with together."
    )}
    ${h.eyebrow("Who is coming")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">${rosterRows}</table>
    ${h.eyebrow("The shape of the night")}
    ${h.steps(LEADER_RUN_SHEET.map((s) => `<strong>${s.title}.</strong> ${s.body}`))}
    ${h.eyebrow("The opening words — read aloud to begin")}
    ${h.scriptureQuote(LEADER_OPENING_WORDS)}
    ${h.eyebrow("The closing words — read aloud to end")}
    ${h.scriptureQuote(LEADER_CLOSING_WORDS)}
    ${h.button(options.leaderRoomUrl, "OPEN YOUR LEADER ROOM")}
    ${
      online && options.joinUrl
        ? `${h.paragraph(
            `The circle meets online. Your room link: <a href="${options.joinUrl}" style="color:${t.accent};">${options.joinUrl}</a> — it is shown only to reserved members, never published.`
          )}`
        : ""
    }
    ${h.finePrint(
      "In your leader room you can read each member's completed handbook before the night, mark attendance afterwards, and see the theme and run sheet again. Members see only their own handbook — the room is yours to hold."
    )}
    ${h.ps(
      "You are the first among shepherds, not a shepherd over sheep. The order is yours; the tending belongs to everyone in the room."
    )}
  `;

  return {
    subject: `${circle} — your leader pack for ${when}`,
    html: emailShell({
      preheader:
        "The theme, the roster, the run sheet, the opening and closing words — everything you need to hold the room.",
      eyebrow: "The leader's pack",
      contentHtml: content,
      theme: "midnight",
    }),
  };
}
