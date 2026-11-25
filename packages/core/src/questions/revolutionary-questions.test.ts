import { describe, it, expect } from "vitest";
import {
  revolutionaryQuestions,
  questionCategories,
} from "./revolutionary-questions";

describe("revolutionary questions data integrity", () => {
  it("defines a substantial question bank", () => {
    expect(revolutionaryQuestions.length).toBeGreaterThanOrEqual(100);
  });

  it("every question has id, category, question text, and context", () => {
    for (const q of revolutionaryQuestions) {
      expect(typeof q.id).toBe("string");
      expect(q.id.length).toBeGreaterThan(0);
      expect(typeof q.category).toBe("string");
      expect(q.category.length).toBeGreaterThan(0);
      expect(typeof q.question).toBe("string");
      expect(q.question.length).toBeGreaterThan(20);
      expect(typeof q.context).toBe("string");
      expect(q.context.length).toBeGreaterThan(0);
    }
  });

  it("question ids are unique", () => {
    const ids = revolutionaryQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every declared category", () => {
    const covered = new Set(revolutionaryQuestions.map((q) => q.category));
    for (const category of questionCategories) {
      expect(covered.has(category)).toBe(true);
    }
  });

  it("only uses categories from the declared list", () => {
    const allowed = new Set<string>(questionCategories);
    for (const q of revolutionaryQuestions) {
      expect(allowed.has(q.category)).toBe(true);
    }
  });

  it("has no placeholder or empty entries", () => {
    for (const q of revolutionaryQuestions) {
      expect(q.question).not.toMatch(/TODO|FIXME|lorem ipsum/i);
      expect(q.question.endsWith("?")).toBe(true);
    }
  });

  it("id prefixes are consistent with their category", () => {
    const prefixOf = (category: string) =>
      category.toLowerCase().slice(0, 4);
    for (const q of revolutionaryQuestions) {
      const prefix = q.id.split("-")[0];
      const categoryPrefix = prefixOf(q.category);
      // e.g. comm-1 → "community", env-3 → "environment"
      expect(categoryPrefix.startsWith(prefix) || prefix.startsWith(categoryPrefix.slice(0, 3))).toBe(true);
    }
  });
});
