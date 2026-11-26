// Pure geometry for the "From a Question to a Change" funnel animation.
// Kept free of DOM/canvas so every curve can be unit-tested.

export interface Point {
  x: number;
  y: number;
}

/**
 * Half-width of the funnel throat at normalised depth t (0 = mouth, 1 = base).
 * Eases from wide open at the mouth to a tight throat, then flares slightly
 * open again into the radiant base so particles bloom outward on arrival.
 */
export function funnelHalfWidth(t: number, mouthWidth: number, throatWidth: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  // Smooth narrowing: cubic ease-in toward the throat.
  const narrow = Math.pow(1 - clamped, 2.4);
  let w = throatWidth + (mouthWidth - throatWidth) * narrow;
  // Final 8%: gentle flare so the stream opens into the light.
  if (clamped > 0.92) {
    const flare = (clamped - 0.92) / 0.08;
    w = w + throatWidth * 1.6 * flare * flare;
  }
  return w;
}

/**
 * Horizontal centreline of the funnel: a slow S-sway so the stream feels
 * organic rather than plumb-line straight.
 */
export function funnelCenterX(t: number, centerX: number, sway: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return centerX + sway * Math.sin(clamped * Math.PI * 1.6);
}

/**
 * A particle's centreline position at progress t, with a per-particle
 * wobble that tightens as the throat narrows (the funnel concentrates the stream).
 */
export function particlePosition(
  t: number,
  centerX: number,
  mouthWidth: number,
  throatWidth: number,
  sway: number,
  wobbleSeed: number,
  wobblePhase: number
): Point {
  const clamped = Math.min(1, Math.max(0, t));
  const width = funnelHalfWidth(clamped, mouthWidth, throatWidth);
  const wobble =
    Math.sin(wobblePhase + wobbleSeed * Math.PI * 2) * width * 0.32 * Math.sin(clamped * Math.PI);
  return { x: funnelCenterX(clamped, centerX, sway) + wobble, y: clamped };
}

/**
 * The seven centres of a Seed of Life: one central circle plus six on its
 * circumference at 60-degree steps. `r` is the radius of each petal circle.
 */
export function seedOfLifeCenters(cx: number, cy: number, r: number): Point[] {
  const centers: Point[] = [{ x: cx, y: cy }];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    centers.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return centers;
}

/**
 * Hexagonal lattice centres for a Flower of Life backdrop of `rings` rings.
 */
export function flowerOfLifeCenters(cx: number, cy: number, r: number, rings: number): Point[] {
  const centers: Point[] = [{ x: cx, y: cy }];
  for (let ring = 1; ring <= rings; ring++) {
    for (let i = 0; i < 6 * ring; i++) {
      const angle = (Math.PI / (3 * ring)) * i - Math.PI / 2;
      centers.push({
        x: cx + ring * r * Math.cos(angle),
        y: cy + ring * r * Math.sin(angle),
      });
    }
  }
  return centers;
}

/** Golden-angle (137.5-degree) distribution for background star fields. */
export function starField(count: number, width: number, height: number, seed: number): Point[] {
  const stars: Point[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const radius = Math.sqrt((i + 0.5) / count);
    const angle = i * goldenAngle + seed;
    stars.push({
      x: width / 2 + Math.cos(angle) * radius * width * 0.48,
      y: height / 2 + Math.sin(angle) * radius * height * 0.48,
    });
  }
  return stars;
}

/** Deterministic pseudo-random in [0, 1) from an integer seed (mulberry32-style). */
export function seededRandom(seed: number): number {
  let a = seed >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
