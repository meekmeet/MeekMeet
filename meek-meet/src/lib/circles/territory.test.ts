import { describe, it, expect } from "vitest";
import {
  EXPANSION_DEMAND,
  normalizeAreaKey,
  titleCaseArea,
  suburbStatus,
  circleNameForSuburb,
  circleSlugForSuburb,
} from "./territory";
import { DEFAULT_CAP } from "@/lib/circles/matcher";

describe("normalizeAreaKey", () => {
  it("normalizes case and whitespace into a stable claim key", () => {
    expect(normalizeAreaKey("  Gosford   NSW ")).toBe("gosford nsw");
    expect(normalizeAreaKey("GOSFORD NSW")).toBe("gosford nsw");
    expect(normalizeAreaKey("gosford nsw")).toBe("gosford nsw");
  });
});

describe("titleCaseArea", () => {
  it("title-cases suburbs and preserves state abbreviations", () => {
    expect(titleCaseArea("gosford nsw")).toBe("Gosford NSW");
    expect(titleCaseArea("lake macquarie")).toBe("Lake Macquarie");
  });
});

describe("suburbStatus — the claim and its release", () => {
  it("is open when no circle claims the suburb", () => {
    expect(suburbStatus({ circles: [], waitingCount: 0 })).toBe("open");
    expect(suburbStatus({ circles: [], waitingCount: 50 })).toBe("open");
  });

  it("is claimed while the claiming circle has room", () => {
    expect(
      suburbStatus({ circles: [{ memberCount: 5 }], waitingCount: 0 })
    ).toBe("claimed");
    expect(
      suburbStatus({ circles: [{ memberCount: DEFAULT_CAP - 1 }], waitingCount: 2 })
    ).toBe("claimed");
  });

  it("releases when every circle in the suburb is full", () => {
    expect(
      suburbStatus({
        circles: [{ memberCount: DEFAULT_CAP }],
        waitingCount: 0,
      })
    ).toBe("expandable");
    expect(
      suburbStatus({
        circles: [{ memberCount: DEFAULT_CAP }, { memberCount: DEFAULT_CAP + 2 }],
        waitingCount: 0,
      })
    ).toBe("expandable");
  });

  it("stays claimed if ANY circle in the suburb still has room", () => {
    expect(
      suburbStatus({
        circles: [{ memberCount: DEFAULT_CAP }, { memberCount: 3 }],
        waitingCount: 0,
      })
    ).toBe("claimed");
  });

  it("releases when enough unseated demand is waiting, even with room left", () => {
    expect(
      suburbStatus({
        circles: [{ memberCount: 4 }],
        waitingCount: EXPANSION_DEMAND,
      })
    ).toBe("expandable");
    expect(
      suburbStatus({
        circles: [{ memberCount: 4 }],
        waitingCount: EXPANSION_DEMAND - 1,
      })
    ).toBe("claimed");
  });

  it("honours a configured cap", () => {
    expect(
      suburbStatus({ circles: [{ memberCount: 6 }], waitingCount: 0, cap: 6 })
    ).toBe("expandable");
  });
});

describe("successor naming", () => {
  it("names the first circle plainly and successors in Roman numerals", () => {
    expect(circleNameForSuburb("gosford nsw", 0)).toBe("New Moon Circle — Gosford NSW");
    expect(circleNameForSuburb("gosford nsw", 1)).toBe("New Moon Circle — Gosford NSW II");
    expect(circleNameForSuburb("gosford nsw", 2)).toBe("New Moon Circle — Gosford NSW III");
  });

  it("slugs match the names", () => {
    expect(circleSlugForSuburb("Gosford NSW", 0)).toBe("new-moon-gosford-nsw");
    expect(circleSlugForSuburb("Gosford NSW", 1)).toBe("new-moon-gosford-nsw-2");
  });
});
