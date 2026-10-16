// App icon: downscale the 1024x1024 Meek Meet logo to exactly 512x512.
// Two-step high-quality resample (1024 -> 768 -> 512) via canvas2d,
// imageSmoothingQuality 'high' at each step. No flattening onto a background.

import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SRC = 'C:/projects/meekmeet/meek meet logo.png'
const OUT = path.join(ROOT, 'output', 'icon-512.png')

async function main() {
  const b64 = fs.readFileSync(SRC).toString('base64')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 })
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0">
    <canvas id="c1" width="768" height="768"></canvas>
    <canvas id="c2" width="512" height="512"></canvas>
    <img id="src" src="data:image/png;base64,${b64}" width="1024" height="1024"/>
    <script>
      (async () => {
        const img = document.getElementById('src')
        await img.decode()
        const c1 = document.getElementById('c1')
        const x1 = c1.getContext('2d')
        x1.imageSmoothingEnabled = true
        x1.imageSmoothingQuality = 'high'
        x1.drawImage(img, 0, 0, 768, 768)
        const c2 = document.getElementById('c2')
        const x2 = c2.getContext('2d')
        x2.imageSmoothingEnabled = true
        x2.imageSmoothingQuality = 'high'
        x2.drawImage(c1, 0, 0, 512, 512)
        window.__png = c2.toDataURL('image/png')
        window.__done = true
      })()
    <\/script></body></html>`, { waitUntil: 'load' })
  await page.waitForFunction('window.__done === true', { timeout: 30000 })
  const dataUrl = await page.evaluate(() => window.__png)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'))
  await browser.close()

  const b = fs.readFileSync(OUT)
  const sig = b.readUInt32BE(0) === 0x89504e47
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20)
  const ok = sig && w === 512 && h === 512
  console.log(`${ok ? 'OK ' : 'BAD'} output/icon-512.png ${w}x${h} colortype=${b[25]} (${(b.length / 1024).toFixed(0)} KB)`)
  process.exit(ok ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
