/**
 * Calculate the next new moon after the given instant.
 * Uses a simplified astronomical algorithm accurate to within a day or two.
 * Pure UTC-instant math: the result is identical in every timezone.
 */

export interface MoonEvent {
  date: Date;
  phase: "new" | "first_quarter" | "full" | "last_quarter";
}

// Days between new moons (synodic month)
const SYNODIC_MONTH = 29.53058867;
const SYNODIC_MS = SYNODIC_MONTH * 24 * 60 * 60 * 1000;

// Known new moon: 6 January 2000 at 18:14 UTC (J2000.0 epoch reference)
const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));

export function getNextNewMoon(from: Date = new Date()): Date {
  const elapsed = from.getTime() - KNOWN_NEW_MOON.getTime();
  let cycles = Math.floor(elapsed / SYNODIC_MS) + 1;
  let nextMs = KNOWN_NEW_MOON.getTime() + cycles * SYNODIC_MS;

  // Float division near a cycle boundary can land one cycle low; the loop
  // guarantees the result is always strictly after `from`.
  while (nextMs <= from.getTime()) {
    cycles += 1;
    nextMs = KNOWN_NEW_MOON.getTime() + cycles * SYNODIC_MS;
  }

  return new Date(Math.round(nextMs));
}

export function getPreviousNewMoon(from: Date = new Date()): Date {
  const next = getNextNewMoon(from);
  return new Date(next.getTime() - Math.round(SYNODIC_MS));
}

export function formatNewMoon(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
