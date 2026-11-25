import { describe, it, expect } from "vitest";
import {
  HANDBOOK_INTROS,
  HANDBOOK_LEAD_DAYS,
  buildHandbookEmail,
  buildHandbookQuestions,
  handbookComplete,
  handbookVariant,
} from "./handbook";

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
});

describe("buildHandbookEmail", () => {
  const base = {
    recipientName: "Miriam",
    circleName: "Gosford Circle",
    scheduledAt: "2026-12-01T09:00:00.000Z",
    locationName: "Gosford Library",
    questions: [
      { question_id: "q1", question: "What would make your street safer?", answer: "" },
      { question_id: "q2", question: "Who has no one to eat with?", answer: "" },
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
    expect(html).toContain("What would make your street safer?");
    expect(html).toContain("Who has no one to eat with?");
  });

  it("links to the member's handbook form", () => {
    const { html } = buildHandbookEmail({ ...base, variant: "first_circle" });
    expect(html).toContain("https://meekmeet.com/dashboard/handbook/abc");
    expect(html).toContain("OPEN YOUR HANDBOOK");
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
      recipientName: '<script>alert(1)</script>',
      circleName: '<img src=x>',
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

describe("HANDBOOK_LEAD_DAYS", () => {
  it("is four days", () => {
    expect(HANDBOOK_LEAD_DAYS).toBe(4);
  });
});
