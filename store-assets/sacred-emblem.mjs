// Generates the sacred-geometry emblem used in the circle summons emails.
//
// The Seed of Life — seven interlocking circles (seven days of the circle
// week, seven root deficits) inside a ring of twelve points (the twelve
// seats of a circle). Gold linework on transparency, rasterized to PNG
// because email clients cannot be trusted with SVG.
//
//   node store-assets/sacred-emblem.mjs
//
// Output: meek-meet/public/sacred/seed-of-life.png (served at
// https://meekmeet.com/sacred/seed-of-life.png)

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GOLD = "#c9a45c";
const SIZE = 640;
const C = SIZE / 2;
const R = 150; // radius of each of the seven circles

function seedOfLifeSvg() {
  const parts = [];

  // The seven: one at the centre, six around it at 60° intervals.
  const centres = [[C, C]];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    centres.push([C + R * Math.cos(a), C + R * Math.sin(a)]);
  }
  for (const [x, y] of centres) {
    parts.push(
      `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${R}" fill="none" stroke="${GOLD}" stroke-width="2.4" opacity="0.92"/>`
    );
  }

  // The enclosing rings.
  parts.push(
    `<circle cx="${C}" cy="${C}" r="298" fill="none" stroke="${GOLD}" stroke-width="2.6"/>`
  );
  parts.push(
    `<circle cx="${C}" cy="${C}" r="276" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.55"/>`
  );

  // The twelve points — the seats — set on the outer band at 30° intervals.
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i - Math.PI / 2;
    const x = C + 287 * Math.cos(a);
    const y = C + 287 * Math.sin(a);
    parts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.2" fill="${GOLD}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join("")}</svg>`;
}

async function main() {
  const outDir = resolve(__dirname, "../meek-meet/public/sacred");
  mkdirSync(outDir, { recursive: true });

  const svg = Buffer.from(seedOfLifeSvg());
  const out = resolve(outDir, "seed-of-life.png");
  await sharp(svg, { density: 300 }).resize(640, 640).png({ compressionLevel: 9 }).toFile(out);
  console.log(`✓ ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
