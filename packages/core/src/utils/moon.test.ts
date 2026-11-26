import { describe, it, expect } from "vitest";
import {
  getNextNewMoon,
  getPreviousNewMoon,
  getNearestNewMoon,
  daysFromNearestNewMoon,
  isNewMoonDay,
  formatNewMoon,
} from "./moon";

// Mirror of the private constant in moon.ts.
const SYNODIC_MONTH = 29.53058867;

describe("getNextNewMoon", () => {
  it("returns a date in the future by default", () => {
    const next = getNextNewMoon();
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns a new moon on or after the given date", () => {
    const from = new Date("2026-06-15T12:00:00Z");
    const next = getNextNewMoon(from);
    expect(next.getTime()).toBeGreaterThanOrEqual(from.getTime());
  });

  it("consecutive results are one synodic month apart", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const next = getNextNewMoon(from);
    const after = getNextNewMoon(new Date(next.getTime() + 1));
    const gapDays = (after.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
    expect(gapDays).toBeCloseTo(SYNODIC_MONTH, 5);
  });

  it("is deterministic for the same input", () => {
    const from = new Date("2027-03-20T08:30:00Z");
    expect(getNextNewMoon(from).getTime()).toBe(getNextNewMoon(from).getTime());
  });

  it("is timezone-independent (result depends only on the UTC instant)", () => {
    // Same instant expressed two ways must give the same new moon. The old
    // implementation rebuilt the input from local-time getters, so the
    // answer shifted with the host TZ — green in Sydney, red on UTC CI.
    const a = getNextNewMoon(new Date("2026-01-01T00:00:00Z"));
    const b = getNextNewMoon(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)));
    expect(a.getTime()).toBe(b.getTime());
  });

  it("one millisecond after a new moon, the next one is a full month away", () => {
    // Float-precision regression: the boundary instant must never map back
    // onto itself.
    const first = getNextNewMoon(new Date("2026-01-01T00:00:00Z"));
    const second = getNextNewMoon(new Date(first.getTime() + 1));
    expect(second.getTime()).toBeGreaterThan(first.getTime() + 28 * 24 * 3600 * 1000);
  });

  it("matches a known astronomical new moon (2026-02-17) within a day", () => {
    // Known new moon: 17 February 2026 ~12:01 UTC.
    const from = new Date("2026-02-10T00:00:00Z");
    const next = getNextNewMoon(from);
    const known = new Date("2026-02-17T12:01:00Z");
    expect(Math.abs(next.getTime() - known.getTime())).toBeLessThan(24 * 3600 * 1000);
  });

  it("matches a second known new moon (2026-03-19) within a day", () => {
    const from = new Date("2026-02-20T00:00:00Z");
    const next = getNextNewMoon(from);
    const known = new Date("2026-03-19T01:23:00Z");
    expect(Math.abs(next.getTime() - known.getTime())).toBeLessThan(24 * 3600 * 1000);
  });

  it("handles dates far in the past", () => {
    const from = new Date("2001-01-01T00:00:00Z");
    const next = getNextNewMoon(from);
    expect(next.getTime()).toBeGreaterThanOrEqual(from.getTime());
    expect(next.getTime()).toBeLessThan(from.getTime() + 40 * 24 * 3600 * 1000);
  });

  it("handles dates far in the future", () => {
    const from = new Date("2100-06-01T00:00:00Z");
    const next = getNextNewMoon(from);
    expect(next.getTime()).toBeGreaterThanOrEqual(from.getTime());
    expect(next.getTime()).toBeLessThan(from.getTime() + 40 * 24 * 3600 * 1000);
  });
});

describe("getPreviousNewMoon", () => {
  it("returns a date in the past by default", () => {
    expect(getPreviousNewMoon().getTime()).toBeLessThan(Date.now());
  });

  it("is one synodic month before the next new moon", () => {
    const from = new Date("2026-05-05T00:00:00Z");
    const prev = getPreviousNewMoon(from);
    const next = getNextNewMoon(from);
    const gapDays = (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    expect(gapDays).toBeCloseTo(SYNODIC_MONTH, 5);
  });

  it("returns a date strictly before the given date", () => {
    const from = new Date("2026-05-05T00:00:00Z");
    expect(getPreviousNewMoon(from).getTime()).toBeLessThan(from.getTime());
  });
});

describe("getNearestNewMoon", () => {
  it("returns the next new moon when it is closer", () => {
    const next = getNextNewMoon(new Date("2026-06-15T12:00:00Z"));
    const probe = new Date(next.getTime() - 24 * 3600 * 1000);
    expect(getNearestNewMoon(probe).getTime()).toBe(next.getTime());
  });

  it("returns the previous new moon when it is closer", () => {
    const next = getNextNewMoon(new Date("2026-06-15T12:00:00Z"));
    const prev = new Date(next.getTime() - Math.round(SYNODIC_MONTH * 24 * 3600 * 1000));
    const probe = new Date(prev.getTime() + 24 * 3600 * 1000);
    expect(getNearestNewMoon(probe).getTime()).toBe(prev.getTime());
  });

  it("is close to zero at a known new moon instant", () => {
    expect(daysFromNearestNewMoon(new Date("2026-02-17T12:01:00Z"))).toBeLessThan(2);
  });
});

describe("daysFromNearestNewMoon", () => {
  it("is ~14.77 mid-cycle (full moon)", () => {
    const full = new Date("2026-02-17T12:01:00Z").getTime() + Math.round((SYNODIC_MONTH / 2) * 24 * 3600 * 1000);
    const days = daysFromNearestNewMoon(new Date(full));
    expect(days).toBeGreaterThan(13);
    expect(days).toBeLessThan(16);
  });
});

describe("isNewMoonDay", () => {
  it("accepts a gathering on the new moon itself", () => {
    const next = getNextNewMoon(new Date("2026-06-15T12:00:00Z"));
    expect(isNewMoonDay(next)).toBe(true);
  });

  it("accepts the evening before or after (within tolerance)", () => {
    const next = getNextNewMoon(new Date("2026-06-15T12:00:00Z"));
    expect(isNewMoonDay(new Date(next.getTime() - 20 * 3600 * 1000))).toBe(true);
    expect(isNewMoonDay(new Date(next.getTime() + 20 * 3600 * 1000))).toBe(true);
  });

  it("rejects a date a week away from any new moon", () => {
    const next = getNextNewMoon(new Date("2026-06-15T12:00:00Z"));
    expect(isNewMoonDay(new Date(next.getTime() + 7 * 24 * 3600 * 1000))).toBe(false);
  });

  it("respects a custom tolerance", () => {
    const next = getNextNewMoon(new Date("2026-06-15T12:00:00Z"));
    const threeDaysOut = new Date(next.getTime() + 3 * 24 * 3600 * 1000);
    expect(isNewMoonDay(threeDaysOut, 1.5)).toBe(false);
    expect(isNewMoonDay(threeDaysOut, 3.5)).toBe(true);
  });
});

describe("formatNewMoon", () => {
  it("formats a date in the en-AU long form", () => {
    const formatted = formatNewMoon(new Date(Date.UTC(2026, 1, 17, 12, 0, 0)));
    expect(formatted).toMatch(/February/);
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/17/);
  });

  it("includes the weekday", () => {
    // 2026-02-17 was a Tuesday.
    expect(formatNewMoon(new Date(Date.UTC(2026, 1, 17, 12, 0, 0)))).toMatch(/Tuesday/);
  });
});
