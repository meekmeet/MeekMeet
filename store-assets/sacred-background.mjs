// Generates the background for the circle summons emails:
//
//   new-moon-bg.png — the whole letter's sky: a dark moon bearing the
//   Seed of Life inscribed perfectly within its limb (the seed's outer
//   ring IS the moon's edge), a soft gold glow, and sparse stars.
//
//   node store-assets/sacred-background.mjs
//
// Output: meek-meet/public/sacred/new-moon-bg.png

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GOLD = "#c9a45c";
const BLACK = "#060608";
const W = 900;

// Deterministic pseudo-random (fixed seed) so the star field is stable.
function makeRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function seedOfLife(cx, cy, r, opacity) {
  const parts = [];
  const centres = [[cx, cy]];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    centres.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  for (const [x, y] of centres) {
    parts.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="2" opacity="${opacity}"/>`
    );
  }
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${(r * 1.98).toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="2.2" opacity="${opacity}"/>`
  );
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${(r * 1.84).toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="0.9" opacity="${(opacity * 0.6).toFixed(2)}"/>`
  );
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i - Math.PI / 2;
    const x = cx + r * 1.91 * Math.cos(a);
    const y = cy + r * 1.91 * Math.sin(a);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${GOLD}" opacity="${opacity}"/>`);
  }
  return parts.join("");
}

// ── 1. The new moon ────────────────────────────────────────────
function newMoonSvg() {
  const H = 720;
  const cx = W / 2;
  const cy = 350;
  const r = 150;

  // Sparse, stable star field.
  const rand = makeRandom(42);
  const stars = [];
  for (let i = 0; i < 46; i++) {
    const x = rand() * W;
    const y = rand() * H;
    // Keep the sky clear immediately around the moon.
    if (Math.hypot(x - cx, y - cy) < r + 60) continue;
    const size = 0.8 + rand() * 1.6;
    const opacity = 0.15 + rand() * 0.4;
    stars.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${GOLD}" opacity="${opacity.toFixed(2)}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="${GOLD}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${BLACK}"/>
  ${stars.join("")}
  <circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="url(#glow)"/>
  <!-- the dark disk of the moon, barely lifted from the night -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b0b11"/>
  <!-- the Seed of Life, inscribed so its outer ring IS the moon's limb -->
  ${seedOfLife(cx, cy, r / 1.98, 0.9)}
</svg>`;
}

async function main() {
  const outDir = resolve(__dirname, "../meek-meet/public/sacred");
  mkdirSync(outDir, { recursive: true });

  await sharp(Buffer.from(newMoonSvg()), { density: 120 })
    .resize(W, 720)
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, "new-moon-bg.png"));
  console.log("✓ new-moon-bg.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
