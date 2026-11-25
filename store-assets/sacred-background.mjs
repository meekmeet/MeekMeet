// Generates the full-bleed background for the circle summons emails: a
// black letter whose entire body is sacred geometry. Large Seed of Life
// emblems bleed off the top and bottom edges; a radial vignette darkens the
// centre so the copy stays readable. Gold linework on true black.
//
//   node store-assets/sacred-background.mjs
//
// Output: meek-meet/public/sacred/letter-bg.png

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GOLD = "#c9a45c";
const BLACK = "#060608";
const W = 1200;
const H = 1800;

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

function letterSvg() {
  // ONE Seed of Life, centred, sized so its outer ring spans the full view
  // and bleeds off the edges — the whole background is the one pattern.
  const r = 350;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
      <stop offset="0%" stop-color="${BLACK}" stop-opacity="0.78"/>
      <stop offset="60%" stop-color="${BLACK}" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="${BLACK}" stop-opacity="0.12"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${BLACK}"/>
  ${seedOfLife(W / 2, H / 2, r, 1)}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

async function main() {
  const outDir = resolve(__dirname, "../meek-meet/public/sacred");
  mkdirSync(outDir, { recursive: true });
  const out = resolve(outDir, "letter-bg.png");
  await sharp(Buffer.from(letterSvg()), { density: 120 })
    .resize(900, 1350)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
