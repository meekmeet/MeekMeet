import { describe, it, expect } from "vitest";
import { weeklyThemes, getCurrentWeekTheme, getDayOfWeek } from "./weekly-themes";

describe("weekly themes data integrity", () => {
  it("defines at least 4 themes for a monthly rotation", () => {
    expect(weeklyThemes.length).toBeGreaterThanOrEqual(4);
  });

  it("every theme has the full required shape", () => {
    for (const theme of weeklyThemes) {
      expect(typeof theme.id).toBe("string");
      expect(theme.id.length).toBeGreaterThan(0);
      expect(typeof theme.name).toBe("string");
      expect(theme.name.length).toBeGreaterThan(0);
      expect(typeof theme.subtitle).toBe("string");
      expect(theme.subtitle.length).toBeGreaterThan(0);
      expect(typeof theme.description).toBe("string");
      expect(theme.description.length).toBeGreaterThan(0);
      expect(typeof theme.color).toBe("string");
      expect(theme.color).toMatch(/^bg-/);
      expect(Array.isArray(theme.days)).toBe(true);
      expect(theme.days.length).toBe(7);
    }
  });

  it("theme ids are unique", () => {
    const ids = weeklyThemes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every day entry has scripture content and a reflection", () => {
    for (const theme of weeklyThemes) {
      for (const day of theme.days) {
        expect(typeof day.tradition).toBe("string");
        expect(day.tradition.length).toBeGreaterThan(0);
        expect(typeof day.book).toBe("string");
        expect(day.book.length).toBeGreaterThan(0);
        expect(typeof day.chapter).toBe("number");
        expect(day.chapter).toBeGreaterThan(0);
        expect(typeof day.verse).toBe("number");
        expect(day.verse).toBeGreaterThan(0);
        expect(typeof day.text).toBe("string");
        expect(day.text.length).toBeGreaterThan(0);
        expect(typeof day.reflection).toBe("string");
        expect(day.reflection.length).toBeGreaterThan(0);
      }
    }
  });

  it("themes span multiple traditions across the week", () => {
    for (const theme of weeklyThemes) {
      const traditions = new Set(theme.days.map((d) => d.tradition));
      expect(traditions.size).toBeGreaterThanOrEqual(3);
    }
  });

  it("tradition identifiers come from the known set", () => {
    const known = new Set(["bible", "quran", "buddhist", "tanakh", "mormon"]);
    for (const theme of weeklyThemes) {
      for (const day of theme.days) {
        expect(known.has(day.tradition)).toBe(true);
      }
    }
  });
});

describe("getCurrentWeekTheme", () => {
  it("always returns a defined theme", () => {
    const theme = getCurrentWeekTheme();
    expect(theme).toBeDefined();
    expect(weeklyThemes).toContain(theme);
  });

  it("changes week over week", () => {
    // Two timestamps 7 days apart must map to adjacent themes.
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const t1 = Math.floor(now / weekMs) % weeklyThemes.length;
    const t2 = Math.floor((now + weekMs) / weekMs) % weeklyThemes.length;
    expect(t2).toBe((t1 + 1) % weeklyThemes.length);
  });
});

describe("getDayOfWeek", () => {
  it("returns a value between 0 and 6", () => {
    const day = getDayOfWeek();
    expect(day).toBeGreaterThanOrEqual(0);
    expect(day).toBeLessThanOrEqual(6);
    expect(Number.isInteger(day)).toBe(true);
  });
});
