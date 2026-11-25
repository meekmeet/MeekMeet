// The session handbook — the whole circle, pre-answered.
//
// Four days before a meeting, every member with a 'going' RSVP receives
// their handbook: the session's introduction and its questions, as a form.
// They answer in writing, in their own time. In the room, nobody is put on
// the spot — each member reads what they have already thought through, the
// leader holds the room, and the completed handbooks become the data the
// platform synthesises into anonymised reports.
//
// The form is variable: a member's first handbook in a circle ('first_circle')
// carries a warmer, slower introduction; long-standing members ('returning')
// get the shorter one.

import { escapeHtml } from "@/lib/validation";
import { emailShell, themed, EMAIL_THEMES } from "@/lib/emails/shell";

export const HANDBOOK_LEAD_DAYS = 4;

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
      "The circle knows your name — this is where you tell it what's true for you this month. One or two sentences: where you are, what's on your mind. You'll read it when the leader opens the circle.",
  },
};

/** Snapshot the meeting's questions into a member's form (answers empty). */
export function buildHandbookQuestions(
  questions: { question_id: string; content: string }[]
): HandbookQuestion[] {
  return questions.map((q) => ({
    question_id: q.question_id,
    question: q.content,
    answer: "",
  }));
}

/** A handbook is complete when every question carries a written answer. */
export function handbookComplete(responses: HandbookQuestion[]): boolean {
  return (
    responses.length > 0 &&
    responses.every((r) => r.answer.trim().length > 0)
  );
}

function formatMeetingWhen(scheduledAt: string): string {
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
  variant: HandbookVariant;
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

  const content = `
    ${h.heading(
      firstCircle
        ? "Four days from now, the circle gathers. This is the whole of it."
        : "The circle turns again. Here is the whole of it, four days early."
    )}
    ${h.paragraph(`Dear ${name},`)}
    ${h.paragraph(
      firstCircle
        ? `You are reserved for <strong>${circle}</strong> on <strong>${when}</strong>${options.locationName ? ` at <strong>${escapeHtml(options.locationName)}</strong>` : ""}. Nothing about that evening will be sprung on you. This email — and the handbook behind it — is the entire session: the introduction, the questions, the shape of the night.`
        : `<strong>${circle}</strong> gathers again on <strong>${when}</strong>${options.locationName ? ` at <strong>${escapeHtml(options.locationName)}</strong>` : ""}. As always: no surprises. Below is the entire session — the check-in, the questions, the shape of the night.`
    )}
    ${h.paragraph(
      "The practice is simple, and it is the whole design: <strong>answer in writing now, read aloud later.</strong> Each question below has a space in your handbook. Write what is true. When the circle gathers, you will never be asked to think on the spot — you will read what you have already thought through, and the leader will hold the room while you do."
    )}
    ${h.callout(
      `<strong>${intro.title}.</strong> ${intro.guidance}`
    )}
    ${h.eyebrow("The questions of this circle")}
    ${questionSteps}
    ${h.paragraph(
      "Take the four days. Let the questions sit with you the way good questions do — in the car, at the sink, at three in the morning. The best answers are rarely the first ones."
    )}
    ${h.button(options.handbookUrl, "OPEN YOUR HANDBOOK")}
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
