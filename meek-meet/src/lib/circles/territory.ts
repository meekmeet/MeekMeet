// Circle territory — one suburb, one circle, until the circle overflows.
//
// When a leader is approved, their suburb is CLAIMED: a circle is created
// for it and no rival circle forms there. The lock releases only when
// demand outgrows the claiming leader's capacity — every circle in the
// suburb is full (the seat cap), or enough unseated members from the suburb
// are waiting in the global circle. Then the suburb opens for a NEW leader
// and a successor circle (Gosford II, III, …). Growth by overflow, never by
// competition.

import { DEFAULT_CAP } from "@/lib/circles/matcher";

/** Waiting members from a suburb that force expansion (matches the
 *  circle-organizer's spinout threshold). */
export const EXPANSION_DEMAND = 8;

/** Normalize a free-text suburb/location into a claim key. Must match the
 *  normalization used by the circle-organizer and member_areas. */
export function normalizeAreaKey(location: string): string {
  return location.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Australian state/territory tokens, always rendered uppercase. */
const STATE_TOKENS = new Set(["nsw", "vic", "qld", "sa", "wa", "tas", "nt", "act"]);

/** Title-case an area name, preserving state tokens like NSW. */
export function titleCaseArea(area: string): string {
  return area
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (STATE_TOKENS.has(lower)) return lower.toUpperCase();
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function toRoman(n: number): string {
  const table: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let rest = Math.max(0, Math.floor(n));
  let out = "";
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

export type SuburbStatus = "open" | "claimed" | "expandable";

export interface SuburbCircleSeat {
  memberCount: number;
}

/**
 * The state of a suburb:
 *  - open:       no active circle claims it — a new leader may claim it.
 *  - claimed:    an active circle holds it and has room — the suburb is locked.
 *  - expandable: the claim has overflowed (all circles full, or enough
 *                unseated demand waiting) — a NEW leader may open the next
 *                circle in the same suburb.
 */
export function suburbStatus(options: {
  circles: SuburbCircleSeat[];
  waitingCount: number;
  cap?: number;
  expansionDemand?: number;
}): SuburbStatus {
  const cap = options.cap ?? DEFAULT_CAP;
  const demand = options.expansionDemand ?? EXPANSION_DEMAND;
  if (options.circles.length === 0) return "open";
  if (options.waitingCount >= demand) return "expandable";
  if (options.circles.every((c) => c.memberCount >= cap)) return "expandable";
  return "claimed";
}

/** The name of the Nth circle in a suburb: base name, then II, III, … */
export function circleNameForSuburb(rawLocation: string, existingCount: number): string {
  const base = `New Moon Circle — ${titleCaseArea(rawLocation)}`;
  return existingCount === 0 ? base : `${base} ${toRoman(existingCount + 1)}`;
}

/** Slug base for a suburb circle (callers add collision suffixes). */
export function circleSlugForSuburb(rawLocation: string, existingCount: number): string {
  const kebab = normalizeAreaKey(rawLocation)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return existingCount === 0 ? `new-moon-${kebab}` : `new-moon-${kebab}-${existingCount + 1}`;
}
