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
  formatMeetingShort,
  formatMeetingWhen,
  handbookComplete,
  handbookVariant,
  buildHandbookReminderEmail,
  HANDBOOK_LOCK_HOURS_BEFORE,
  HANDBOOK_SEAL_RULE,
  handbookSealsAt,
  isHandbookSealed,
  meetingModePhrase,
  SANCTUM_MOON_IMG_URL,
  SANCTUM_SKY_BG_URL,
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

describe("buildHandbookEmail — the summons", () => {
  const base = {
    recipientName: "Miriam",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    meetingType: "digital",
    locationName: null,
    attendingCount: 7,
    handbookUrl: "https://meekmeet.com/dashboard/handbook/abc",
  };

  it("is built entirely from variables: name, circle, date, mode", () => {
    const { html, subject } = buildHandbookEmail(base);
    expect(html).toContain("Miriam");
    expect(html).toContain("Gosford Circle meets Tuesday 1 December");
    expect(html).toContain("online");
    expect(subject).toContain("Gosford Circle");
    expect(subject).toContain("Tue, 1 Dec");
  });

  it("adapts the mode phrase: online, in person, hybrid, or nothing", () => {
    const online = buildHandbookEmail(base);
    expect(online.html).toContain("online");
    const inPerson = buildHandbookEmail({
      ...base,
      variant: "returning",
      meetingType: "in_person",
      locationName: "Gosford Library",
    });
    expect(inPerson.html).toContain("at Gosford Library");
    expect(inPerson.html).not.toContain("online");
    const hybrid = buildHandbookEmail({
      ...base,
      variant: "returning",
      meetingType: "hybrid",
      locationName: "Gosford Library",
    });
    expect(hybrid.html).toContain("at Gosford Library, and online");
    const bare = buildHandbookEmail({
      ...base,
      variant: "returning",
      meetingType: "in_person",
      locationName: null,
    });
    expect(bare.html).toContain("Gosford Circle meets Tuesday 1 December");
  });

  it("states the practice in one line and carries the member in", () => {
    const { html } = buildHandbookEmail(base);
    expect(html).toContain("Your questions are waiting inside");
    expect(html).toContain("you read what you wrote");
    expect(html).toContain("ENTER YOUR HANDBOOK");
    expect(html).toContain("https://meekmeet.com/dashboard/handbook/abc");
  });

  it("shows the live attending count — dynamic, never a fixed number", () => {
    const { html } = buildHandbookEmail(base);
    expect(html).toContain("7 are attending");
    expect(html).toContain("Your seat is held under your name");
    expect(html).toContain("opens for you alone");
    const solo = buildHandbookEmail({ ...base, variant: "returning", attendingCount: 1 });
    expect(solo.html).toContain("You are the first name down");
  });

  it("no longer carries the first-circle assurance — one standing form for all", () => {
    const { html } = buildHandbookEmail(base);
    expect(html).not.toContain("Nothing will be asked of you on the spot");
  });

  it("seals everything: no theme, no questions, no address, no join link", () => {
    const { html } = buildHandbookEmail({
      ...base,
      meetingType: "hybrid",
      locationName: "Gosford Library",
    });
    expect(html).not.toContain("Home &amp; Street");
    for (const q of TOPIC.questions) {
      expect(html).not.toContain(q.text.slice(0, 30));
    }
    expect(html).not.toContain("zoom.us");
  });

  it("wears the sacred geometry: the moon bears the seed, one screen, no second band", () => {
    const { html } = buildHandbookEmail(base);
    expect(html).toContain(SANCTUM_SKY_BG_URL);
    expect(html).toContain(SANCTUM_MOON_IMG_URL);
    expect(html).not.toContain("seed-bottom"); // no bottom band: nothing to expand
    expect(html).toContain("background-image");
    expect(html).toContain("logo.png"); // the mark still crowns the letter
    expect(html).toContain("#060608"); // true black
    expect(html).toContain("#c9a45c"); // old gold
  });

  it("contains no em dashes, anywhere", () => {
    const member = buildHandbookEmail(base);
    expect(member.html).not.toContain("—");
    expect(member.html).not.toContain("&mdash;");
    expect(member.subject).not.toContain("—");
  });

  it("escapes HTML in member-controlled fields", () => {
    const { html } = buildHandbookEmail({
      ...base,
      recipientName: "<script>alert(1)</script>",
      circleName: "<img src=x>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x>");
  });

  it("carries the many-names footer thread", () => {
    const { html } = buildHandbookEmail(base);
    expect(html).toContain("Matthew 5:5");
    expect(html).toContain("Qur");
  });
});

describe("buildHandbookReminderEmail — the summons, returned", () => {
  const base = {
    recipientName: "Miriam",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    meetingType: "digital",
    locationName: null,
    handbookUrl: "https://meekmeet.com/dashboard/handbook/abc",
  };

  it("is built from the same variables: name, circle, date, mode", () => {
    const { html, subject } = buildHandbookReminderEmail(base);
    expect(html).toContain("Miriam");
    expect(html).toContain("Gosford Circle meets Tuesday 1 December");
    expect(html).toContain("online");
    expect(subject).toContain("Gosford Circle");
  });

  it("names the debt and the law: still unanswered, read what you wrote", () => {
    const { html } = buildHandbookReminderEmail(base);
    expect(html).toContain("still unanswered");
    expect(html).toContain("you read what you wrote");
    expect(html).toContain("COMPLETE YOUR HANDBOOK");
    expect(html).toContain("https://meekmeet.com/dashboard/handbook/abc");
  });

  it("is honest about its own persistence: daily, until complete", () => {
    const { html } = buildHandbookReminderEmail(base);
    expect(html).toContain("returns each day until your handbook is complete");
  });

  it("seals everything and carries no attendance line", () => {
    const { html } = buildHandbookReminderEmail(base);
    expect(html).not.toContain("Home &amp; Street");
    for (const q of TOPIC.questions) {
      expect(html).not.toContain(q.text.slice(0, 30));
    }
    expect(html).not.toContain("zoom.us");
    expect(html).not.toContain("are attending");
  });

  it("wears the same sanctum letter, and contains no em dashes", () => {
    const { html, subject } = buildHandbookReminderEmail(base);
    expect(html).toContain(SANCTUM_SKY_BG_URL);
    expect(html).toContain(SANCTUM_MOON_IMG_URL);
    expect(html).toContain("#060608");
    expect(html).toContain("#c9a45c");
    expect(html).not.toContain("—");
    expect(html).not.toContain("&mdash;");
    expect(subject).not.toContain("—");
  });

  it("escapes HTML in member-controlled fields", () => {
    const { html } = buildHandbookReminderEmail({
      ...base,
      recipientName: "<script>alert(1)</script>",
      circleName: "<img src=x>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x>");
  });
});

describe("meetingModePhrase", () => {
  it("maps every meeting mode to its phrase", () => {
    expect(meetingModePhrase("digital", null)).toBe("online");
    expect(meetingModePhrase("digital", "Ignored Hall")).toBe("online");
    expect(meetingModePhrase("hybrid", "The Hall")).toBe("at The Hall, and online");
    expect(meetingModePhrase("hybrid", null)).toBe("online");
    expect(meetingModePhrase("in_person", "The Hall")).toBe("at The Hall");
    expect(meetingModePhrase("in_person", null)).toBeNull();
    expect(meetingModePhrase(null, null)).toBeNull();
  });
});

describe("formatMeetingShort", () => {
  it("renders the subject-line date", () => {
    const short = formatMeetingShort("2026-12-01T09:00:00.000Z");
    expect(short).toContain("Tue, 1 Dec");
    expect(short).toContain("8:00");
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

describe("buildLeaderPackEmail — the leader's summons", () => {
  const base = {
    leaderName: "Leah",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    meetingType: "digital",
    locationName: null,
    expectedCount: 7,
    leaderRoomUrl: "https://meekmeet.com/dashboard/shepherd/c1/meetings/m1",
  };

  it("is the same standing form: name, circle, date, mode, count", () => {
    const { html, subject } = buildLeaderPackEmail(base);
    expect(html).toContain("Leah");
    expect(html).toContain("Gosford Circle meets Tuesday 1 December");
    expect(html).toContain("online");
    expect(html).toContain("7 reserved");
    expect(subject).toContain("Gosford Circle");
  });

  it("states the role in one line: order, last voice, no clock", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain("You hold the order. You read last.");
    expect(html).toContain("It ends when everyone has been heard.");
  });

  it("seals the rest: no names, no liturgies, no theme, no link", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).not.toContain("Miriam");
    expect(html).not.toContain(LEADER_OPENING_WORDS.slice(0, 40));
    expect(html).not.toContain(LEADER_CLOSING_WORDS.slice(0, 40));
    expect(html).not.toContain("Home &amp; Street");
    expect(html).not.toContain("zoom.us");
    expect(html).toContain("under your sign-in alone");
  });

  it("carries the leader to the leader room", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain(base.leaderRoomUrl);
    expect(html).toContain("OPEN THE LEADER ROOM");
  });

  it("wears the sacred geometry in gold on true black", () => {
    const { html } = buildLeaderPackEmail(base);
    expect(html).toContain(SANCTUM_SKY_BG_URL);
    expect(html).toContain(SANCTUM_MOON_IMG_URL);
    expect(html).not.toContain("seed-bottom"); // one screen, no second band
    expect(html).toContain("#060608");
    expect(html).toContain("#c9a45c");
    expect(html).not.toContain("—");
    expect(html).not.toContain("&mdash;");
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

describe("the seal — no sealed handbook, no entry", () => {
  it("seals two hours before the circle begins", () => {
    expect(HANDBOOK_LOCK_HOURS_BEFORE).toBe(2);
    const sealsAt = handbookSealsAt("2999-12-01T09:00:00.000Z");
    expect(sealsAt.toISOString()).toBe("2999-12-01T07:00:00.000Z");
  });

  it("is open before the seal and shut from the seal onward", () => {
    const start = "2999-12-01T09:00:00.000Z";
    expect(isHandbookSealed(start, new Date("2999-12-01T06:59:59.000Z"))).toBe(false);
    expect(isHandbookSealed(start, new Date("2999-12-01T07:00:00.000Z"))).toBe(true);
    expect(isHandbookSealed(start, new Date("2999-12-01T08:30:00.000Z"))).toBe(true);
    expect(isHandbookSealed(start, new Date("2999-12-01T09:00:00.000Z"))).toBe(true);
  });

  it("states the rule in one plain line", () => {
    expect(HANDBOOK_SEAL_RULE).toContain("two hours before the circle");
    expect(HANDBOOK_SEAL_RULE).toContain("door is closed");
    expect(HANDBOOK_SEAL_RULE).not.toContain("—");
  });

  it("is declared in the summons", () => {
    const { html } = buildHandbookEmail({
      recipientName: "Miriam",
      circleName: "Gosford Circle",
      scheduledAt: "2999-12-01T09:00:00.000Z",
      meetingType: "digital",
      locationName: null,
      attendingCount: 7,
      handbookUrl: "https://meekmeet.com/dashboard/handbook/abc",
    });
    expect(html).toContain("seals two hours before the circle");
    expect(html).toContain("the door is closed");
  });

  it("is declared in the reminder, sharper", () => {
    const { html } = buildHandbookReminderEmail({
      recipientName: "Miriam",
      circleName: "Gosford Circle",
      scheduledAt: "2999-12-01T09:00:00.000Z",
      meetingType: "digital",
      locationName: null,
      handbookUrl: "https://meekmeet.com/dashboard/handbook/abc",
    });
    expect(html).toContain("seals two hours before the circle");
    expect(html).toContain("the door is closed");
  });
});
