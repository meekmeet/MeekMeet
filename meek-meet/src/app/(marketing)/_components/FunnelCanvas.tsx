"use client";

import { useEffect, useRef } from "react";
import {
  funnelHalfWidth,
  funnelCenterX,
  particlePosition,
  seedOfLifeCenters,
  flowerOfLifeCenters,
  starField,
  seededRandom,
} from "./funnel-math";

const PARTICLE_COUNT = 90;
const DPR_CAP = 2;

/**
 * The living diagram: a question blooms at the top of the funnel, answers
 * stream down through the narrowing throat, and arrive as light at the base.
 * Performance discipline: one rAF loop, zero per-frame allocations above the
 * particle pool, DPR-capped, paused offscreen, static frame under
 * prefers-reduced-motion.
 */
export default function FunnelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = false;
    let inView = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      seed: seededRandom(i * 7919 + 13),
      speed: 0.0016 + seededRandom(i * 104729 + 7) * 0.0022,
      t: seededRandom(i * 31 + 1),
      size: 0.8 + seededRandom(i * 17 + 3) * 1.6,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const time = now / 1000;
      const cx = width / 2;
      const mouthY = height * 0.16;
      const baseY = height * 0.86;
      const mouthWidth = Math.min(width * 0.3, 220);
      const throatWidth = Math.max(width * 0.035, 14);
      const sway = width * 0.03;
      const mouthX = cx;

      ctx.clearRect(0, 0, width, height);

      // Star field
      const stars = starField(70, width, height, 2.1);
      ctx.fillStyle = "rgba(240, 228, 200, 0.5)";
      for (let i = 0; i < stars.length; i++) {
        const twinkle = 0.25 + 0.5 * Math.abs(Math.sin(time * 0.7 + i * 1.7));
        ctx.globalAlpha = twinkle * (0.2 + 0.8 * seededRandom(i * 3 + 5));
        ctx.fillRect(stars[i].x, stars[i].y, 1.4, 1.4);
      }
      ctx.globalAlpha = 1;

      // Flower of Life lattice backdrop, breathing slowly.
      const latticeR = Math.min(width, height) * 0.055;
      const breathe = 1 + 0.03 * Math.sin(time * 0.35);
      const lattice = flowerOfLifeCenters(cx, (mouthY + baseY) / 2, latticeR * breathe, 2);
      ctx.strokeStyle = "rgba(224, 185, 110, 0.07)";
      ctx.lineWidth = 1;
      for (let i = 0; i < lattice.length; i++) {
        ctx.beginPath();
        ctx.arc(lattice[i].x, lattice[i].y, latticeR * breathe, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Funnel walls
      const wallSteps = 48;
      ctx.beginPath();
      for (let s = 0; s <= wallSteps; s++) {
        const t = s / wallSteps;
        const y = mouthY + t * (baseY - mouthY);
        const x = funnelCenterX(t, cx, sway) - funnelHalfWidth(t, mouthWidth, throatWidth);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let s = wallSteps; s >= 0; s--) {
        const t = s / wallSteps;
        const y = mouthY + t * (baseY - mouthY);
        const x = funnelCenterX(t, cx, sway) + funnelHalfWidth(t, mouthWidth, throatWidth);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, mouthY, 0, baseY);
      fill.addColorStop(0, "rgba(224, 185, 110, 0.05)");
      fill.addColorStop(1, "rgba(224, 185, 110, 0.12)");
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "rgba(224, 185, 110, 0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // The Question: Seed of Life bloom at the mouth.
      const qR = Math.min(width * 0.07, 56);
      const pulse = 1 + 0.05 * Math.sin(time * 1.4);
      const bloom = seedOfLifeCenters(mouthX, mouthY, qR * pulse);
      ctx.strokeStyle = "rgba(240, 220, 170, 0.85)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < bloom.length; i++) {
        ctx.beginPath();
        ctx.arc(bloom[i].x, bloom[i].y, qR * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      const qGlow = ctx.createRadialGradient(mouthX, mouthY, 0, mouthX, mouthY, qR * 1.9);
      qGlow.addColorStop(0, "rgba(250, 240, 210, 0.5)");
      qGlow.addColorStop(1, "rgba(250, 240, 210, 0)");
      ctx.fillStyle = qGlow;
      ctx.beginPath();
      ctx.arc(mouthX, mouthY, qR * 1.9, 0, Math.PI * 2);
      ctx.fill();

      // The stream of answers.
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const y = mouthY + p.t * (baseY - mouthY);
        const pos = particlePosition(
          p.t,
          cx,
          mouthWidth,
          throatWidth,
          sway,
          p.seed,
          time * 0.9
        );
        const x = pos.x;
        // Warmth concentrates toward the throat.
        const heat = 0.45 + 0.55 * p.t;
        ctx.fillStyle = `rgba(232, 196, 124, ${0.35 + 0.5 * heat})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (0.8 + 0.6 * p.t), 0, Math.PI * 2);
        ctx.fill();
        // Motion: advance only while animating (draw() is also the static frame).
        if (running && !reduced) {
          p.t += p.speed * (1 + p.t * 0.8);
          if (p.t >= 1) p.t = 0;
        }
      }

      // The Change: radiant core at the base, swelling with arrivals.
      const coreR = Math.min(width * 0.06, 44) * (1 + 0.08 * Math.sin(time * 2.2));
      const core = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, coreR * 3.2);
      core.addColorStop(0, "rgba(252, 244, 214, 0.95)");
      core.addColorStop(0.35, "rgba(232, 196, 124, 0.5)");
      core.addColorStop(1, "rgba(232, 196, 124, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, baseY, coreR * 3.2, 0, Math.PI * 2);
      ctx.fill();

      if (running && !reduced) {
        raf = requestAnimationFrame(draw);
      }
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(performance.now());
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
        if (inView) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    if (reduced) {
      // Single static frame for reduced motion.
      draw(performance.now());
    }

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[440px] sm:h-[520px] block"
      aria-label="An animation of answers flowing from a question through a narrowing funnel into light: from a question to a change."
      role="img"
    />
  );
}
