import { describe, it, expect } from "vitest";
import { LEADER_GUIDE, LEADER_GUIDE_INTRO } from "./leader-guide";

describe("the leader's training corpus", () => {
  it("carries at least eight chapters", () => {
    expect(LEADER_GUIDE.length).toBeGreaterThanOrEqual(8);
  });

  it("has unique ids and non-empty titles and bodies", () => {
    const ids = new Set(LEADER_GUIDE.map((c) => c.id));
    expect(ids.size).toBe(LEADER_GUIDE.length);
    for (const chapter of LEADER_GUIDE) {
      expect(chapter.title.trim().length).toBeGreaterThan(3);
      expect(chapter.body.trim().length).toBeGreaterThan(200);
    }
  });

  it("teaches the shepherd doctrine: everyone is a shepherd, the leader is first among them", () => {
    const all = LEADER_GUIDE.map((c) => c.body).join(" ");
    expect(all).toContain("first among shepherds");
    expect(all).toMatch(/every member is a shepherd/i);
    // The facilitator is never the shepherd of the members.
    expect(all).not.toMatch(/the leader is the shepherd/i);
  });

  it("names the spark openly and honours every faith", () => {
    const all = LEADER_GUIDE.map((c) => c.body).join(" ");
    expect(all).toContain("meek shall inherit the earth");
    expect(all).toContain("Matthew 5:5");
    expect(all).toMatch(/Muslim/);
    expect(all).toMatch(/Jewish/);
  });

  it("teaches the seal and the read-what-you-wrote engine", () => {
    const all = LEADER_GUIDE.map((c) => c.body).join(" ");
    expect(all).toContain("two hours before the circle");
    expect(all).toContain("reads what they have already written");
  });

  it("teaches the no-clock rule and the crisis path", () => {
    const all = LEADER_GUIDE.map((c) => c.body).join(" ");
    expect(all).toContain("hold the order, never the clock");
    expect(all).toMatch(/carry it to us/);
  });

  it("has an intro that asks the leader to return", () => {
    expect(LEADER_GUIDE_INTRO).toContain("first circle");
  });
});
