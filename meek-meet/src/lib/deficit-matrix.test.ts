import { describe, it, expect } from "vitest";
import { buildDeficitMatrix } from "./deficit-matrix";

describe("buildDeficitMatrix", () => {
  it("counts the authored banks: 21 per personal deficit, 4 per societal", () => {
    const matrix = buildDeficitMatrix([], []);
    expect(matrix).toHaveLength(12);
    for (const row of matrix) {
      expect(row.inBank).toBe(row.deficit.kind === "personal" ? 21 : 4);
      expect(row.drawn).toBe(0);
      expect(row.answered).toBe(0);
      expect(row.sentBack).toBe(0);
      expect(row.answerRate).toBeNull();
    }
  });

  it("aggregates threshold questions into the societal family", () => {
    const matrix = buildDeficitMatrix(
      [
        {
          responses: [
            { question_id: "thr-1", answer: "Housing approval times." }, // stagnation
            { question_id: "thr-9", answer: "" }, // helplessness, unanswered
          ],
        },
      ],
      [{ old_question_id: "thr-5" }] // fragmentation sent back
    );
    const stagnation = matrix.find((r) => r.deficit.id === "stagnation")!;
    const helplessness = matrix.find((r) => r.deficit.id === "helplessness")!;
    const fragmentation = matrix.find((r) => r.deficit.id === "fragmentation")!;
    expect(stagnation.drawn).toBe(1);
    expect(stagnation.answered).toBe(1);
    expect(helplessness.drawn).toBe(1);
    expect(helplessness.answered).toBe(0);
    expect(fragmentation.sentBack).toBe(1);
  });

  it("counts drawn and answered responses per deficit", () => {
    const matrix = buildDeficitMatrix(
      [
        {
          responses: [
            { question_id: "hom-1", answer: "The elderly man at number 9." }, // sloth
            { question_id: "hom-16", answer: "" }, // greed, unanswered
            { question_id: "wor-19", answer: "Not yet, but closer." }, // greed
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
      { old_question_id: "src-4" }, // greed
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
        { question_id: "hom-13", answer: "" }, // wrath unanswered
      ],
    }));
    const swaps = [{ old_question_id: "hom-13" }, { old_question_id: "hom-14" }];
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
