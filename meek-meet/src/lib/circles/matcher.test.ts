import { describe, it, expect } from "vitest";
import {
  planCohorts,
  splitSizes,
  haversineKm,
  DEFAULT_CAP,
  DEFAULT_MIN_CLUSTER,
  type MatchableMember,
} from "./matcher";

const K = 111; // ~km per degree of latitude

function member(userId: string, area: string, coords?: { lat: number; lng: number }): MatchableMember {
  return {
    userId,
    areaKey: area.toLowerCase(),
    areaName: area,
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
  };
}

describe("splitSizes", () => {
  it.each([
    [0, 12, []],
    [1, 12, [1]],
    [12, 12, [12]],
    [13, 12, [7, 6]],
    [24, 12, [12, 12]],
    [25, 12, [9, 8, 8]],
    [26, 12, [9, 9, 8]],
    [36, 12, [12, 12, 12]],
    [37, 12, [10, 9, 9, 9]],
  ])("splits %d with cap %d into %j", (n, cap, expected) => {
    expect(splitSizes(n, cap)).toEqual(expected);
  });

  it("never exceeds the cap and keeps sizes balanced", () => {
    for (let n = 1; n <= 200; n++) {
      const sizes = splitSizes(n, DEFAULT_CAP);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(DEFAULT_CAP);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm({ latitude: -33.8, longitude: 151.2 }, { latitude: -33.8, longitude: 151.2 })).toBe(0);
  });

  it("is roughly 111km per degree of latitude", () => {
    const d = haversineKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d!).toBeGreaterThan(110);
    expect(d!).toBeLessThan(112);
  });

  it("returns null when coordinates are missing", () => {
    expect(haversineKm({ latitude: null, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeNull();
    expect(haversineKm({}, { latitude: 1, longitude: 0 })).toBeNull();
  });
});

describe("planCohorts", () => {
  it("uses sensible defaults", () => {
    expect(DEFAULT_CAP).toBe(12);
    expect(DEFAULT_MIN_CLUSTER).toBe(3);
  });

  it("returns no cohorts for an empty member list", () => {
    expect(planCohorts([])).toEqual({ cohorts: [], unassigned: [] });
  });

  it("forms one cohort for a single area at the minimum cluster size", () => {
    const members = [member("a", "Bondi"), member("b", "Bondi"), member("c", "Bondi")];
    const result = planCohorts(members);
    expect(result.cohorts).toHaveLength(1);
    expect(result.cohorts[0].name).toBe("Bondi — Circle 1");
    expect(result.cohorts[0].memberIds).toHaveLength(3);
    expect(result.unassigned).toEqual([]);
  });

  it("never exceeds the cap — 25 members split into three balanced cohorts", () => {
    const members = Array.from({ length: 25 }, (_, i) => member(`u${String(i).padStart(3, "0")}`, "Newtown"));
    const result = planCohorts(members);
    expect(result.cohorts).toHaveLength(3);
    const loads = result.cohorts.map((c) => c.memberIds.length);
    expect(Math.max(...loads)).toBeLessThanOrEqual(12);
    expect(loads.reduce((a, b) => a + b, 0)).toBe(25);
  });

  it("splits into three simultaneous cohorts when the area is big enough", () => {
    const members = Array.from({ length: 30 }, (_, i) => member(`u${String(i).padStart(3, "0")}`, "Parramatta"));
    const result = planCohorts(members);
    expect(result.cohorts).toHaveLength(3);
    expect(result.cohorts.map((c) => c.name)).toEqual([
      "Parramatta — Circle 1",
      "Parramatta — Circle 2",
      "Parramatta — Circle 3",
    ]);
  });

  it("keeps areas below the minimum cluster as leftovers", () => {
    const members = [member("a", "Bondi"), member("b", "Bondi"), member("c", "Bondi"), member("lonely", "Perth")];
    const result = planCohorts(members);
    expect(result.cohorts).toHaveLength(1);
  });

  it("ABSORBS the 1-from-A / 9-from-B case into the nearest cohort", () => {
    // 9 in Newtown (forms a cohort), 1 in nearby Alexandria → absorbed as satellite.
    const members = [
      ...Array.from({ length: 9 }, (_, i) => member(`n${i}`, "Newtown", { lat: -33.9, lng: 151.18 })),
      member("s0", "Alexandria", { lat: -33.91, lng: 151.2 }),
    ];
    const result = planCohorts(members);
    expect(result.cohorts).toHaveLength(1);
    const cohort = result.cohorts[0];
    expect(cohort.memberIds).toHaveLength(9);
    expect(cohort.satelliteMemberIds).toEqual(["s0"]);
    expect(result.unassigned).toEqual([]);
  });

  it("absorbs a satellite toward the GEOGRAPHICALLY nearer cohort, not just the first", () => {
    // Cohort A anchored far west, cohort B anchored east; the satellite sits east.
    const members = [
      ...Array.from({ length: 3 }, (_, i) => member(`w${i}`, "Penrith", { lat: -33.75, lng: 150.7 })),
      ...Array.from({ length: 3 }, (_, i) => member(`e${i}`, "Bondi", { lat: -33.89, lng: 151.27 })),
      member("s", "Bronte", { lat: -33.9, lng: 151.26 }), // ~1km from Bondi, ~40km from Penrith
    ];
    const result = planCohorts(members);
    expect(result.cohorts).toHaveLength(2);
    const bondi = result.cohorts.find((c) => c.areaName === "Bondi")!;
    const penrith = result.cohorts.find((c) => c.areaName === "Penrith")!;
    expect(bondi.satelliteMemberIds).toEqual(["s"]);
    expect(penrith.satelliteMemberIds).toEqual([]);
  });

  it("respects the cap when absorbing — a full cohort never takes a satellite", () => {
    const members = [
      ...Array.from({ length: 12 }, (_, i) => member(`b${i}`, "Bondi", { lat: -33.89, lng: 151.27 })),
      ...Array.from({ length: 3 }, (_, i) => member(`p${i}`, "Parramatta", { lat: -33.81, lng: 151 })),
      member("s", "Bronte", { lat: -33.9, lng: 151.26 }),
    ];
    const result = planCohorts(members);
    const bondi = result.cohorts.find((c) => c.areaName === "Bondi")!;
    const parra = result.cohorts.find((c) => c.areaName === "Parramatta")!;
    expect(bondi.memberIds.length + bondi.satelliteMemberIds.length).toBe(12); // full
    expect(parra.satelliteMemberIds).toEqual(["s"]); // overflow goes to the cohort with space
  });

  it("keeps unassigned members in the global circle when every cohort is full", () => {
    const members = [
      ...Array.from({ length: 12 }, (_, i) => member(`b${i}`, "Bondi")),
      ...Array.from({ length: 12 }, (_, i) => member(`p${i}`, "Parramatta")),
      member("overflow", "Bronte"),
    ];
    const result = planCohorts(members);
    expect(result.unassigned).toEqual(["overflow"]);
  });

  it("honours previous-cycle cohort assignments for stability", () => {
    const ids = Array.from({ length: 13 }, (_, i) => `u${String(i).padStart(3, "0")}`);
    const members = ids.map((id) => member(id, "Newtown"));
    // Previous cycle: u000-u005 together in cohort 0; u006-u012 in cohort 1.
    const existing = [
      { cohortIndex: 0, memberIds: ids.slice(0, 6) },
      { cohortIndex: 1, memberIds: ids.slice(6) },
    ];
    const result = planCohorts(members, { existing });
    const c0 = result.cohorts[0];
    const c1 = result.cohorts[1];
    // Sizes are rebalanced (7+6) but old mates stay grouped in order:
    // cohort 0 opens with the previous cohort 0; u006 overflows into cohort 0
    // and the remainder of the old cohort 1 stays together.
    expect(c0.memberIds).toEqual(ids.slice(0, 7));
    expect(c1.memberIds).toEqual(ids.slice(7));
  });

  it("is deterministic — same input, same plan", () => {
    const members = [
      ...Array.from({ length: 14 }, (_, i) => member(`a${i}`, "Ashfield", { lat: -33.89, lng: 151.13 })),
      member("x", "Dulwich Hill", { lat: -33.9, lng: 151.14 }),
      member("y", "Haberfield", { lat: -33.88, lng: 151.14 }),
    ];
    const r1 = planCohorts(members);
    const r2 = planCohorts(members);
    expect(r1).toEqual(r2);
  });

  it("treats different cased locations as the same area", () => {
    const members = [member("a", "Bondi Beach"), member("b", "bondi beach"), member("c", " BONDI BEACH ")];
    const result = planCohorts(members);
    expect(result.cohorts).toHaveLength(1);
    expect(result.cohorts[0].memberIds).toHaveLength(3);
  });

  it("without coordinates, absorbs into the least-loaded cohort", () => {
    const members = [
      ...Array.from({ length: 5 }, (_, i) => member(`b${i}`, "Bondi")),
      ...Array.from({ length: 3 }, (_, i) => member(`p${i}`, "Parramatta")),
      member("s", "Bronte"),
    ];
    const result = planCohorts(members);
    const parra = result.cohorts.find((c) => c.areaName === "Parramatta")!;
    expect(parra.satelliteMemberIds).toEqual(["s"]); // 3 < 5, so the smaller cohort wins
  });

  it("supports custom caps", () => {
    const members = Array.from({ length: 10 }, (_, i) => member(`u${i}`, "Manly"));
    const result = planCohorts(members, { cap: 4, minCluster: 2 });
    expect(result.cohorts).toHaveLength(3); // 4+3+3
    for (const c of result.cohorts) {
      expect(c.memberIds.length).toBeLessThanOrEqual(4);
    }
  });
});
