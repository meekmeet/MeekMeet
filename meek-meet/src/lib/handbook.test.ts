import { describe, it, expect } from "vitest";
import {
  HANDBOOK_INTROS,
  HANDBOOK_LEAD_DAYS,
  HANDBOOK_QUESTION_COUNT,
  LEADER_OPENING_WORDS,
  LEADER_CLOSING_WORDS,
  LEADER_RUN_SHEET,
  buildHandbookEmail,
  buildHandbookQuestions,
  buildLeaderPackEmail,
  drawHandbookQuestions,
  formatMeetingWhen,
  handbookComplete,
  handbookVariant,
} from "./handbook";
import { getTopicForWeekday, CIRCLE_TOPICS } from "@meekmeet/core/questions";

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

describe("buildHandbookEmail", () => {
  const base = {
    recipientName: "Miriam",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    locationName: "Gosford Library",
    topic: TOPIC,
    questions: [
      { question_id: "hom-1", question: "What does \"home\" mean to you?", answer: "" },
      { question_id: "hom-2", question: "Who has no one to eat with?", answer: "" },
    ],
    handbookUrl: "https://meekmeet.com/dashboard/handbook/abc",
  };

  it("greets the member and names the circle and the practice", () => {
    const { html, subject } = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(html).toContain("Dear Miriam");
    expect(html).toContain("Gosford Circle");
    expect(html).toContain("answer in writing now, read aloud later");
    expect(subject).toContain("first circle");
  });

  it("lists every question in the email itself", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("What does &quot;home&quot; mean to you?");
    expect(html).toContain("Who has no one to eat with?");
  });

  it("names the day's theme and its nationwide thread", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("Home &amp; Street");
    expect(html).toContain(TOPIC.epithet);
    expect(html).toContain("across the country");
  });

  it("explains the random draw and the redraw right", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "returning" });
    expect(html).toContain("drawn for you by lot");
    expect(html).toContain("draw another");
    expect(html).toContain("The theme stays; the question changes");
  });

  it("links to the member's handbook form", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(html).toContain("https://meekmeet.com/dashboard/handbook/abc");
    expect(html).toContain("OPEN YOUR HANDBOOK");
  });

  it("carries the online join link only when the circle meets online", () => {
    const online = buildHandbookEmail({
      ...base,
      variant: "returning",
      joinUrl: "https://zoom.us/j/123456",
    });
    expect(online.html).toContain("JOIN THE CIRCLE ONLINE");
    expect(online.html).toContain("https://zoom.us/j/123456");
    expect(online.html).toContain("online");

    const inPerson = buildHandbookEmail({ ...base, variant: "returning" });
    expect(inPerson.html).not.toContain("JOIN THE CIRCLE ONLINE");
  });

  it("uses the newcomer framing for first_circle and the shepherd doctrine in the PS", () => {
    const first = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(first.html).toContain("Your introduction");
    expect(first.html).toContain("You are one of its shepherds");
    const returning = buildHandbookEmail({ ...base, variant: "returning" });
    expect(returning.html).toContain("Your check-in");
    expect(returning.html).toContain("your work as a shepherd");
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

  it("omits the location clause when no location is set", () => {
    const { html } = buildHandbookEmail({
      ...base,
      locationName: null,
      variant: "returning",
    });
    expect(html).not.toContain("Gosford Library");
  });

  it("carries the many-names footer thread", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(html).toContain("Matthew 5:5");
    expect(html).toContain("Qur");
  });
});

describe("buildLeaderPackEmail", () => {
  const base = {
    leaderName: "Leah",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    locationName: "Gosford Library",
    topic: TOPIC,
    roster: [
      { name: "Miriam", variant: "first_circle" as const, completed: true },
      { name: "Sam", variant: "returning" as const, completed: false },
    ],
    leaderRoomUrl: "https://meekmeet.com/dashboard/shepherd/c1/meetings/m1",
  };

  it("greets the leader and frames their job as keeping order, not teaching", () => {
    const { html, subject } = buildLeaderPackEmail(base);
    expect(html).toContain("Dear Leah");
    expect(html).toContain("keep the order of the room");
    expect(subject).toContain("Gosford Circle");
  });

  it("names the theme and explains per-member random draws", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("Home &amp; Street");
    expect(html).toContain("drew their own questions by lot");
    expect(html).toContain("no two handbooks in your room are the same");
  });

  it("includes the roster with variant and handbook status", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("Miriam");
    expect(html).toContain("first circle");
    expect(html).toContain("Sam");
    expect(html).toContain("handbook in progress");
  });

  it("contains the whole run sheet and both liturgies", () => {
    const { html } = buildLeaderPackEmail(base);
    for (const step of LEADER_RUN_SHEET) {
      expect(html).toContain(step.title);
    }
    expect(html).toContain(LEADER_OPENING_WORDS.slice(0, 40));
    expect(html).toContain(LEADER_CLOSING_WORDS.slice(0, 40));
  });

  it("links to the leader room and instructs attendance marking", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain(base.leaderRoomUrl);
    expect(html).toContain("mark attendance");
  });

  it("carries the online join link for digital circles", () => {
    const { html } = buildLeaderPackEmail({
      ...base,
      joinUrl: "https://zoom.us/j/999",
      locationName: null,
    });
    expect(html).toContain("https://zoom.us/j/999");
    expect(html).toContain("online");
  });

  it("uses the midnight theme — visually distinct from the member parchment", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("#171d30"); // midnight card background
    const member = buildHandbookEmail({
      recipientName: "M",
      circleName: "C",
      scheduledAt: base.scheduledAt,
      variant: "returning",
      topic: TOPIC,
      questions: [],
      handbookUrl: "https://meekmeet.com/x",
    });
    expect(member.html).toContain("#faf6ee"); // parchment card background
  });

  it("escapes HTML in leader-controlled fields", () => {
    const { html } = buildLeaderPackEmail({
      ...base,
      leaderName: "<b>bold</b>",
      roster: [{ name: "<script>x</script>", variant: "returning", completed: false }],
    });
    expect(html).not.toContain("<b>bold</b>");
    expect(html).not.toContain("<script>x</script>");
  });

  it("carries the first-among-shepherds doctrine in the PS", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("first among shepherds");
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
