// Downloads the site's Google Fonts as self-hosted woff2 files so builds
// never depend on a live fonts.googleapis.com fetch (which flakes on both
// Vercel and local machines). Run once when fonts change:
//   node meek-meet/scripts/download-fonts.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../src/app/fonts");
mkdirSync(outDir, { recursive: true });

const FAMILIES = [
  {
    key: "cormorant",
    css: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap",
  },
  {
    key: "source",
    css: "https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap",
  },
  {
    key: "caveat",
    css: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap",
  },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

for (const family of FAMILIES) {
  const res = await fetch(family.css, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${family.key}: css fetch failed ${res.status}`);
  const css = await res.text();

  // Each @font-face is preceded by a subset comment; keep latin only.
  const blocks = css.split("/*").filter((b) => b.startsWith(" latin */"));
  for (const block of blocks) {
    const style = /font-style:\s*(\w+)/.exec(block)?.[1] ?? "normal";
    const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
    const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(block)?.[1];
    if (!weight || !url) continue;
    const file = `${family.key}-${weight}${style === "italic" ? "-italic" : ""}.woff2`;
    const fontRes = await fetch(url);
    if (!fontRes.ok) throw new Error(`${file}: download failed ${fontRes.status}`);
    writeFileSync(join(outDir, file), Buffer.from(await fontRes.arrayBuffer()));
    console.log(`${file} <- ${url.split("/").pop()}`);
  }
}
console.log("Done ->", outDir);
