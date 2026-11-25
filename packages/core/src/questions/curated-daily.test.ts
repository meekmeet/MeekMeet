import { describe, it, expect } from "vitest";
import { getCuratedVerseForDate, getCuratedDailyVerse } from "./curated-daily";

describe("curated daily verse data", () => {
  // 28 verses are defined in the module; verify rotation integrity by
  // checking distinct verses across a 28-day window and shape of each.
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 0, 1 + i, 12, 0, 0));
    return { date: d, verse: getCuratedVerseForDate(d) };
  });

  it("returns a verse for every day", () => {
    for (const { verse } of days) {
      expect(verse).toBeDefined();
    }
  });

  it("every verse has the full required shape", () => {
    for (const { verse } of days) {
      expect(typeof verse.tradition).toBe("string");
      expect(verse.tradition.length).toBeGreaterThan(0);
      expect(typeof verse.bookId).toBe("string");
      expect(verse.bookId.length).toBeGreaterThan(0);
      expect(typeof verse.book).toBe("string");
      expect(verse.book.length).toBeGreaterThan(0);
      expect(typeof verse.chapter).toBe("number");
      expect(verse.chapter).toBeGreaterThan(0);
      expect(typeof verse.verse).toBe("number");
      expect(verse.verse).toBeGreaterThan(0);
      expect(typeof verse.text).toBe("string");
      expect(verse.text.length).toBeGreaterThan(0);
      expect(typeof verse.reflection).toBe("string");
      expect(verse.reflection.length).toBeGreaterThan(0);
      expect(typeof verse.theme).toBe("string");
      expect(verse.theme.length).toBeGreaterThan(0);
    }
  });

  it("cycles through 28 distinct verses over 28 days", () => {
    const keys = days.map(({ verse }) => `${verse.bookId}:${verse.chapter}:${verse.verse}`);
    expect(new Set(keys).size).toBe(28);
  });

  it("day 29 repeats the cycle (day-of-year modulo)", () => {
    const first = getCuratedVerseForDate(new Date(Date.UTC(2026, 0, 1, 12, 0, 0)));
    const day29 = getCuratedVerseForDate(new Date(Date.UTC(2026, 0, 29, 12, 0, 0)));
    expect(day29).toEqual(first);
  });

  it("spans multiple traditions", () => {
    const traditions = new Set(days.map(({ verse }) => verse.tradition));
    expect(traditions.size).toBeGreaterThanOrEqual(4);
  });

  it("uses well-known tradition identifiers", () => {
    const known = new Set(["bible", "quran", "buddhist", "tanakh", "mormon"]);
    for (const { verse } of days) {
      expect(known.has(verse.tradition)).toBe(true);
    }
  });
});

describe("getCuratedDailyVerse", () => {
  it("returns a verse for today", () => {
    const verse = getCuratedDailyVerse();
    expect(verse).toBeDefined();
    expect(verse.text.length).toBeGreaterThan(0);
  });

  it("matches the date-based selector for today", () => {
    expect(getCuratedDailyVerse()).toEqual(getCuratedVerseForDate(new Date()));
  });
});
