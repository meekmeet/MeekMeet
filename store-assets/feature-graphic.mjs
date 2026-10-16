// Play Store feature graphic (1024x500) — two review variants.
// Same brand universe as the 32 screenshots: midnight gradient canvas,
// wheat radial glow, SVG-turbulence grain, Cormorant Garamond + Source Sans 3.

import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, 'output')
const W = 1024, H = 500

const FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">`

const grainURI =
  'url("data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='240' height='240' filter='url(#n)' opacity='0.55'/></svg>`
  ) +
  '")'

const BRAND_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body { position: relative; background: linear-gradient(180deg, #141728 0%, #1e2337 100%); }
  .glow { position: absolute; inset: 0; background: radial-gradient(ellipse 90% 80% at 50% -10%, rgba(201,169,110,0.10), rgba(201,169,110,0) 68%); }
  .grain { position: absolute; inset: 0; background-image: ${grainURI}; opacity: 0.05; mix-blend-mode: overlay; pointer-events: none; }
  .serif { font-family: 'Cormorant Garamond', Georgia, serif; }
  .sans { font-family: 'Source Sans 3', system-ui, sans-serif; }
`

// ── shared generators (deterministic) ────────────────────────────────────

// Seeded PRNG so star fields are reproducible run to run
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const stars = (seed, count, area) => {
  const rnd = mulberry32(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = area.x + rnd() * area.w
    const y = area.y + rnd() * area.h
    const s = rnd() < 0.85 ? 1 : 2
    const o = (0.15 + rnd() * 0.55).toFixed(2)
    out += `<div style="position:absolute;left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;width:${s}px;height:${s}px;border-radius:50%;background:#faf6ee;opacity:${o}"></div>`
  }
  return out
}

// Crescent moon: luminous wheat disc carved by an offset transparent circle
// in the mask (pure CSS radial mask). size in px; cut 0..1 (0=new, .5=half, 1=full-ish)
const crescent = (size, cut, glow = true) => `
  <div style="position:relative;width:${size}px;height:${size}px">
    ${glow ? `<div style="position:absolute;inset:-45%;border-radius:50%;background:radial-gradient(circle, rgba(217,189,138,.38), rgba(217,189,138,.10) 45%, transparent 70%)"></div>` : ''}
    <div style="position:absolute;inset:0;border-radius:50%;
      background:radial-gradient(circle at 38% 36%, #faf3e3, #e8d3a8 45%, #c9a96e 100%);
      box-shadow:0 0 ${Math.round(size * 0.35)}px rgba(217,189,138,.45), inset -8px -10px 24px rgba(120,90,40,.35);
      -webkit-mask-image:radial-gradient(circle ${Math.round(size * 0.42)}px at ${Math.round(50 + cut * 46)}% 34%, transparent 97%, #000 100%);
              mask-image:radial-gradient(circle ${Math.round(size * 0.42)}px at ${Math.round(50 + cut * 46)}% 34%, transparent 97%, #000 100%)"></div>
  </div>`

// Moon-phase dot row: new -> full -> new
const phaseRow = (n, dot, gap, opacity) => {
  const mid = (n - 1) / 2
  let dots = ''
  for (let i = 0; i < n; i++) {
    const cut = Math.abs(i - mid) / mid // 1 at ends (new), 0 at center (full)
    dots += `<div style="position:relative;width:${dot}px;height:${dot}px;opacity:${cut > 0.97 ? 0.35 : 1}">
      <div style="position:absolute;inset:0;border-radius:50%;background:#d9bd8a"></div>
      <div style="position:absolute;inset:0;border-radius:50%;background:#1e2337;
        transform:translateX(${(cut * 96).toFixed(0)}%)"></div>
    </div>`
  }
  return `<div style="display:flex;gap:${gap}px;opacity:${opacity};align-items:center">${dots}</div>`
}

// Ellipse orbit ring (rotated, hairline)
const orbit = (w, h, rot, opacity, top, left) => `
  <div style="position:absolute;top:${top}px;left:${left}px;width:${w}px;height:${h}px;
    border:1px solid rgba(217,189,138,${opacity});border-radius:50%;transform:rotate(${rot}deg)"></div>`

// ── variant A: moon-right ────────────────────────────────────────────────

const variantA = `
  ${stars(7, 46, { x: 520, y: 30, w: 460, h: 380 })}
  ${stars(11, 22, { x: 60, y: 30, w: 380, h: 150 })}
  ${orbit(560, 190, -18, 0.30, 130, 520)}
  <div style="position:absolute;top:88px;left:596px;z-index:2">${crescent(290, 0.34)}</div>
  <div style="position:absolute;top:420px;left:700px;z-index:3">${phaseRow(9, 9, 10, 0.75)}</div>
  <div style="position:absolute;left:88px;top:96px;z-index:4;width:500px">
    <div class="sans" style="font-weight:600;font-size:20px;letter-spacing:0.4em;color:#c9a96e">A SACRED SPACE FOR THE QUIET ONES</div>
    <div class="serif" style="font-weight:600;font-size:96px;line-height:1.02;color:#faf6ee;margin-top:16px;white-space:nowrap">Meek Meet</div>
    <div class="serif" style="font-style:italic;font-weight:500;font-size:32px;line-height:1.25;color:#d9bd8a;margin-top:14px;max-width:440px">The meek, organised, are the strongest force in society.</div>
    <div class="sans" style="font-weight:400;font-size:17px;color:#b8b4a6;margin-top:16px;letter-spacing:0.06em">Blessed are the meek — Matthew 5:5</div>
  </div>`

// ── variant B: centered emblem ───────────────────────────────────────────

const variantB = `
  ${stars(23, 52, { x: 40, y: 24, w: 944, h: 300 })}
  ${orbit(640, 210, -8, 0.26, 60, 192)}
  <div style="position:absolute;top:42px;left:50%;transform:translateX(-50%);z-index:2">${crescent(168, 0.34)}</div>
  <div style="position:absolute;top:238px;left:0;right:0;text-align:center;z-index:4">
    <div class="serif" style="font-weight:600;font-size:96px;line-height:1;color:#faf6ee">Meek Meet</div>
    <div class="serif" style="font-style:italic;font-weight:500;font-size:30px;line-height:1.3;color:#d9bd8a;margin-top:14px">The meek, organised, are the strongest force in society.</div>
    <div class="sans" style="font-weight:600;font-size:14px;letter-spacing:0.4em;color:#c9a96e;margin-top:18px">A SACRED SPACE FOR THE QUIET ONES</div>
  </div>
  <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:3">${phaseRow(11, 8, 9, 0.55)}</div>`

function page(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT_LINKS}
<style>${BRAND_CSS}</style></head>
<body><div class="glow"></div>${body}<div class="grain"></div>
<script>(async()=>{await document.fonts.ready;requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__done=true}))})()<\/script>
</body></html>`
}

function pngSize(file) {
  const b = fs.readFileSync(file)
  return b.readUInt32BE(0) === 0x89504e47 ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({ headless: true })
  const page_ = await browser.newPage()
  await page_.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  let allOk = true
  for (const [name, body] of [['a', variantA], ['b', variantB]]) {
    await page_.setContent(page(body), { waitUntil: 'load', timeout: 60000 })
    await page_.evaluate(() => document.fonts.ready)
    await page_.waitForFunction('window.__done === true', { timeout: 15000 })
    const file = path.join(OUT, `feature-graphic-${name}.png`)
    await page_.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } })
    const dim = pngSize(file)
    const ok = !!dim && dim.w === W && dim.h === H
    if (!ok) allOk = false
    console.log(`${ok ? 'OK ' : 'BAD'} output/feature-graphic-${name}.png ${dim.w}x${dim.h} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`)
  }
  await browser.close()
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
