import { describe, it, expect } from "vitest";
import {
  CIRCLE_TOPICS,
  CIRCLE_TOPIC_COUNT,
  allTopicQuestionIds,
  drawQuestions,
  getTopicById,
  getTopicForDate,
  getTopicForWeekday,
  sydneyWeekday,
} from "./circle-topics";

describe("circle topic bank integrity", () => {
  it("has exactly one topic for each day of the week", () => {
    expect(CIRCLE_TOPIC_COUNT).toBe(7);
    const days = CIRCLE_TOPICS.map((t) => t.dayOfWeek).sort();
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("gives every topic a name, epithet, and symbolism", () => {
    for (const topic of CIRCLE_TOPICS) {
      expect(topic.name.length).toBeGreaterThan(2);
      expect(topic.epithet.length).toBeGreaterThan(2);
      expect(topic.symbolism.length).toBeGreaterThan(40);
    }
  });

  it("has a deep bank for every topic (at least 10 questions)", () => {
    for (const topic of CIRCLE_TOPICS) {
      expect(topic.questions.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("has globally unique topic ids and question ids", () => {
    const topicIds = CIRCLE_TOPICS.map((t) => t.id);
    expect(new Set(topicIds).size).toBe(topicIds.length);
    const questionIds = allTopicQuestionIds();
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  it("namespaces question ids under their topic prefix", () => {
    for (const topic of CIRCLE_TOPICS) {
      for (const q of topic.questions) {
        expect(q.id).toMatch(/^[a-z]{3}-\d+$/);
        expect(q.text.length).toBeGreaterThan(30);
        expect(q.text.trim()).toBe(q.text);
      }
    }
  });

  it("writes questions to be spoken — every question ends with a question mark", () => {
    for (const topic of CIRCLE_TOPICS) {
      for (const q of topic.questions) {
        expect(q.text.endsWith("?")).toBe(true);
      }
    }
  });
});

describe("topic lookup", () => {
  it("finds a topic by id", () => {
    expect(getTopicById("the-source")?.dayOfWeek).toBe(0);
    expect(getTopicById("justice-and-the-common-good")?.dayOfWeek).toBe(6);
    expect(getTopicById("nope")).toBeNull();
  });

  it("maps every weekday to its topic", () => {
    expect(getTopicForWeekday(0).id).toBe("the-source");
    expect(getTopicForWeekday(1).id).toBe("beginnings");
    expect(getTopicForWeekday(2).id).toBe("home-and-street");
    expect(getTopicForWeekday(3).id).toBe("work-and-provision");
    expect(getTopicForWeekday(4).id).toBe("healing-and-wholeness");
    expect(getTopicForWeekday(5).id).toBe("family-and-generations");
    expect(getTopicForWeekday(6).id).toBe("justice-and-the-common-good");
  });

  it("throws on an out-of-range weekday", () => {
    expect(() => getTopicForWeekday(7)).toThrow();
    expect(() => getTopicForWeekday(-1)).toThrow();
  });
});

describe("sydneyWeekday — circle themes follow the local day", () => {
  it("computes the weekday in Australia/Sydney, not UTC", () => {
    // 2026-01-04 is a Sunday in Sydney. 13:00 UTC = midnight Monday Sydney,
    // so the Sydney weekday must already be Monday.
    const utcSundayAfternoon = new Date("2026-01-04T13:30:00Z");
    expect(utcSundayAfternoon.getUTCDay()).toBe(0);
    expect(sydneyWeekday(utcSundayAfternoon)).toBe(1);
  });

  it("agrees with UTC during Sydney daytime", () => {
    // 2026-01-07 02:00 UTC = 13:00 Wednesday in Sydney (UTC+11, DST).
    const d = new Date("2026-01-07T02:00:00Z");
    expect(sydneyWeekday(d)).toBe(3);
  });

  it("feeds getTopicForDate", () => {
    // A Saturday-evening meeting in Sydney is a Justice circle.
    const saturday = new Date("2026-01-03T09:00:00Z"); // 20:00 AEDT Saturday
    expect(getTopicForDate(saturday).id).toBe("justice-and-the-common-good");
  });
});

describe("drawQuestions — the questions are never fixed", () => {
  const topic = getTopicForWeekday(2); // home-and-street, 12 questions

  it("draws the requested number of questions", () => {
    expect(drawQuestions(topic, 3)).toHaveLength(3);
  });

  it("never draws the same question twice in one draw", () => {
    for (let i = 0; i < 50; i++) {
      const draw = drawQuestions(topic, 8);
      const ids = draw.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("only draws questions from the given topic", () => {
    const ids = new Set(topic.questions.map((q) => q.id));
    for (const q of drawQuestions(topic, 12)) {
      expect(ids.has(q.id)).toBe(true);
    }
  });

  it("excludes questions already in play (the regenerate path)", () => {
    const first = drawQuestions(topic, 11);
    const remaining = drawQuestions(topic, 3, {
      excludeIds: first.map((q) => q.id),
    });
    expect(remaining).toHaveLength(1);
    expect(first.map((q) => q.id)).not.toContain(remaining[0].id);
  });

  it("returns the whole remaining pool when asked for more than exists", () => {
    const draw = drawQuestions(topic, 99);
    expect(draw).toHaveLength(topic.questions.length);
  });

  it("returns an empty draw when everything is excluded", () => {
    const all = topic.questions.map((q) => q.id);
    expect(drawQuestions(topic, 3, { excludeIds: all })).toHaveLength(0);
  });

  it("is deterministic with an injected random source", () => {
    const seq = [0.5, 0.1, 0.9, 0.3, 0.7];
    let i = 0;
    const rng = () => seq[i++ % seq.length];
    const a = drawQuestions(topic, 4, { random: rng }).map((q) => q.id);
    i = 0;
    const b = drawQuestions(topic, 4, { random: rng }).map((q) => q.id);
    expect(a).toEqual(b);
  });

  it("actually varies across draws (not a fixed order)", () => {
    const draws = new Set<string>();
    for (let i = 0; i < 30; i++) {
      draws.add(drawQuestions(topic, 5).map((q) => q.id).join(","));
    }
    // 30 random 5-draws from a 12-question bank colliding into one sequence
    // is astronomically unlikely.
    expect(draws.size).toBeGreaterThan(1);
  });
});
