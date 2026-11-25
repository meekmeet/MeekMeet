// Cohort matching engine for virtual-first circles.
//
// The genius, in one paragraph: geography is a preference, not a prison.
// Areas with enough members form their own cohorts (never exceeding the cap);
// areas too small to sustain a cohort are ABSORBED into the nearest cohort
// with spare capacity as satellite members, so nobody sits in a "circle" of
// one; and previous-cycle assignments are honoured wherever possible, because
// the relationship — not the postcode — is the product.
//
// Pure functions, fully deterministic (ties broken by user id), no I/O — the
// route supplies the members, existing cohorts, and caps; this module returns
// a plan.

export interface MatchableMember {
  userId: string;
  areaKey: string;
  areaName: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ExistingCohort {
  cohortIndex: number;
  memberIds: string[];
}

export interface CohortPlan {
  index: number;
  name: string;
  areaKey: string;
  areaName: string;
  /** Members anchored to this cohort's area (includes absorbed locals). */
  memberIds: string[];
  /** Members absorbed in from a different area. */
  satelliteMemberIds: string[];
}

export interface MatchOptions {
  /** Maximum members per cohort. Default 12. */
  cap?: number;
  /** Minimum members for an area to form its own cohort. Default 3. */
  minCluster?: number;
  /** Previous-cycle cohorts, for stability. */
  existing?: ExistingCohort[];
}

export interface MatchResult {
  cohorts: CohortPlan[];
  /** Members with no seat anywhere (stay in the undivided global circle). */
  unassigned: string[];
}

export const DEFAULT_CAP = 12;
export const DEFAULT_MIN_CLUSTER = 3;

/** Great-circle distance in km; null when either side lacks coordinates. */
export function haversineKm(
  a: { latitude?: number | null; longitude?: number | null },
  b: { latitude?: number | null; longitude?: number | null }
): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function centroid(members: MatchableMember[]): { latitude?: number; longitude?: number } {
  const withCoords = members.filter(
    (m) => m.latitude != null && m.longitude != null
  );
  if (withCoords.length === 0) return {};
  return {
    latitude: withCoords.reduce((s, m) => s + m.latitude!, 0) / withCoords.length,
    longitude: withCoords.reduce((s, m) => s + m.longitude!, 0) / withCoords.length,
  };
}

/** Balanced split of n members into k cohorts (all ≤ cap, sizes differ by ≤ 1). */
export function splitSizes(n: number, cap: number): number[] {
  if (n <= 0 || cap <= 0) return [];
  const k = Math.ceil(n / cap);
  const base = Math.floor(n / k);
  const remainder = n - base * k;
  return Array.from({ length: k }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** Sort members so previous cohort-mates stay adjacent (stability). */
function stabilize(
  members: MatchableMember[],
  existing: ExistingCohort[]
): MatchableMember[] {
  if (existing.length === 0) {
    return [...members].sort((a, b) => a.userId.localeCompare(b.userId));
  }
  const rank = new Map<string, number>();
  for (const cohort of [...existing].sort((a, b) => a.cohortIndex - b.cohortIndex)) {
    for (const id of cohort.memberIds) {
      if (!rank.has(id)) rank.set(id, cohort.cohortIndex);
    }
  }
  return [...members].sort((a, b) => {
    const ra = rank.get(a.userId);
    const rb = rank.get(b.userId);
    if (ra !== rb) return (ra ?? Number.MAX_SAFE_INTEGER) - (rb ?? Number.MAX_SAFE_INTEGER);
    return a.userId.localeCompare(b.userId);
  });
}

export function planCohorts(members: MatchableMember[], options: MatchOptions = {}): MatchResult {
  const cap = Math.max(2, options.cap ?? DEFAULT_CAP);
  const minCluster = Math.max(2, options.minCluster ?? DEFAULT_MIN_CLUSTER);
  const existing = options.existing ?? [];

  const byArea = new Map<string, MatchableMember[]>();
  for (const m of members) {
    // Normalize keys defensively: trim, collapse whitespace, lowercase.
    const key = m.areaKey.trim().toLowerCase().replace(/\s+/g, " ");
    const list = byArea.get(key);
    if (list) list.push(m);
    else byArea.set(key, [m]);
  }

  const areas = Array.from(byArea.entries())
    .map(([key, list]) => ({
      key,
      members: stabilize(list, existing),
      center: centroid(list),
      name: list[0].areaName,
    }))
    .sort((a, b) => b.members.length - a.members.length || a.key.localeCompare(b.key));

  const cohorts: CohortPlan[] = [];
  const leftovers: MatchableMember[] = [];

  // 1. Large areas split into cap-bounded balanced cohorts.
  for (const area of areas) {
    if (area.members.length < minCluster) {
      leftovers.push(...area.members);
      continue;
    }
    const sizes = splitSizes(area.members.length, cap);
    let offset = 0;
    sizes.forEach((size, i) => {
      const slice = area.members.slice(offset, offset + size);
      offset += size;
      cohorts.push({
        index: cohorts.length,
        name: `${area.name} — Circle ${i + 1}`,
        areaKey: area.key,
        areaName: area.name,
        memberIds: slice.map((m) => m.userId),
        satelliteMemberIds: [],
      });
    });
  }

  // 2. Absorb leftovers into the nearest cohort with spare capacity.
  leftovers.sort((a, b) => a.userId.localeCompare(b.userId));
  for (const member of leftovers) {
    let best: CohortPlan | null = null;
    // Lower is better; null means "unmeasurable" (no coordinates anywhere).
    let bestScore: number | null = null;

    for (const cohort of cohorts) {
      const load = cohort.memberIds.length + cohort.satelliteMemberIds.length;
      if (load >= cap) continue;

      // A cohort anchored to the member's own area always wins.
      if (cohort.areaKey === member.areaKey.trim().toLowerCase().replace(/\s+/g, " ")) {
        best = cohort;
        bestScore = -1;
        break;
      }

      const d = haversineKm(member, cohortCentroid(cohort, byArea));

      if (best === null) {
        best = cohort;
        bestScore = d;
      } else if (bestScore !== null && d !== null) {
        if (d < bestScore) {
          best = cohort;
          bestScore = d;
        }
      } else if (bestScore === null && d !== null) {
        // A measurable distance beats an unmeasurable one.
        best = cohort;
        bestScore = d;
      } else {
        // Both unmeasurable: prefer the least-loaded cohort for balance.
        const bestLoad = best.memberIds.length + best.satelliteMemberIds.length;
        if (load < bestLoad) best = cohort;
      }
    }

    if (best) {
      best.satelliteMemberIds.push(member.userId);
    }
  }

  // 3. Anyone still without a seat stays in the undivided global circle.
  const seated = new Set(
    cohorts.flatMap((c) => [...c.memberIds, ...c.satelliteMemberIds])
  );
  const unassigned = members.map((m) => m.userId).filter((id) => !seated.has(id));

  return { cohorts, unassigned };
}

function cohortCentroid(
  cohort: CohortPlan,
  byArea: Map<string, MatchableMember[]>
): { latitude?: number; longitude?: number } {
  const area = byArea.get(cohort.areaKey);
  return area ? centroid(area) : {};
}
