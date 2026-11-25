import { describe, it, expect } from "vitest";
import { buildDeficitMatrix } from "./deficit-matrix";

describe("buildDeficitMatrix", () => {
  it("counts the authored bank: 12 questions per deficit", () => {
    const matrix = buildDeficitMatrix([], []);
    expect(matrix).toHaveLength(7);
    for (const row of matrix) {
      expect(row.inBank).toBe(12);
      expect(row.drawn).toBe(0);
      expect(row.answered).toBe(0);
      expect(row.sentBack).toBe(0);
      expect(row.answerRate).toBeNull();
    }
  });

  it("counts drawn and answered responses per deficit", () => {
    const matrix = buildDeficitMatrix(
      [
        {
          responses: [
            { question_id: "hom-1", answer: "The elderly man at number 9." }, // sloth
            { question_id: "hom-11", answer: "" }, // greed, unanswered
            { question_id: "wor-12", answer: "Not yet, but closer." }, // greed
          ],
        },
      ],
      []
    );
    const sloth = matrix.find((r) => r.deficit.id === "sloth")!;
    const greed = matrix.find((r) => r.deficit.id === "greed")!;
    expect(sloth.drawn).toBe(1);
    expect(sloth.answered).toBe(1);
    expect(sloth.answerRate).toBe(1);
    expect(greed.drawn).toBe(2);
    expect(greed.answered).toBe(1);
    expect(greed.answerRate).toBe(0.5);
  });

  it("treats whitespace-only answers as unanswered", () => {
    const matrix = buildDeficitMatrix(
      [{ responses: [{ question_id: "hom-1", answer: "   " }] }],
      []
    );
    const sloth = matrix.find((r) => r.deficit.id === "sloth")!;
    expect(sloth.drawn).toBe(1);
    expect(sloth.answered).toBe(0);
  });

  it("counts sent-back questions from the swap log per deficit", () => {
    const matrix = buildDeficitMatrix([], [
      { old_question_id: "hom-1" }, // sloth
      { old_question_id: "hom-2" }, // sloth
      { old_question_id: "src-3" }, // greed
    ]);
    const sloth = matrix.find((r) => r.deficit.id === "sloth")!;
    const greed = matrix.find((r) => r.deficit.id === "greed")!;
    expect(sloth.sentBack).toBe(2);
    expect(greed.sentBack).toBe(1);
  });

  it("ignores questions outside the gated bank (leader customs)", () => {
    const matrix = buildDeficitMatrix(
      [{ responses: [{ question_id: "custom-1", answer: "an answer" }] }],
      [{ old_question_id: "custom-1" }]
    );
    for (const row of matrix) {
      expect(row.drawn).toBe(0);
      expect(row.sentBack).toBe(0);
    }
  });

  it("handles handbooks with null responses", () => {
    const matrix = buildDeficitMatrix([{ responses: null }], []);
    expect(matrix.every((r) => r.drawn === 0)).toBe(true);
  });

  it("aggregates across many handbooks — the community ratio", () => {
    const handbooks = Array.from({ length: 10 }, () => ({
      responses: [
        { question_id: "hom-1", answer: "someone" }, // sloth answered
        { question_id: "hom-9", answer: "" }, // wrath unanswered
      ],
    }));
    const swaps = [{ old_question_id: "hom-9" }, { old_question_id: "hom-10" }];
    const matrix = buildDeficitMatrix(handbooks, swaps);
    const sloth = matrix.find((r) => r.deficit.id === "sloth")!;
    const wrath = matrix.find((r) => r.deficit.id === "wrath")!;
    expect(sloth.drawn).toBe(10);
    expect(sloth.answerRate).toBe(1);
    expect(wrath.drawn).toBe(10);
    expect(wrath.answered).toBe(0);
    expect(wrath.answerRate).toBe(0);
    expect(wrath.sentBack).toBe(2);
  });
});
