import { describe, it, expect } from "vitest";
import {
  computeSendSlots,
  marketingDailyBudget,
  startOfUtcDay,
  windowCapacity,
} from "./pace";

describe("marketingDailyBudget", () => {
  it("defaults to 80 and honours the env override", () => {
    delete process.env.MARKETING_DAILY_BUDGET;
    expect(marketingDailyBudget()).toBe(80);
    process.env.MARKETING_DAILY_BUDGET = "40";
    expect(marketingDailyBudget()).toBe(40);
    process.env.MARKETING_DAILY_BUDGET = "nonsense";
    expect(marketingDailyBudget()).toBe(80);
    delete process.env.MARKETING_DAILY_BUDGET;
  });
});

describe("windowCapacity", () => {
  it("splits the daily budget across the four windows", () => {
    expect(windowCapacity(80)).toBe(20);
    expect(windowCapacity(40)).toBe(10);
    expect(windowCapacity(2)).toBe(1); // never zero — a window always sends something
  });
});

describe("startOfUtcDay", () => {
  it("returns midnight UTC", () => {
    const d = new Date("2026-07-22T13:45:00Z");
    expect(startOfUtcDay(d).toISOString()).toBe("2026-07-22T00:00:00.000Z");
  });
});

describe("computeSendSlots", () => {
  // Fixed "now": 2026-07-22 01:00 UTC — the next windows that day are
  // 02:30, 05:30 and 08:30 UTC (12:30/15:30/18:30 AEST), then 23:30 UTC.
  const now = new Date("2026-07-22T01:00:00Z");

  it("fills each window to capacity before moving to the next", () => {
    const slots = computeSendSlots(now, 0, 45, 80);
    expect(slots).toHaveLength(45);
    // Capacity 20: the first 20 land in the 02:30 window.
    expect(slots[0].toISOString()).toBe("2026-07-22T02:30:00.000Z");
    expect(slots[19].toISOString()).toBe("2026-07-22T02:30:00.000Z");
    expect(slots[20].toISOString()).toBe("2026-07-22T05:30:00.000Z");
    expect(slots[39].toISOString()).toBe("2026-07-22T05:30:00.000Z");
    // Spillover rolls to the next day rather than bursting the window.
    expect(slots[40].toISOString()).toBe("2026-07-22T08:30:00.000Z");
    expect(slots[44].toISOString()).toBe("2026-07-22T08:30:00.000Z");
  });

  it("reserves slots for sequences queued by earlier runs", () => {
    const slots = computeSendSlots(now, 18, 4, 80);
    // 18 already queued → only 2 slots remain in the first window.
    expect(slots[0].toISOString()).toBe("2026-07-22T02:30:00.000Z");
    expect(slots[1].toISOString()).toBe("2026-07-22T02:30:00.000Z");
    expect(slots[2].toISOString()).toBe("2026-07-22T05:30:00.000Z");
    expect(slots[3].toISOString()).toBe("2026-07-22T05:30:00.000Z");
  });

  it("never returns a slot in the past", () => {
    const late = new Date("2026-07-22T02:35:00Z"); // just after the 02:30 window
    const slots = computeSendSlots(late, 0, 3, 80);
    for (const s of slots) expect(s.getTime()).toBeGreaterThan(late.getTime());
    expect(slots[0].toISOString()).toBe("2026-07-22T05:30:00.000Z");
  });

  it("staggers a 300-lead batch across days at 20 per window", () => {
    const slots = computeSendSlots(now, 0, 300, 80);
    expect(slots).toHaveLength(300);
    expect(slots[299].getTime()).toBeGreaterThan(slots[0].getTime());
    // 300 ÷ 20 = 15 windows ÷ 4 per day → at least 4 days of runway.
    const days = (slots[299].getTime() - slots[0].getTime()) / (24 * 3600 * 1000);
    expect(days).toBeGreaterThanOrEqual(3);
  });
});
