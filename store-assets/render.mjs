// Meek Meet — Google Play store screenshot render pipeline.
// Renders 8 concepts × 3 device frames as exact-size PNG artboards.
// Two-pass per image: measure the real (font-loaded) text block height, then
// compute device geometry to fit the remaining space on an 8px grid, center
// the device under the text, and screenshot at the exact target size.

import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONCEPTS, buildScreen, SCREEN_CSS } from './screens.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, 'output')

const snap8 = (v) => Math.round(v / 8) * 8

const DEVICES = [
  { dir: 'phone', W: 1080, H: 1920, kind: 'phone' },
  { dir: 'tablet7', W: 1920, H: 1200, kind: 'tablet' },
  { dir: 'tablet10', W: 2560, H: 1600, kind: 'tablet10', s: 2560 / 1920 },
  { dir: 'chromebook', W: 1920, H: 1080, kind: 'chromebook' },
]

// Uniform scale of the 1080-reference grid. The phone canvas is 1080×1920 so
// s = 1 there (the exact spec grid); larger canvases scale proportionally by
// their smaller dimension so type and margins keep the same rhythm and the
// device keeps maximum room below the text block.
const scaleFor = (W, H) => Math.min(W, H) / 1080

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

function textBlockCSS(s, W, margin) {
  return `
  #textblock { position: absolute; left: ${margin}px; top: ${margin}px; width: ${W - 2 * margin}px; }
  .eyebrow { font-family: 'Source Sans 3', system-ui, sans-serif; font-weight: 600; font-size: ${26 * s}px; letter-spacing: 0.45em; text-transform: uppercase; color: #c9a96e; }
  .headline { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: ${84 * s}px; line-height: 1.08; color: #faf6ee; margin-top: ${snap8(32 * s)}px; }
  .subline { font-family: 'Source Sans 3', system-ui, sans-serif; font-weight: 400; font-size: ${34 * s}px; color: #b8b4a6; margin-top: ${snap8(32 * s)}px; max-width: ${snap8(W * 0.75)}px; line-height: 1.3; }`
}

function measureHTML(concept, s, W, H, margin) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT_LINKS}
<style>* { margin:0; padding:0; box-sizing:border-box; } html,body { width:${W}px; height:${H}px; }
body { position:relative; background:#1e2337; } ${textBlockCSS(s, W, margin)}</style></head>
<body><div id="textblock"><div class="eyebrow">Meek Meet</div><h1 class="headline">${concept.headline}</h1><p class="subline">${concept.sub}</p></div>
<script>(async()=>{await document.fonts.ready;window.__done=true})()<\/script></body></html>`
}

function deviceGeometry(kind, availH, maxW, s) {
  let b, r, sr, ratio, deck = 0, deckExtra = 0
  if (kind === 'phone') {
    b = snap8(40 * s); r = snap8(64 * s); sr = Math.max(8, r - b); ratio = 9 / 19.5
  } else if (kind === 'tablet') {
    b = snap8(36 * s); r = snap8(28 * s) + snap8(16 * s); sr = Math.max(8, snap8(14 * s)); ratio = 16 / 10
  } else if (kind === 'tablet10') {
    // Full-size tablet: proportionally thinner bezel, ~30-36px outer radius at this scale
    b = snap8(30 * s); r = snap8(30 * s); sr = Math.max(8, snap8(9 * s)); ratio = 16 / 10
  } else {
    b = snap8(26 * s); r = b + 8; sr = 8; ratio = 16 / 9; deck = snap8(40 * s); deckExtra = snap8(64 * s)
  }
  let screenH = availH - 2 * b - deck
  let screenW = screenH * ratio
  let totalW = screenW + 2 * b
  if (totalW > maxW) {
    totalW = maxW
    screenW = totalW - 2 * b
    screenH = screenW / ratio
  }
  screenW = snap8(screenW); screenH = snap8(screenH)
  totalW = snap8(screenW + 2 * b)
  const totalH = snap8(screenH + 2 * b + deck)
  return { b, r, sr, screenW, screenH, totalW, totalH, deck, deckExtra }
}

function deviceHTML(kind, geo, screenContent) {
  const bezelBg = kind === 'chromebook' ? 'linear-gradient(180deg,#e2e2e6,#c6c6cc)' : '#101219'
  const bezelShadow = kind === 'chromebook' ? 'inset 0 0 0 1px rgba(0,0,0,.18)' : 'inset 0 0 0 1px rgba(255,255,255,.06)'
  const island =
    kind === 'phone'
      ? `<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:${Math.round(geo.screenW * 0.3)}px;height:20px;border-radius:999px;background:#07080c;z-index:9"></div>`
      : ''
  const deck =
    kind === 'chromebook'
      ? `<div style="width:${geo.totalW + geo.deckExtra}px;height:${geo.deck}px;margin-left:${-geo.deckExtra / 2}px;border-radius:0 0 18px 18px;background:linear-gradient(180deg,#dcdce0,#c2c2c8);box-shadow:0 18px 32px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.7);position:relative">
           <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:${Math.round((geo.totalW + geo.deckExtra) * 0.22)}px;height:9px;border-radius:99px;background:rgba(0,0,0,.13)"></div>
         </div>`
      : ''
  return `
  <div id="device" style="position:absolute;filter:drop-shadow(0 28px 44px rgba(0,0,0,.5))">
    <div style="padding:${geo.b}px;border-radius:${geo.r}px;background:${bezelBg};box-shadow:${bezelShadow}">
      <div style="position:relative;width:${geo.screenW}px;height:${geo.screenH}px;border-radius:${geo.sr}px;overflow:hidden;background:#faf6ee">
        ${screenContent}
        ${island}
      </div>
    </div>
    ${deck}
  </div>`
}

function artboardHTML({ concept, device, geo, s, W, H, margin, screenContent }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">${FONT_LINKS}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body { position: relative; background: linear-gradient(180deg, #141728 0%, #1e2337 100%); }
  .glow { position: absolute; inset: 0; background: radial-gradient(ellipse 90% 55% at 50% -6%, rgba(201,169,110,0.10), rgba(201,169,110,0) 68%); }
  .grain { position: absolute; inset: 0; background-image: ${grainURI}; opacity: 0.05; mix-blend-mode: overlay; pointer-events: none; }
  ${textBlockCSS(s, W, margin)}
  ${SCREEN_CSS}
</style></head>
<body>
  <div class="glow"></div>
  <div id="textblock">
    <div class="eyebrow">Meek Meet</div>
    <h1 class="headline">${concept.headline}</h1>
    <p class="subline">${concept.sub}</p>
  </div>
  ${deviceHTML(device.kind, geo, screenContent)}
  <div class="grain"></div>
  <script>
    (async () => {
      await document.fonts.ready
      const tb = document.getElementById('textblock')
      const dev = document.getElementById('device')
      const gap = ${snap8(56 * s)}
      dev.style.left = Math.round((${W} - dev.offsetWidth) / 2) + 'px'
      dev.style.top = (tb.getBoundingClientRect().bottom + gap) + 'px'
      requestAnimationFrame(() => requestAnimationFrame(() => { window.__done = true }))
    })()
  <\/script>
</body></html>`
}

function pngSize(file) {
  const b = fs.readFileSync(file)
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

// Walk the device screen (.scr) and report descendants whose bounding box
// exceeds the screen bounds. `clippedBy` marks elements hidden behind an
// intermediate overflow:hidden/clip/scroll ancestor (e.g. the scroll-region
// fade) — visually intentional. Unclipped offenders paint (or half-paint)
// outside the screen and are the real bugs.
const AUDIT_FN = `() => {
  const scr = document.querySelector('.scr')
  if (!scr) return []
  const sr = scr.getBoundingClientRect()
  const tol = 1.5
  const hiddenish = (o) => /(hidden|clip|scroll|auto)/.test(o.overflowX) || /(hidden|clip|scroll|auto)/.test(o.overflowY)
  // The .scroll region clips exactly at the screen bounds, so it masks
  // nothing on the right axis (a right overflow is always a visible cut)
  // but on the bottom axis its fade makes clipped content look scrollable.
  const protectedFor = (el, axis) => {
    let a = el.parentElement
    while (a && a !== scr) {
      if (a.classList && a.classList.contains('scroll')) return axis === 'bottom'
      if (hiddenish(getComputedStyle(a))) return true
      a = a.parentElement
    }
    return false
  }
  const bad = []
  for (const el of scr.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const overRight = r.right - sr.right
    const overBottom = r.bottom - sr.bottom
    const hardRight = overRight > tol && !protectedFor(el, 'right')
    const softBottom = overBottom > tol && !protectedFor(el, 'bottom')
    if (hardRight || softBottom) {
      bad.push({
        sel: (el.tagName + '.' + (el.getAttribute('class') || '')).trim().slice(0, 48),
        txt: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 44),
        overRight: Math.round(overRight),
        overBottom: Math.round(overBottom),
        kind: hardRight ? 'right' : 'bottom',
        clippedBy: hardRight ? null : 'scroll-fade',
      })
    }
  }
  return bad
}`

async function auditScreen(page) {
  return page.evaluate(`(${AUDIT_FN})()`)
}

async function main() {
  const only = process.argv[2] // optional: device dir (phone|tablet7|chromebook), slug, or 'all'
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const results = []
  for (const device of DEVICES) {
    if (only && only !== 'all' && only !== device.dir && !CONCEPTS.some((cn) => cn.slug === only)) continue
    await page.setViewport({ width: device.W, height: device.H, deviceScaleFactor: 1 })
    const s = device.s ?? scaleFor(device.W, device.H)
    const margin = snap8(96 * s)
    const outDir = path.join(OUT, device.dir)
    fs.mkdirSync(outDir, { recursive: true })

    for (let i = 0; i < CONCEPTS.length; i++) {
      const concept = CONCEPTS[i]
      if (only && !['all', device.dir].includes(only) && only !== concept.slug) continue

      // Pass 1 — measure the real text block height with fonts loaded
      await page.setContent(measureHTML(concept, s, device.W, device.H, margin), { waitUntil: 'load', timeout: 60000 })
      await page.evaluate(() => document.fonts.ready)
      if (process.env.FONT_AUDIT) {
        const loaded = await page.evaluate(() =>
          Array.from(new Set(Array.from(document.fonts).map((f) => `${f.family} ${f.weight}${f.style === 'italic' ? ' italic' : ''}:${f.status}`)))
        )
        console.log('  fonts:', loaded.join(' | '))
      }
      const textBottom = await page.evaluate(() => document.getElementById('textblock').getBoundingClientRect().bottom)
      const availH = device.H - textBottom - snap8(56 * s) - snap8(72 * s)
      const geo = deviceGeometry(device.kind, availH, device.W - 2 * margin, s)

      // Pass 2 — final artboard with device sized to fit exactly
      const landscape = geo.screenW > geo.screenH
      const screenContent = buildScreen(concept, geo.screenW, geo.screenH, landscape, device.kind === 'phone')
      const html = artboardHTML({ concept, device, geo, s, W: device.W, H: device.H, margin, screenContent })
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction('window.__done === true', { timeout: 15000 })

      const file = path.join(outDir, `${String(i + 1).padStart(2, '0')}-${concept.slug}.png`)
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: device.W, height: device.H } })
      const dim = pngSize(file)
      const ok = !!dim && dim.w === device.W && dim.h === device.H

      const offenders = await auditScreen(page)
      const hard = offenders.filter((o) => o.kind === 'right')
      const soft = offenders.filter((o) => o.kind === 'bottom')
      results.push({ file: path.relative(ROOT, file), ...dim, ok, hard, soft })
      console.log(`${ok ? '✓' : '✗'} ${path.relative(ROOT, file)} ${dim.w}×${dim.h}` +
        (hard.length ? `  ⚠ ${hard.length} RIGHT-OVERFLOW` : '') +
        (soft.length ? `  (${soft.length} bottom/fade)` : ''))
      for (const o of hard) console.log(`    ✗ +${o.overRight}px right  ${o.sel}  "${o.txt}"`)
    }
  }
  await browser.close()

  const bad = results.filter((r) => !r.ok)
  const overflowed = results.filter((r) => r.hard.length)
  console.log(`\n${results.length} rendered, ${bad.length} dimension mismatches, ${overflowed.length} screens with right-overflow`)
  for (const r of overflowed) {
    console.log(`  ${r.file}:`)
    for (const o of r.hard) console.log(`    +${o.overRight}px right (bottom +${o.overBottom})  ${o.sel}  "${o.txt}"`)
  }
  if (bad.length || overflowed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
