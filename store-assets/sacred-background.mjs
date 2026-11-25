// Generates the artwork for the circle summons emails:
//
//   star-sky-bg.png — the letter's background: true black with a sparse,
//                     stable field of gold stars.
//   moon-seed.png   — the moon herself: a luminous face with the Seed of
//                     Life etched within it (the seed's outer ring IS the
//                     moon's limb), carried in the letter as a real <img>
//                     so the copy always flows beneath her and no text
//                     ever crosses her face.
//
//   node store-assets/sacred-background.mjs
//
// Output: meek-meet/public/sacred/star-sky-bg.png + moon-seed.png

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

function seedOfLife(cx, cy, r, opacity, color = GOLD) {
  const parts = [];
  const centres = [[cx, cy]];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    centres.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  for (const [x, y] of centres) {
    parts.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity}"/>`
    );
  }
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${(r * 1.98).toFixed(1)}" fill="none" stroke="${color}" stroke-width="2.2" opacity="${opacity}"/>`
  );
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${(r * 1.84).toFixed(1)}" fill="none" stroke="${color}" stroke-width="0.9" opacity="${(opacity * 0.6).toFixed(2)}"/>`
  );
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i - Math.PI / 2;
    const x = cx + r * 1.91 * Math.cos(a);
    const y = cy + r * 1.91 * Math.sin(a);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${color}" opacity="${opacity}"/>`);
  }
  return parts.join("");
}

// ── 1. The star sky (the letter's background) ──────────────────
function starSkySvg() {
  const H = 720;
  const rand = makeRandom(42);
  const stars = [];
  for (let i = 0; i < 52; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const size = 0.8 + rand() * 1.6;
    const opacity = 0.15 + rand() * 0.4;
    stars.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${GOLD}" opacity="${opacity.toFixed(2)}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BLACK}"/>
  ${stars.join("")}
</svg>`;
}

// ── 2. The moon bearing the Seed of Life ───────────────────────
function moonSeedSvg() {
  const S = 600;
  const cx = S / 2;
  const cy = S / 2;
  const r = 208;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="${GOLD}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="moonface" cx="42%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#f4e9cb"/>
      <stop offset="62%" stop-color="#ddcda7"/>
      <stop offset="100%" stop-color="#ac9a74"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="${BLACK}"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 1.42}" fill="url(#glow)"/>
  <!-- the moon herself: a luminous face, lit from above -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#moonface)"/>
  <!-- the Seed of Life, etched into the face so its outer ring IS the limb -->
  ${seedOfLife(cx, cy, r / 1.98, 0.85, "#6e5a36")}
</svg>`;
}

async function main() {
  const outDir = resolve(__dirname, "../meek-meet/public/sacred");
  mkdirSync(outDir, { recursive: true });

  await sharp(Buffer.from(starSkySvg()), { density: 120 })
    .resize(W, 720)
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, "star-sky-bg.png"));
  console.log("✓ star-sky-bg.png");

  await sharp(Buffer.from(moonSeedSvg()), { density: 120 })
    .resize(600, 600)
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, "moon-seed.png"));
  console.log("✓ moon-seed.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
