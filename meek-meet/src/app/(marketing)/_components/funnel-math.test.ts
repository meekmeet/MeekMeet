import { describe, it, expect } from "vitest";
import {
  funnelHalfWidth,
  funnelCenterX,
  particlePosition,
  seedOfLifeCenters,
  flowerOfLifeCenters,
  starField,
  seededRandom,
} from "./funnel-math";

describe("funnelHalfWidth", () => {
  it("opens at the mouth and narrows monotonically toward the throat", () => {
    let prev = Infinity;
    for (let s = 0; s <= 40; s++) {
      const t = s / 40;
      if (t > 0.92) break; // flare zone excluded
      const w = funnelHalfWidth(t, 200, 20);
      expect(w).toBeLessThanOrEqual(prev + 1e-9);
      prev = w;
    }
    expect(funnelHalfWidth(0, 200, 20)).toBe(200);
    expect(funnelHalfWidth(0.92, 200, 20)).toBeLessThan(21);
    expect(funnelHalfWidth(1, 200, 20)).toBeGreaterThan(20);
  });

  it("flares open at the very base so the stream blooms into the light", () => {
    const throat = funnelHalfWidth(0.92, 200, 20);
    const base = funnelHalfWidth(1, 200, 20);
    expect(base).toBeGreaterThan(throat);
  });

  it("clamps out-of-range t", () => {
    expect(funnelHalfWidth(-1, 200, 20)).toBe(funnelHalfWidth(0, 200, 20));
    expect(funnelHalfWidth(2, 200, 20)).toBe(funnelHalfWidth(1, 200, 20));
  });
});

describe("funnelCenterX", () => {
  it("starts dead centre at the mouth and stays within sway everywhere", () => {
    expect(funnelCenterX(0, 300, 12)).toBeCloseTo(300, 5);
    for (let s = 0; s <= 100; s++) {
      const x = funnelCenterX(s / 100, 300, 12);
      expect(Math.abs(x - 300)).toBeLessThanOrEqual(12 + 1e-9);
    }
  });

  it("stays within sway of centre", () => {
    for (let s = 0; s <= 100; s++) {
      const x = funnelCenterX(s / 100, 300, 12);
      expect(Math.abs(x - 300)).toBeLessThanOrEqual(12 + 1e-9);
    }
  });
});

describe("particlePosition", () => {
  it("never strays outside the funnel walls", () => {
    for (let s = 0; s <= 100; s++) {
      const t = s / 100;
      const pos = particlePosition(t, 300, 200, 20, 12, 0.37, 2.4);
      const half = funnelHalfWidth(t, 200, 20);
      const centre = funnelCenterX(t, 300, 12);
      expect(Math.abs(pos.x - centre)).toBeLessThanOrEqual(half * 0.34);
      expect(pos.y).toBe(t);
    }
  });

  it("is deterministic for the same seed and phase", () => {
    const a = particlePosition(0.5, 300, 200, 20, 12, 0.42, 1.1);
    const b = particlePosition(0.5, 300, 200, 20, 12, 0.42, 1.1);
    expect(a).toEqual(b);
  });
});

describe("seedOfLifeCenters", () => {
  it("returns seven centres: one plus six on the circumference", () => {
    const centers = seedOfLifeCenters(100, 100, 40);
    expect(centers).toHaveLength(7);
    expect(centers[0]).toEqual({ x: 100, y: 100 });
    for (let i = 1; i < 7; i++) {
      const dist = Math.hypot(centers[i].x - 100, centers[i].y - 100);
      expect(dist).toBeCloseTo(40, 5);
    }
  });

  it("places the six petals at 60-degree steps (first petal due north)", () => {
    const centers = seedOfLifeCenters(0, 0, 10);
    expect(centers[1].x).toBeCloseTo(0, 5);
    expect(centers[1].y).toBeCloseTo(-10, 5);
  });
});

describe("flowerOfLifeCenters", () => {
  it("counts 1 + 6 + 12 + 18 = 37 centres for three rings", () => {
    expect(flowerOfLifeCenters(0, 0, 10, 3)).toHaveLength(37);
  });
});

describe("starField", () => {
  it("keeps every star inside the bounds and is deterministic", () => {
    const a = starField(50, 400, 300, 2.1);
    const b = starField(50, 400, 300, 2.1);
    expect(a).toEqual(b);
    for (const star of a) {
      expect(star.x).toBeGreaterThanOrEqual(400 / 2 - 400 * 0.48 - 1e-9);
      expect(star.x).toBeLessThanOrEqual(400 / 2 + 400 * 0.48 + 1e-9);
      expect(star.y).toBeGreaterThanOrEqual(150 - 300 * 0.48 - 1e-9);
      expect(star.y).toBeLessThanOrEqual(150 + 300 * 0.48 + 1e-9);
    }
  });
});

describe("seededRandom", () => {
  it("returns values in [0, 1) and is deterministic", () => {
    for (let i = 0; i < 200; i++) {
      const v = seededRandom(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(seededRandom(i)).toBe(v);
    }
  });
});
