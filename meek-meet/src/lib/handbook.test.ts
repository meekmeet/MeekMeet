import { describe, it, expect } from "vitest";
import {
  HANDBOOK_INTROS,
  HANDBOOK_LEAD_DAYS,
  HANDBOOK_QUESTION_COUNT,
  HANDBOOK_THRESHOLD_COUNT,
  LEADER_OPENING_WORDS,
  LEADER_CLOSING_WORDS,
  LEADER_RUN_SHEET,
  buildHandbookEmail,
  buildHandbookQuestions,
  buildLeaderPackEmail,
  drawHandbookQuestions,
  drawThresholdQuestions,
  formatMeetingWhen,
  handbookComplete,
  handbookVariant,
  toRoman,
} from "./handbook";
import { getTopicForWeekday, CIRCLE_TOPICS, THRESHOLD_TOPIC } from "@meekmeet/core/questions";

const TOPIC = getTopicForWeekday(2); // Home & Street

describe("handbookVariant", () => {
  it("is first_circle when the member has no completed handbook in the circle", () => {
    expect(handbookVariant(0)).toBe("first_circle");
  });

  it("is returning once the member has completed at least one", () => {
    expect(handbookVariant(1)).toBe("returning");
    expect(handbookVariant(7)).toBe("returning");
  });
});

describe("buildHandbookQuestions", () => {
  it("snapshots question text with empty answers, preserving order", () => {
    const qs = buildHandbookQuestions([
      { question_id: "q1", content: "What does safety mean on your street?" },
      { question_id: "q2", content: "Who on your street is lonely?" },
    ]);
    expect(qs).toEqual([
      { question_id: "q1", question: "What does safety mean on your street?", answer: "" },
      { question_id: "q2", question: "Who on your street is lonely?", answer: "" },
    ]);
  });

  it("handles an empty question list", () => {
    expect(buildHandbookQuestions([])).toEqual([]);
  });
});

describe("drawHandbookQuestions — the questions are never fixed", () => {
  it("draws the default number of questions from the topic", () => {
    const drawn = drawHandbookQuestions(TOPIC);
    expect(drawn).toHaveLength(HANDBOOK_QUESTION_COUNT);
    for (const q of drawn) {
      expect(TOPIC.questions.some((t) => t.id === q.question_id)).toBe(true);
      expect(q.question.length).toBeGreaterThan(20);
      expect(q.answer).toBe("");
    }
  });

  it("respects an explicit count", () => {
    expect(drawHandbookQuestions(TOPIC, 5)).toHaveLength(5);
  });

  it("never redraws a question already in play", () => {
    const first = drawHandbookQuestions(TOPIC, 11);
    const second = drawHandbookQuestions(TOPIC, 3, first.map((q) => q.question_id));
    expect(second).toHaveLength(1);
    expect(first.map((q) => q.question_id)).not.toContain(second[0].question_id);
  });

  it("varies across members drawing from the same topic", () => {
    const draws = new Set<string>();
    for (let i = 0; i < 30; i++) {
      draws.add(drawHandbookQuestions(TOPIC).map((q) => q.question_id).join(","));
    }
    expect(draws.size).toBeGreaterThan(1);
  });

  it("draws from the right bank for each day of the week", () => {
    for (const topic of CIRCLE_TOPICS) {
      const drawn = drawHandbookQuestions(topic);
      const ids = new Set(topic.questions.map((q) => q.id));
      for (const q of drawn) expect(ids.has(q.question_id)).toBe(true);
    }
  });
});

describe("drawThresholdQuestions — the question that crosses every day", () => {
  it("draws one threshold question by default", () => {
    const drawn = drawThresholdQuestions();
    expect(drawn).toHaveLength(HANDBOOK_THRESHOLD_COUNT);
    expect(THRESHOLD_TOPIC.questions.some((q) => q.id === drawn[0].question_id)).toBe(true);
  });

  it("never draws a threshold question twice across a member's redraws", () => {
    const first = drawThresholdQuestions(19);
    const second = drawThresholdQuestions(5, first.map((q) => q.question_id));
    expect(second).toHaveLength(1);
    expect(first.map((q) => q.question_id)).not.toContain(second[0].question_id);
  });

  it("never collides with the day-topic banks", () => {
    const thresholdIds = new Set(THRESHOLD_TOPIC.questions.map((q) => q.id));
    for (const topic of CIRCLE_TOPICS) {
      for (const q of topic.questions) {
        expect(thresholdIds.has(q.id)).toBe(false);
      }
    }
  });
});

describe("handbookComplete", () => {
  it("is false with no questions", () => {
    expect(handbookComplete([])).toBe(false);
  });

  it("is false when any answer is empty or whitespace", () => {
    expect(
      handbookComplete([
        { question_id: "q1", question: "A?", answer: "Something real" },
        { question_id: "q2", question: "B?", answer: "   " },
      ])
    ).toBe(false);
  });

  it("is true when every answer carries text", () => {
    expect(
      handbookComplete([
        { question_id: "q1", question: "A?", answer: "Yes" },
        { question_id: "q2", question: "B?", answer: "And more" },
      ])
    ).toBe(true);
  });
});

describe("HANDBOOK_INTROS", () => {
  it("has guidance for both variants", () => {
    expect(HANDBOOK_INTROS.first_circle.guidance.length).toBeGreaterThan(60);
    expect(HANDBOOK_INTROS.returning.guidance.length).toBeGreaterThan(60);
    expect(HANDBOOK_INTROS.first_circle.title).not.toBe(HANDBOOK_INTROS.returning.title);
  });

  it("keeps the returning check-in modest: name, passions, since the last circle", () => {
    const g = HANDBOOK_INTROS.returning.guidance;
    expect(g).toContain("name");
    expect(g).toContain("passions");
    expect(g).toContain("since the last circle");
  });
});

describe("the leader run sheet", () => {
  it("covers open, introductions, questions, no-clock, close, after", () => {
    const titles = LEADER_RUN_SHEET.map((s) => s.title.toLowerCase()).join(" ");
    expect(titles).toContain("open");
    expect(titles).toContain("introductions");
    expect(titles).toContain("questions");
    expect(titles).toContain("clock");
    expect(titles).toContain("close");
    expect(titles).toContain("after");
  });

  it("teaches that the session runs until everyone is heard", () => {
    const noClock = LEADER_RUN_SHEET.find((s) => s.title.toLowerCase().includes("clock"));
    expect(noClock?.body).toContain("no set time");
    expect(noClock?.body).toContain("everyone to be heard");
  });

  it("has opening and closing words fit to read aloud", () => {
    expect(LEADER_OPENING_WORDS.length).toBeGreaterThan(80);
    expect(LEADER_CLOSING_WORDS.length).toBeGreaterThan(80);
    expect(LEADER_OPENING_WORDS).toContain("meek shall inherit the earth");
    expect(LEADER_CLOSING_WORDS).toContain("You were heard");
  });

  it("instructs the leader to mark attendance afterwards", () => {
    const after = LEADER_RUN_SHEET.find((s) => s.title.toLowerCase() === "after");
    expect(after?.body).toContain("attended");
    expect(after?.body).toContain("absent");
  });
});

describe("buildHandbookEmail — the draw", () => {
  const base = {
    recipientName: "Miriam",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    handbookUrl: "https://meekmeet.com/dashboard/handbook/abc",
  };

  it("tells the truth of the draw — the mechanism is the mystique", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(html).toContain("Your questions exist now.");
    expect(html).toContain("Tonight the lot ran for every circle gathering this week.");
    expect(html).toContain("No one chose them. Not us, not your leader.");
    expect(html).toContain("since Athens");
  });

  it("names the shape of the draw: three from the theme, one across the country", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("<strong>three</strong> questions fell to you");
    expect(html).toContain("crosses every circle in the country");
    expect(html).toContain("III");
  });

  it("speaks with two headlines, not two paragraphs", () => {
    const first = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(first.subject).toBe("The lot has fallen");
    const returning = buildHandbookEmail({ ...base, variant: "returning" });
    expect(returning.html).toContain("The lot has fallen again.");
    expect(returning.subject).toContain("the lot has fallen");
  });

  it("carries the night in a date plate and nothing else about the gathering", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("Tuesday 1 December");
  });

  it("seals everything: no theme, no questions, no place, no link", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("sealed under your name");
    expect(html).not.toContain("Home &amp; Street");
    expect(html).not.toContain(TOPIC.epithet);
    expect(html).not.toContain(TOPIC.symbolism.slice(0, 40));
    for (const q of TOPIC.questions) {
      expect(html).not.toContain(q.text.slice(0, 30));
    }
    expect(html).not.toContain("zoom.us");
    expect(html).not.toContain("Gosford Library");
  });

  it("carries the member to what was drawn, behind sign-in", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(html).toContain("https://meekmeet.com/dashboard/handbook/abc");
    expect(html).toContain("SEE WHAT WAS DRAWN");
  });

  it("keeps the law of the circle to one breath", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("Answer in writing before you arrive");
  });

  it("ends with a whisper, different for the first night", () => {
    const first = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(first.html).toContain("does not yet know your answers");
    const returning = buildHandbookEmail({ ...base, variant: "returning" });
    expect(returning.html).toContain("never heard of us");
  });

  it("renders in the sanctum theme — near-black and old gold", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("#0d111f");
    expect(html).toContain("#c9a45c");
  });

  it("escapes HTML in member-controlled fields", () => {
    const { html } = buildHandbookEmail({
      ...base,
      recipientName: "<script>alert(1)</script>",
      circleName: "<img src=x>",
      variant: "returning",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x>");
  });

  it("carries the many-names footer thread", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(html).toContain("Matthew 5:5");
    expect(html).toContain("Qur");
  });
});

describe("toRoman", () => {
  it("renders the counts of the seal", () => {
    expect(toRoman(1)).toBe("I");
    expect(toRoman(3)).toBe("III");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(9)).toBe("IX");
    expect(toRoman(12)).toBe("XII");
    expect(toRoman(0)).toBe("");
  });
});

describe("buildLeaderPackEmail — the leader's draw", () => {
  const base = {
    leaderName: "Leah",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    expectedCount: 7,
    leaderRoomUrl: "https://meekmeet.com/dashboard/shepherd/c1/meetings/m1",
  };

  it("states the leader's position in one headline", () => {
    const { html, subject } = buildLeaderPackEmail(base);
    expect(html).toContain("The room is yours to keep.");
    expect(subject).toContain("the room is yours");
  });

  it("gives the count of souls, never their names", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("7 souls are expected");
    const one = buildLeaderPackEmail({ ...base, expectedCount: 1 });
    expect(one.html).toContain("1 soul is expected");
  });

  it("tells the truth of the role: order, never teaching, never the clock", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("You will not teach them. You will not time them.");
    expect(html).toContain("you will read last");
    expect(html).toContain("each by lot");
  });

  it("seals the rest: no names, no liturgies, no theme, no link", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).not.toContain("Miriam");
    expect(html).not.toContain(LEADER_OPENING_WORDS.slice(0, 40));
    expect(html).not.toContain(LEADER_CLOSING_WORDS.slice(0, 40));
    expect(html).not.toContain("Home &amp; Street");
    expect(html).not.toContain("zoom.us");
    expect(html).toContain("under your sign-in");
  });

  it("carries the leader to the leader room", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain(base.leaderRoomUrl);
    expect(html).toContain("ENTER THE LEADER ROOM");
  });

  it("renders in the sanctum theme and ends with the doctrine whisper", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("#0d111f");
    expect(html).toContain("#c9a45c");
    expect(html).toContain("First among shepherds");
  });

  it("escapes HTML in leader-controlled fields", () => {
    const { html } = buildLeaderPackEmail({
      ...base,
      leaderName: "<b>bold</b>",
      circleName: "<script>x</script>",
    });
    expect(html).not.toContain("<b>bold</b>");
    expect(html).not.toContain("<script>x</script>");
  });
});

describe("formatMeetingWhen", () => {
  it("formats in the Australia/Sydney timezone", () => {
    // 2026-12-01T09:00:00Z is 20:00 AEDT on Tuesday 1 December.
    const formatted = formatMeetingWhen("2026-12-01T09:00:00.000Z");
    expect(formatted).toContain("Tuesday");
    expect(formatted).toContain("December");
    expect(formatted).toContain("8:00");
  });
});

describe("HANDBOOK_LEAD_DAYS", () => {
  it("is four days", () => {
    expect(HANDBOOK_LEAD_DAYS).toBe(4);
  });
});
