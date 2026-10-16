// Faithful HTML recreations of Meek Meet app screens for store screenshots.
// Visual language mirrors meek-meet-mobile/src (design tokens in index.css):
// cream #faf6ee / cream-warm #f5efe0 / parchment #f0e6d0 surfaces,
// charcoal #2c2c2c text, midnight #1e2337, wheat #c9a96e accents,
// terracotta #b85c3f, sage #6b8f71, sky-soft #7a9cc6, serif headings.

const c = (v) => `calc(${v} * var(--k) * 1px)`

const ICONS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  bookopen: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M3 12h18"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  mappin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  circlecheck: '<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>',
  video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v-4M12 17V7M17 12V4"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.6-2.1-1-3-2.8.7-5 3-5 6.5a5.5 5.5 0 0 0 11 0c0-4.2-3.2-6.7-4.5-8-.4 1.3-1 2-1.5 3a2.5 2.5 0 0 0 .5 4.5z"/>',
  arrowright: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  arrowleft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  chevronright: '<path d="M9 18l6-6-6-6"/>',
  chevronleft: '<path d="M15 18l-6-6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  trending: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  sunrise: '<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  filetext: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5z"/>',
  signal: '<rect x="1" y="14" width="3" height="6" rx="1" fill="currentColor" stroke="none"/><rect x="6.5" y="11" width="3" height="9" rx="1" fill="currentColor" stroke="none"/><rect x="12" y="7" width="3" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="17.5" y="4" width="3" height="16" rx="1" fill="currentColor" stroke="none"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
  battery: '<rect x="1" y="7" width="18" height="11" rx="3"/><path d="M23 11v3"/><rect x="3.5" y="9.5" width="11" height="6" rx="1.5" fill="currentColor" stroke="none"/>',
}

export const ic = (name, size, color = '#2c2c2c', sw = 1.9) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;display:block">${ICONS[name]}</svg>`

export const SCREEN_CSS = `
.scr{position:absolute;top:0;left:0;overflow:hidden;background:#faf6ee;color:#2c2c2c;
  font-family:'Source Sans 3','Inter',system-ui,-apple-system,sans-serif;
  font-size:${c(15)};line-height:1.45;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
/* fluidity guardrails: grid/flex items must shrink below content min-width,
   and nothing may exceed its parent's width — prevents screen-edge blowouts */
.scr *{min-width:0;max-width:100%}
.serif{font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif}
.mut{color:#6b6b6b}.mut2{color:#a39e92}.mid{color:#1e2337}.cream{color:#faf6ee}.wheat-t{color:#c9a96e}.terr-t{color:#b85c3f}
.card{background:#fff;border:1px solid #e8e0cc;border-radius:${c(16)}}
.warm{background:#f5efe0;border:1px solid #e8e0cc;border-radius:${c(16)}}
.chip{display:inline-flex;align-items:center;gap:${c(6)};border-radius:999px;padding:${c(4)} ${c(11)};font-weight:600;font-size:${c(10.5)};letter-spacing:${c(1.2)};text-transform:uppercase;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:${c(8)};border-radius:${c(14)};font-weight:600}
.ib{border-radius:${c(12)};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sect{font-size:${c(11.5)};font-weight:600;letter-spacing:${c(2)};text-transform:uppercase;color:#6b6b6b}
.scroll{flex:1;overflow:hidden;position:relative}
.fadebottom{position:absolute;left:0;right:0;bottom:0;height:${c(72)};background:linear-gradient(180deg,rgba(250,246,238,0),#faf6ee);pointer-events:none}
.tabbar{position:absolute;left:0;right:0;bottom:0;background:rgba(250,246,238,.94);border-top:1px solid #e8e0cc;display:flex;justify-content:space-around;padding:${c(8)} ${c(8)} ${c(14)};z-index:5}
.tab{display:flex;flex-direction:column;align-items:center;gap:${c(3)};font-size:${c(10.5)};color:#a39e92;font-weight:600}
.tab.on{color:#b85c3f}
.homeind{position:absolute;bottom:${c(7)};left:50%;transform:translateX(-50%);width:${c(110)};height:${c(5)};border-radius:99px;background:#1e2337;opacity:.8;z-index:6}
textarea{font-family:inherit}
`

// ── shared screen furniture ──────────────────────────────────────────────

const statusbar = (color = '#1e2337') => `
<div style="display:flex;align-items:center;justify-content:space-between;padding:${c(10)} ${c(22)} 0 ${c(26)};height:${c(36)};font-size:${c(13)};font-weight:600;color:${color};flex-shrink:0">
  <span>9:41</span>
  <span style="display:flex;align-items:center;gap:${c(6)}">${ic('signal', 13, color)}${ic('wifi', 13, color)}${ic('battery', 15, color)}</span>
</div>`

const tabbar = (active) => {
  const items = [
    ['home', 'Home', 'home'],
    ['read', 'Read', 'bookopen'],
    ['circles', 'Circles', 'users'],
    ['profile', 'Me', 'user'],
  ]
  return `<div class="tabbar">${items
    .map(
      ([id, label, icon]) =>
        `<div class="tab ${id === active ? 'on' : ''}">${ic(icon, 20, id === active ? '#b85c3f' : '#a39e92')}${label}</div>`
    )
    .join('')}</div>`
}

const emblem = (size) => `
<div style="width:${c(size)};height:${c(size)};border-radius:50%;background:#1e2337;position:relative;overflow:hidden;box-shadow:0 ${c(4)} ${c(12)} rgba(30,35,55,.28);flex-shrink:0">
  <div style="position:absolute;width:64%;height:64%;border-radius:50%;background:#d9bd8a;left:18%;top:16%"></div>
  <div style="position:absolute;width:56%;height:56%;border-radius:50%;background:#1e2337;left:34%;top:12%"></div>
</div>`

const dot = (state, label, k) => {
  const base = `width:${c(30)};height:${c(30)};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${c(12)};font-weight:600;flex-shrink:0`
  if (state === 'done') return `<div style="${base};background:#b85c3f;color:#faf6ee">${ic('check', 14, '#faf6ee', 2.4)}</div>`
  if (state === 'today') return `<div style="${base};background:#f5e0d8;color:#b85c3f;border:2px solid #b85c3f">${label}</div>`
  return `<div style="${base};background:#fff;color:#6b6b6b;border:1px solid #e8e0cc">${label}</div>`
}

const TINTS = {
  sage: ['#e0ece2', '#4a6b50'],
  wheat: ['#f5efe0', '#a6834a'],
  sky: ['#e0eaf5', '#5b82ad'],
  terr: ['#f5e0d8', '#b85c3f'],
  amber: ['#fdf3e0', '#b4710a'],
  violet: ['#ede9fe', '#6d28d9'],
}

const chip = (label, tint) =>
  `<span class="chip" style="background:${TINTS[tint][0]};color:${TINTS[tint][1]}">${label}</span>`

// ── 1 · home / daily verse ───────────────────────────────────────────────

function homeScreen(w, h, landscape, k, phone) {
  const traditions = [
    ['The Bible', 'King James Version', 'In the beginning God created the heaven and the earth.', 'Genesis 1:1', 'book', 'sage'],
    ['The Quran', 'Pickthall Translation', 'In the name of Allah, the Beneficent, the Merciful.', 'Al-Fatihah 1:1', 'globe', 'wheat'],
    ['The Tanakh', 'King James Version', 'The Lord is my shepherd; I shall not want.', 'Psalms 23:1', 'sparkles', 'sky'],
    ['The Dhammapada', 'Müller Translation', 'All that we are is the result of what we have thought.', 'Dhammapada 1:1', 'heart', 'terr'],
    ['The Book of Mormon', 'The Church of Jesus Christ', 'I, Nephi, having been born of goodly parents…', '1 Nephi 1:1', 'bookopen', 'amber'],
  ]
  const miniTrad = (t, col) => `
    <div class="card" style="padding:${c(10)};display:flex;flex-direction:${col ? 'column;align-items:center;text-align:center;gap:' + c(6) : 'row;align-items:center;gap:' + c(9)};min-width:0;flex:1">
      <div class="ib" style="width:${c(30)};height:${c(30)};background:${TINTS[t[5]][0]}">${ic(t[4], 15, TINTS[t[5]][1])}</div>
      <div style="min-width:0">
        <div style="font-weight:600;font-size:${c(11.5)};color:#1e2337;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t[0]}</div>
        ${col ? '' : `<div class="mut" style="font-size:${c(10)};font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">“${t[2]}”</div>`}
      </div>
    </div>`

  const statement = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:${c(10)}">
      ${emblem(44)}
      <span class="chip" style="background:#f5efe0;color:#a6834a">${ic('bookopen', 12, '#a6834a')}&nbsp;Matthew 5:5</span>
      <div class="serif mid" style="text-align:center;font-size:${c(26)};line-height:1.16;font-weight:600">
        Blessed are<br/>the <em class="terr-t">meek</em>, for they<br/><span style="font-size:${c(21)}">shall inherit the earth.</span>
      </div>
      <div class="mut" style="display:flex;align-items:center;gap:${c(6)};font-size:${c(11.5)}">${ic('sunrise', 14, '#b85c3f')}<span>Good evening — rest and reflection draw near</span></div>
    </div>`

  const weekly = `
    <div class="warm" style="padding:${c(13)}">
      <div style="display:flex;gap:${c(11)};align-items:flex-start">
        <div class="ib" style="width:${c(34)};height:${c(34)};background:#f5e0d8">${ic('calendar', 17, '#b85c3f')}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span style="font-weight:600;font-size:${c(13.5)};color:#1e2337">This Week's Journey</span>
            <span class="mut" style="font-size:${c(11)}">3/7 days</span>
          </div>
          <div class="mut" style="font-size:${c(11.5)};margin:${c(2)} 0 ${c(9)}">Justice — mercy and the pursuit of the good</div>
          <div style="display:flex;gap:${c(5)};margin-bottom:${c(10)}">
            ${['M', 'T', 'W', 'T'].map((l) => dot('done', l)).join('')}${dot('today', 'T')}${dot('up', 'S')}${dot('up', 'S')}
          </div>
          <div class="card" style="padding:${c(9)} ${c(11)}">
            <div style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(4)}">
              ${chip('Day 4', 'terr')}
              <span class="mut" style="font-size:${c(11)}">Isaiah 1</span>
            </div>
            <div class="serif" style="font-style:italic;font-size:${c(12.5)};color:#3a3a3a">“Learn to do well; seek judgment, relieve the oppressed.”</div>
            <div class="terr-t" style="display:flex;align-items:center;gap:${c(4)};font-size:${c(11)};font-weight:600;margin-top:${c(5)}">Continue journey ${ic('arrowright', 11, '#b85c3f', 2.2)}</div>
          </div>
        </div>
      </div>
    </div>`

  const verse = `
    <div style="background:#1e2337;color:#faf6ee;border-radius:${c(16)};padding:${c(14)}">
      <div style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(8)}">
        <span class="chip" style="background:rgba(250,246,238,.12);color:#c9a96e">Psalms 23</span>
        <span class="chip" style="background:#6b8f71;color:#faf6ee">${ic('circlecheck', 10, '#faf6ee', 2.6)}&nbsp;Read</span>
      </div>
      <div class="serif" style="font-size:${c(15.5)};line-height:1.45;color:rgba(250,246,238,.92)">“The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters.”</div>
      <div style="font-size:${c(11)};color:rgba(250,246,238,.55);border-left:2px solid rgba(250,246,238,.25);padding-left:${c(9)};margin-top:${c(8)}">In stillness, the soul is restored.</div>
      <div style="display:flex;align-items:center;gap:${c(4)};font-size:${c(11)};color:rgba(250,246,238,.55);margin-top:${c(7)}">Read more ${ic('arrowright', 11, 'rgba(250,246,238,.55)', 2.2)}</div>
    </div>`

  const sacred = landscape
    ? `<div>
        <div class="sect" style="margin-bottom:${c(8)}">Sacred Texts — five traditions</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:${c(8)}">
          ${traditions.map((t) => miniTrad(t, false)).join('')}
        </div>
      </div>`
    : `<div>
        <div class="sect" style="margin-bottom:${c(8)}">Sacred Texts</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:${c(9)}">
          ${traditions.slice(0, 4).map((t) => miniTrad(t, false)).join('')}
        </div>
      </div>`

  let body
  if (landscape) {
    body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:${c(14)} ${c(16)};padding:${c(14)} ${c(22)} 0;height:100%;align-content:start">
        <div style="display:flex;flex-direction:column;gap:${c(12)};min-height:0">
          ${statement}
          ${verse}
        </div>
        <div style="display:flex;flex-direction:column;gap:${c(12)};min-height:0">
          ${weekly}
          ${sacred}
        </div>
      </div>`
  } else {
    body = `
      <div style="display:flex;flex-direction:column;gap:${c(12)};padding:${c(12)} ${c(18)} 0;height:100%">
        ${statement}
        ${weekly}
        ${verse}
        ${sacred}
      </div>`
  }

  return `
    <div class="scroll" style="display:flex;flex-direction:column">${body}</div>
    ${phone ? tabbar('home') + '<div class="homeind"></div>' : ''}
  `
}

// ── 2 · reader — Matthew 5:5 ─────────────────────────────────────────────

function readerScreen(w, h, landscape, k, phone) {
  const tabs = [
    ['The Bible', true], ['The Quran', false], ['The Tanakh', false], ['The Dhammapada', false], ['The Book of Mormon', false],
  ]
  const v = (n, text, hl = false) => hl
    ? `<span style="background:#f5efe0;border-left:3px solid #c9a96e;border-radius:${c(6)};padding:${c(2)} ${c(8)};font-weight:600;color:#1e2337"> <sup style="color:#a6834a;font-size:${c(11)}">${n}</sup> ${text}</span>`
    : `<span> <sup style="color:#a6834a;font-size:${c(11)};font-weight:600">${n}</sup> ${text}</span>`

  const passage = `
    <div class="serif" style="font-size:${c(16.5)};line-height:1.72;color:#3d3d3d;${landscape ? 'column-count:2;column-gap:' + c(28) + ';' : ''}">
      ${v(1, 'And seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him:')}
      ${v(2, 'And he opened his mouth, and taught them, saying,')}
      ${v(3, 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.')}
      ${v(4, 'Blessed are they that mourn: for they shall be comforted.')}
      ${v(5, 'Blessed are the meek: for they shall inherit the earth.', true)}
      ${v(6, 'Blessed are they which do hunger and thirst after righteousness: for they shall be filled.')}
      ${v(7, 'Blessed are the merciful: for they shall obtain mercy.')}
      ${v(9, 'Blessed are the peacemakers: for they shall be called the children of God.')}
    </div>`

  return `
    <div class="scroll" style="display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:${c(6)} ${c(18)} 0">
        ${ic('arrowleft', 21, '#1e2337')}
        <span class="sect" style="letter-spacing:${c(3)}">The Bible · KJV</span>
        ${ic('send', 19, '#6b6b6b')}
      </div>
      <div style="display:flex;gap:${c(8)};padding:${c(12)} ${c(18)} 0;overflow:hidden">
        ${tabs.map(([label, on]) => `<span class="chip" style="${on ? 'background:#1e2337;color:#faf6ee' : 'background:#fff;color:#6b6b6b;border:1px solid #e8e0cc'}">${label}</span>`).join('')}
      </div>
      <div style="text-align:center;padding:${c(14)} ${c(20)} ${c(6)}">
        <div class="serif mid" style="font-size:${c(22)};font-weight:600;line-height:1.2">The Gospel According to<br/>Saint Matthew</div>
        <div class="mut2" style="font-size:${c(11.5)};letter-spacing:${c(3)};text-transform:uppercase;margin-top:${c(5)}">Chapter V · The Sermon on the Mount</div>
      </div>
      <div style="flex:1;padding:${c(8)} ${c(24)} 0;overflow:hidden">${passage}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e8e0cc;padding:${c(10)} ${c(20)} ${c(12)};margin-top:${c(6)}">
        <span class="mut" style="display:flex;align-items:center;gap:${c(5)};font-size:${c(12)};font-weight:600">${ic('chevronleft', 14, '#6b6b6b', 2.2)} Chapter IV</span>
        <span class="mut" style="display:flex;align-items:center;gap:${c(5)};font-size:${c(12)};font-weight:600">Chapter VI ${ic('chevronright', 14, '#6b6b6b', 2.2)}</span>
      </div>
    </div>
    ${phone ? '<div class="homeind"></div>' : ''}
  `
}

// ── 3 · weekly themes ────────────────────────────────────────────────────

function themesScreen(w, h, landscape, k, phone) {
  const days = [
    ['M', 'Isaiah 1:17', '“Learn to do well; seek judgment, relieve the oppressed.”', 'done'],
    ['T', 'Micah 6:8', '“What doth the Lord require of thee, but to do justly, and to love mercy…”', 'done'],
    ['W', 'Amos 5:24', '“Let judgment run down as waters, and righteousness as a mighty stream.”', 'done'],
    ['T', 'Matthew 25:35', '“I was hungry, and ye gave me meat: I was thirsty, and ye gave me drink.”', 'today'],
    ['F', 'Luke 4:18', '“He hath sent me to preach deliverance to the captives…”', 'up'],
    ['S', 'Psalm 82:3', '“Defend the poor and fatherless: do justice to the afflicted and needy.”', 'up'],
    ['S', 'James 2:26', '“For as the body without the spirit is dead, so faith without works is dead.”', 'up'],
  ]
  const dayRow = ([d, ref, quote, state]) => `
    <div style="display:flex;align-items:center;gap:${c(12)};padding:${c(11)} ${c(13)};border-radius:${c(14)};
      ${state === 'today' ? 'background:#f5e0d8;border:1px solid rgba(184,92,63,.25)' : 'background:#fff;border:1px solid #e8e0cc'}">
      ${dot(state === 'done' ? 'done' : state === 'today' ? 'today' : 'up', d)}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:${c(13.5)};color:#1e2337">${ref}${state === 'today' ? ` <span class="chip" style="background:#b85c3f;color:#faf6ee;margin-left:${c(6)}">Today</span>` : ''}</div>
        <div class="mut" style="font-size:${c(11.5)};font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${quote}</div>
      </div>
      ${state === 'done' ? ic('circlecheck', 18, '#6b8f71') : state === 'today' ? ic('chevronright', 17, '#b85c3f', 2.2) : `<span class="mut2" style="font-size:${c(11)};white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:${c(3)}">Locked ${ic('lock', 11, '#a39e92')}</span>`}
    </div>`

  const list = `<div style="display:grid;grid-template-columns:${landscape ? '1fr 1fr' : '1fr'};gap:${c(9)}">${days.map(dayRow).join('')}</div>`
  const themeNote = `
    <div class="warm" style="padding:${c(13)} ${c(14)};display:flex;gap:${c(10)};align-items:flex-start">
      <div class="ib" style="width:${c(32)};height:${c(32)};background:#f5e0d8">${ic('compass', 16, '#b85c3f')}</div>
      <div style="min-width:0">
        <div style="font-weight:600;font-size:${c(12.5)};color:#1e2337">Theme of the week — Justice</div>
        <div class="mut" style="font-size:${c(11.5)};line-height:1.45">“The meek do not shout; they persist. Read one passage a day and let it work on you.”</div>
      </div>
    </div>`
  const header = `
    <div style="padding:${c(4)} ${c(20)} 0">
      <div class="serif mid" style="font-size:${c(24)};font-weight:600">This Week's Journey</div>
      <div class="mut" style="font-size:${c(12.5)};margin-top:${c(3)}">Justice — weekly themes on mercy, hope and community</div>
      <div style="display:flex;align-items:center;gap:${c(12)};margin-top:${c(12)}">
        <span style="font-size:${c(12)};font-weight:600;color:#b85c3f;white-space:nowrap">Day 4 of 7</span>
        <div style="flex:1;height:${c(8)};border-radius:99px;background:#f0e6d0;overflow:hidden">
          <div style="width:57%;height:100%;border-radius:99px;background:linear-gradient(90deg,#c96e52,#b85c3f)"></div>
        </div>
      </div>
    </div>`

  const body = landscape
    ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${c(12)} ${c(16)};padding:${c(16)} ${c(24)} 0;height:100%;align-content:start">${header.replace('padding:' + c(4) + ' ' + c(20) + ' 0', `padding:${c(4)} 0 0;grid-column:1/-1`)}<div style="grid-column:1/-1">${list}</div></div>`
    : `<div style="display:flex;flex-direction:column;gap:${c(14)};padding:${c(6)} ${c(18)} 0;height:100%">${header.replace('padding:' + c(4) + ' ' + c(20) + ' 0', `padding:${c(4)} ${c(2)} 0`)}${list}${themeNote}</div>`

  return `<div class="scroll" style="display:flex;flex-direction:column">${body}</div>${phone ? '<div class="homeind"></div>' : ''}`
}

// ── 4 · circles discovery ────────────────────────────────────────────────

function circlesScreen(w, h, landscape, k, phone) {
  const circleCard = (name, badges, locationRow, desc, meta) => `
    <div class="card" style="padding:${c(15)};display:flex;flex-direction:column;gap:${c(6)};text-align:left">
      <div style="display:flex;gap:${c(6)};flex-wrap:wrap">${badges}</div>
      <div class="serif mid" style="font-size:${c(18)};font-weight:600;line-height:1.2">${name}</div>
      <div style="display:flex;align-items:center;gap:${c(5)};font-size:${c(12)};color:#6b6b6b">${locationRow}</div>
      <div class="mut" style="font-size:${c(12)};line-height:1.45;${landscape ? 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden' : ''}">${desc}</div>
      <div style="display:flex;align-items:center;gap:${c(12)};margin-top:${c(2)}">
        <span style="display:flex;align-items:center;gap:${c(5)};font-size:${c(11.5)};font-weight:600;color:#a6834a">${meta[0]}</span>
        <span style="display:flex;align-items:center;gap:${c(5)};font-size:${c(11.5)};color:#6b6b6b">${meta[1]}</span>
      </div>
    </div>`

  const cards = [
    circleCard(
      'Global New Moon Circle',
      `${chip('Interfaith', 'violet')}${chip('Digital', 'sky')}`,
      `${ic('mappin', 14, '#b85c3f')}<span>Online, Zoom</span>`,
      'A worldwide circle gathering under each new moon — every tradition welcome, every voice counted.',
      [`${ic('moon', 14, '#a6834a')} Tue · 7:00 PM AEDT`, `${ic('users', 14, '#6b6b6b')} 128 members`]
    ),
    circleCard(
      'New Moon Circle — Sydney',
      `${chip('Interfaith', 'violet')}${chip('In Person', 'sage')}`,
      `${ic('mappin', 14, '#b85c3f')}<span>Newtown, Sydney</span><span style="color:#4a6b50;font-weight:600;margin-left:auto">4.2 km</span>`,
      'Local circle meeting in person for sacred reading, honest questions and quiet company.',
      [`${ic('moon', 14, '#a6834a')} Tue 10 Nov · 7:00 PM`, `${ic('users', 14, '#6b6b6b')} 24 members`]
    ),
    circleCard(
      'New Moon Circle — Melbourne',
      `${chip('Interfaith', 'violet')}${chip('In Person', 'sage')}`,
      `${ic('mappin', 14, '#b85c3f')}<span>Brunswick, Melbourne</span><span style="color:#4a6b50;font-weight:600;margin-left:auto">878 km</span>`,
      'Melbourne’s circle — same moon, same questions, new friends.',
      [`${ic('moon', 14, '#a6834a')} Tue 10 Nov · 7:00 PM`, `${ic('users', 14, '#6b6b6b')} 18 members`]
    ),
  ]

  const filters = `
    <div style="display:flex;gap:${c(6)};padding:${c(10)} ${c(18)} 0;overflow:hidden">
      ${['All', 'Christian', 'Islamic', 'Jewish', 'Buddhist', 'Interfaith']
        .map((f, i) => `<span class="chip" style="${i === 0 ? 'background:#1e2337;color:#faf6ee' : 'background:#fff;color:#6b6b6b;border:1px solid #e8e0cc'}">${f}</span>`)
        .join('')}
    </div>`

  const header = `
    <div style="padding:${c(2)} ${c(20)} 0">
      <div class="serif mid" style="font-size:${c(24)};font-weight:600">Circles</div>
      <div class="mut" style="font-size:${c(12.5)};margin-top:${c(2)}">Find the other meek in your area — Australia first, growing worldwide.</div>
    </div>
    <div style="margin:${c(2)} ${c(18)} 0;display:flex;align-items:center;gap:${c(8)}background:#fff;border:1px solid #e8e0cc;border-radius:${c(12)};padding:${c(9)} ${c(12)}">
      ${ic('search', 15, '#6b6b6b')}<span class="mut2" style="font-size:${c(12.5)}">Search circles…</span>
      <span style="margin-left:auto;display:flex;align-items:center;gap:${c(4)};font-size:${c(11)};color:#b85c3f;font-weight:600">${ic('mappin', 12, '#b85c3f')} Sydney ${ic('chevronright', 11, '#a39e92', 2.4)}</span>
    </div>
    ${filters}
    <div class="mut" style="font-size:${c(11.5)};padding:${c(8)} ${c(20)} 0">3 circles near Sydney</div>`

  const body = landscape
    ? `<div style="padding:${c(14)} ${c(22)} 0;height:100%;display:flex;flex-direction:column;gap:${c(10)}">${header}
         <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:${c(12)};flex:1;min-height:0;align-content:start">${cards.join('')}</div></div>`
    : `<div style="padding:${c(8)} ${c(18)} 0;height:100%;display:flex;flex-direction:column;gap:${c(10)}">${header}
         <div style="display:flex;flex-direction:column;gap:${c(10)}">${cards.join('')}</div></div>`

  return `<div class="scroll" style="display:flex;flex-direction:column">${body}</div>${phone ? tabbar('circles') + '<div class="homeind"></div>' : ''}`
}

// ── 5 · circle detail / upcoming meet ────────────────────────────────────

function circleDetailScreen(w, h, landscape, k, phone) {
  const flow = `
    <div class="warm" style="padding:${c(15)}">
      <div class="sect" style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(10)}">${ic('clock', 14, '#6b6b6b')} The Flow</div>
      ${[
        ['1', 'Opening silence', '5 min', '#f5e0d8', '#b85c3f'],
        ['2', 'Reading & check-in', 'each voice is heard', '#f5efe0', '#a6834a'],
        ['3', 'Discussion questions', '30 min', '#f5e0d8', '#b85c3f'],
        ['4', 'Closing reflection', 'a single shared intention', '#f5efe0', '#a6834a'],
      ].map(([n, t, s, bg, fg]) => `
        <div style="display:flex;align-items:flex-start;gap:${c(10)};padding:${c(4)} 0">
          <span style="width:${c(22)};height:${c(22)};border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:${c(10.5)};font-weight:700;flex-shrink:0">${n}</span>
          <div><span style="font-size:${c(13)};font-weight:600;color:#2c2c2c">${t}</span><span class="mut" style="font-size:${c(11)}"> — ${s}</span></div>
        </div>`).join('')}
    </div>`

  const upcoming = `
    <div>
      <div class="sect" style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(10)}">${ic('calendar', 14, '#6b6b6b')} Upcoming Gathering</div>
      <div class="warm" style="padding:${c(16)}">
        <div style="display:flex;align-items:center;gap:${c(8)};margin-bottom:${c(3)}">
          ${ic('calendar', 17, '#b85c3f')}
          <span style="font-weight:600;font-size:${c(15)};color:#2c2c2c">Tue 10 Nov</span>
          <span style="margin-left:auto">${chip('Digital', 'sky')}</span>
        </div>
        <div class="mut" style="font-size:${c(12.5)};margin-bottom:${c(8)}">7:00 PM AEDT · 60 min · Repeats monthly</div>
        <div style="display:flex;align-items:center;gap:${c(5)};font-size:${c(12.5)};color:#5b82ad;font-weight:600;margin-bottom:${c(8)}">${ic('video', 14, '#5b82ad')} Online, Zoom</div>
        <div class="mut" style="font-size:${c(12)};font-style:italic;margin-bottom:${c(12)}">Bring a candle. Cameras optional — voice is enough.</div>
        <div style="display:flex;gap:${c(7)};margin-bottom:${c(11)};flex-wrap:wrap">
          <span class="btn" style="background:#6b8f71;color:#faf6ee;font-size:${c(11.5)};padding:${c(6)} ${c(14)};border-radius:999px">Going</span>
          <span class="btn" style="background:#c9a96e;color:#1e2337;font-size:${c(11.5)};padding:${c(6)} ${c(14)};border-radius:999px">Maybe</span>
          <span class="btn" style="background:#fff;color:#6b6b6b;font-size:${c(11.5)};padding:${c(6)} ${c(14)};border-radius:999px;border:1px solid #e8e0cc">Can’t make it</span>
        </div>
        <div class="btn" style="width:100%;background:#1e2337;color:#faf6ee;font-size:${c(13.5)};padding:${c(11)}">${ic('video', 15, '#c9a96e')} Join Online ${ic('arrowright', 14, '#c9a96e', 2.2)}</div>
      </div>
    </div>`

  const questions = `
    <div>
      <div class="sect" style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(10)}">${ic('help', 14, '#6b6b6b')} Discussion Questions</div>
      <div class="warm" style="padding:${c(14)}">
        ${[
          'What concern weighs most on your community this month?',
          'Where do you see quiet justice at work around you?',
          'Who is being forgotten in our neighbourhood?',
        ].map((q, i) => `
          <div style="display:flex;align-items:flex-start;gap:${c(10)};padding:${c(4)} 0">
            <span style="width:${c(22)};height:${c(22)};border-radius:50%;background:#f5efe0;color:#a6834a;display:flex;align-items:center;justify-content:center;font-size:${c(10.5)};font-weight:700;flex-shrink:0">${i + 1}</span>
            <span style="font-size:${c(12.5)};color:#2c2c2c;line-height:1.4">${q}</span>
          </div>`).join('')}
      </div>
    </div>`

  const header = `
    <div style="display:flex;align-items:center;gap:${c(10)};padding:${c(2)} ${c(18)} 0">
      ${ic('arrowleft', 21, '#1e2337')}
      <div style="flex:1;min-width:0">
        <div class="serif mid" style="font-size:${c(21)};font-weight:600;line-height:1.15">New Moon Circle — Sydney</div>
        <div style="display:flex;align-items:center;gap:${c(4)};font-size:${c(11.5)};color:#6b6b6b;margin-top:${c(2)}">${ic('mappin', 12, '#b85c3f')} Newtown, Sydney · Shepherded by Sarah M.</div>
      </div>
      <div class="ib" style="width:${c(38)};height:${c(38)};background:#f5efe0">${ic('moon', 19, '#a6834a')}</div>
    </div>`

  const body = landscape
    ? `<div style="display:grid;grid-template-columns:1fr 1.05fr;gap:${c(14)};padding:${c(10)} ${c(22)} 0;height:100%;align-content:start">${header.replace('padding:' + c(2) + ' ' + c(18) + ' 0', `padding:${c(2)} 0 ${c(4)};grid-column:1/-1`)}${flow}${upcoming}<div style="grid-column:1/-1">${questions}</div></div>`
    : `<div style="display:flex;flex-direction:column;gap:${c(13)};padding:${c(4)} ${c(18)} 0;height:100%">${header}${flow}${upcoming}${questions}</div>`

  return `<div class="scroll" style="display:flex;flex-direction:column">${body}</div>${phone ? '<div class="homeind"></div>' : ''}`
}

// ── 6 · meeting questions / your voice ───────────────────────────────────

function questionsScreen(w, h, landscape, k, phone) {
  const prevAnswered = `
    <div class="card" style="padding:${c(11)} ${c(13)};display:flex;align-items:center;gap:${c(10)};opacity:.85">
      ${ic('circlecheck', 18, '#6b8f71')}
      <div style="flex:1;min-width:0">
        <div style="font-size:${c(12.5)};font-weight:600;color:#2c2c2c">Question 1 · answered</div>
        <div class="mut" style="font-size:${c(11.5)};font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">“Where have you seen quiet kindness this month?”</div>
      </div>
    </div>`

  const qCard = `
    <div class="card" style="padding:${c(18)}">
      <div style="display:flex;align-items:center;gap:${c(8)};margin-bottom:${c(10)}">
        ${chip('Community', 'wheat')}
        <span class="mut2" style="font-size:${c(11)};margin-left:auto">Question 2 of 5</span>
      </div>
      <div class="serif mid" style="font-size:${c(21)};font-weight:600;line-height:1.3">What concern weighs most on your community this month?</div>
    </div>`

  const response = `
    <div class="warm" style="padding:${c(14)}">
      <div style="background:#fff;border:1px solid #e8e0cc;border-radius:${c(12)};padding:${c(12)} ${c(13)};min-height:${c(96)}">
        <div style="font-size:${c(13)};line-height:1.55;color:#3a3a3a">Rent keeps climbing and the queues at the food bank grow longer. The elders on my street hardly see another soul from week to week.</div>
        <div class="mut2" style="font-size:${c(10.5)};text-align:right;margin-top:${c(6)}">124 / 500</div>
      </div>
      <div style="display:flex;align-items:center;gap:${c(6)};margin-top:${c(9)};font-size:${c(11)};color:#4a6b50;font-weight:600">${ic('lock', 12, '#4a6b50')} Anonymous — your name is never shared.</div>
    </div>`

  const nextLocked = `
    <div class="card" style="padding:${c(11)} ${c(13)};display:flex;align-items:center;gap:${c(10)};opacity:.75">
      <span style="width:${c(26)};height:${c(26)};border-radius:50%;background:#f5efe0;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ic('lock', 13, '#a6834a')}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:${c(12)};font-weight:600;color:#2c2c2c">Question 3 · locked</div>
        <div class="mut2" style="font-size:${c(11)}">Unlocks once your response is submitted.</div>
      </div>
    </div>`

  const submit = `
    <div class="btn" style="width:100%;background:#1e2337;color:#faf6ee;font-size:${c(14)};padding:${c(12)}">${ic('send', 15, '#c9a96e')} Submit Response</div>
    <div class="mut2" style="text-align:center;font-size:${c(10.5)};margin-top:${c(8)}">Answers are gathered, anonymised, and heard as one voice.</div>`

  const live = `
    <div style="display:flex;align-items:center;gap:${c(8)};padding:${c(2)} ${c(18)} 0">
      ${ic('arrowleft', 20, '#1e2337')}
      <div style="flex:1">
        <div class="serif mid" style="font-size:${c(18)};font-weight:600">New Moon Circle — Sydney</div>
      </div>
      <span class="chip" style="background:#b85c3f;color:#faf6ee"><span style="width:${c(6)};height:${c(6)};border-radius:50%;background:#faf6ee"></span> Live</span>
    </div>`

  const body = landscape
    ? `<div style="display:grid;grid-template-columns:1fr 1.1fr;gap:${c(14)};padding:${c(10)} ${c(22)} 0;height:100%;align-content:start">${live.replace('padding:' + c(2) + ' ' + c(18) + ' 0', `padding:${c(2)} 0 ${c(4)};grid-column:1/-1`)}<div style="display:flex;flex-direction:column;gap:${c(12)}">${prevAnswered}${response}</div><div style="display:flex;flex-direction:column;gap:${c(12)}">${qCard}${submit}<div style="grid-column:1/-1">${nextLocked}</div></div></div>`
    : `<div style="display:flex;flex-direction:column;gap:${c(13)};padding:${c(4)} ${c(18)} 0;height:100%">${live}${prevAnswered}${qCard}${response}${submit}${nextLocked}</div>`

  return `<div class="scroll" style="display:flex;flex-direction:column">${body}</div>${phone ? '<div class="homeind"></div>' : ''}`
}

// ── 7 · meeting analytics / insights ─────────────────────────────────────

function analyticsScreen(w, h, landscape, k, phone) {
  const stats = [
    ['calendar', '#6b8f71', 'Meets', '12'],
    ['message', '#b85c3f', 'Responses', '86'],
    ['users', '#1e2337', 'Contributors', '24'],
    ['trending', '#a6834a', 'Avg response rate', '72%'],
  ]
  const statCard = ([icon, color, label, value]) => `
    <div class="warm" style="padding:${c(12)} ${c(13)}">
      <div style="display:flex;align-items:center;gap:${c(6)};margin-bottom:${c(4)}">${ic(icon, 14, color)}<span class="mut" style="font-size:${c(9.5)};letter-spacing:${c(1.5)};text-transform:uppercase;font-weight:600">${label}</span></div>
      <div class="serif" style="font-size:${c(24)};font-weight:600;color:#2c2c2c;line-height:1">${value}</div>
    </div>`

  const insights = [
    ['Cost of living', 34, 100, '#b85c3f'],
    ['Loneliness among elders', 21, 62, '#6b8f71'],
    ['Youth employment', 17, 50, '#c9a96e'],
    ['Safe streets after dark', 12, 35, '#7a9cc6'],
    ['Care for creation', 9, 26, '#a39e92'],
  ]
  const insightCard = ([label, n, pct, color]) => `
    <div style="margin-bottom:${c(11)}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:${c(5)}">
        <span style="font-size:${c(12.5)};font-weight:600;color:#2c2c2c">${label}</span>
        <span class="mut" style="font-size:${c(11)}">${n} mentions</span>
      </div>
      <div style="height:${c(9)};border-radius:99px;background:#f0e6d0;overflow:hidden">
        <div style="width:${pct}%;height:100%;border-radius:99px;background:${color}"></div>
      </div>
    </div>`

  const trendBars = [8, 11, 9, 14, 17, 21]
    .map((v, i) => `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:${c(4)};height:100%">
        <div style="width:100%;height:${(v / 21) * 100}%;border-radius:${c(4)} ${c(4)} 0 0;background:rgba(107,143,113,.45)"></div>
        <span class="mut2" style="font-size:${c(9)}">${['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i]}</span>
      </div>`)
    .join('')

  const insightsBlock = `
    <div class="warm" style="padding:${c(15)}">
      <div class="sect" style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(12)}">${ic('bars', 14, '#6b6b6b')} What the circle is carrying</div>
      ${insights.map(insightCard).join('')}
      <div style="font-size:${c(10.5)};color:#6b6b6b;margin-top:${c(2)}">86 anonymised responses · New Moon Circle, Nov</div>
    </div>`

  const trendBlock = `
    <div class="warm" style="padding:${c(15)}">
      <div class="sect" style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(8)}">${ic('trending', 14, '#6b6b6b')} Voices per meet</div>
      <div style="display:flex;gap:${c(8)};height:${c(84)};align-items:stretch">${trendBars}</div>
    </div>`

  const themesBlock = `
    <div class="warm" style="padding:${c(15)}">
      <div class="sect" style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(10)}">${ic('sparkles', 14, '#6b6b6b')} Recurring themes</div>
      <div style="display:flex;flex-wrap:wrap;gap:${c(7)}">
        ${['justice (12)', 'rent (9)', 'hope (8)', 'loneliness (7)', 'work (5)']
          .map((t) => `<span class="chip" style="background:#f5efe0;color:#a6834a;letter-spacing:${c(0.5)};text-transform:none;font-size:${c(11.5)}">${t}</span>`)
          .join('')}
      </div>
    </div>`

  const header = `
    <div style="display:flex;align-items:center;gap:${c(10)};padding:${c(2)} ${c(18)} 0">
      ${ic('arrowleft', 20, '#1e2337')}
      <div>
        <div class="serif mid" style="font-size:${c(19)};font-weight:600;line-height:1.15">Circle Analytics</div>
        <div class="mut" style="font-size:${c(11)}">Insights across 12 completed meets — heard as one.</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${landscape ? 4 : 2},1fr);gap:${c(9)};padding:${c(10)} ${c(18)} 0">${stats.map(statCard).join('')}</div>`

  const body = landscape
    ? `<div style="padding:${c(6)} ${c(20)} 0;height:100%;display:flex;flex-direction:column;gap:${c(10)}">${header}
         <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:${c(12)};align-items:start">${insightsBlock}<div style="display:flex;flex-direction:column;gap:${c(12)}">${trendBlock}${themesBlock}</div></div></div>`
    : `<div style="padding:${c(4)} ${c(16)} 0;height:100%;display:flex;flex-direction:column;gap:${c(11)}">${header}${insightsBlock}${trendBlock}${themesBlock}</div>`

  return `<div class="scroll" style="display:flex;flex-direction:column">${body}</div>${phone ? '<div class="homeind"></div>' : ''}`
}

// ── 8 · shepherd dashboard / council report ──────────────────────────────

function shepherdScreen(w, h, landscape, k, phone) {
  const report = `
    <div style="background:#1e2337;color:#faf6ee;border-radius:${c(18)};padding:${c(18)};position:relative;overflow:hidden">
      <div style="position:absolute;top:${c(-40)};right:${c(-40)};width:${c(160)};height:${c(160)};border-radius:50%;background:radial-gradient(circle,rgba(201,169,110,.18),transparent 70%)"></div>
      <div style="display:flex;align-items:center;gap:${c(7)};margin-bottom:${c(9)}">${ic('filetext', 15, '#c9a96e')}<span class="sect" style="color:#c9a96e">Report ready for submission</span></div>
      <div class="serif" style="font-size:${c(21)};font-weight:600;line-height:1.25">City of Sydney Council</div>
      <div style="font-size:${c(12)};color:rgba(250,246,238,.6);margin-top:${c(3)}">Community Voices — November submission</div>
      <div style="display:flex;gap:${c(18)};margin:${c(13)} 0;padding:${c(11)} 0;border-top:1px solid rgba(250,246,238,.14);border-bottom:1px solid rgba(250,246,238,.14)">
        ${[['86', 'responses'], ['24', 'contributors'], ['5', 'themes']].map(([n, l]) => `
          <div><div class="serif" style="font-size:${c(22)};font-weight:600;color:#d9bd8a;line-height:1">${n}</div>
          <div style="font-size:${c(10)};color:rgba(250,246,238,.55);letter-spacing:${c(1)};text-transform:uppercase">${l}</div></div>`).join('')}
      </div>
      <div style="font-size:${c(12)};color:rgba(250,246,238,.8);line-height:1.5">Top concerns: cost of living, loneliness among elders, youth employment.</div>
      <div style="font-size:${c(12)};color:rgba(250,246,238,.8);line-height:1.5;margin-top:${c(3)}">Recommended asks: food-relief funding, visiting-companions program.</div>
      <div style="display:flex;align-items:center;gap:${c(6)};margin-top:${c(11)};font-size:${c(10.5)};color:rgba(250,246,238,.5)">${ic('lock', 12, '#c9a96e')} Fully anonymised — no names, no attributed quotes.</div>
      <div style="display:flex;gap:${c(9)};margin-top:${c(13)}">
        <span class="btn" style="flex:1;background:#c9a96e;color:#1e2337;font-size:${c(13)};padding:${c(10)}">Review &amp; Submit ${ic('arrowright', 14, '#1e2337', 2.2)}</span>
        <span class="btn" style="background:transparent;color:#faf6ee;font-size:${c(12.5)};padding:${c(10)} ${c(13)};border:1px solid rgba(250,246,238,.35)">${ic('download', 14, '#faf6ee')} PDF</span>
      </div>
    </div>`

  const actions = `
    <div>
      <div class="sect" style="margin-bottom:${c(10)}">Circle tools</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:${c(10)}">
        ${[
          ['bookopen', '#f5efe0', '#a6834a', 'Questions', 'Discussion prompts'],
          ['clock', '#f5e0d8', '#b85c3f', 'Routine', 'Meeting flow'],
          ['calendar', '#e0ece2', '#4a6b50', 'Meetings', 'Schedule & RSVPs'],
          ['chart', '#e0eaf5', '#5b82ad', 'Insights', 'Circle analytics'],
        ].map(([icon, bg, fg, t, s]) => `
          <div class="card" style="padding:${c(13)}">
            <div class="ib" style="width:${c(34)};height:${c(34)};background:${bg};margin-bottom:${c(8)}">${ic(icon, 17, fg)}</div>
            <div style="font-size:${c(13)};font-weight:600;color:#2c2c2c">${t}</div>
            <div class="mut" style="font-size:${c(10.5)}">${s}</div>
          </div>`).join('')}
      </div>
    </div>`

  const header = `
    <div style="display:flex;align-items:center;gap:${c(10)};padding:${c(2)} ${c(18)} 0">
      <div class="ib" style="width:${c(40)};height:${c(40)};background:#f5e0d8">${ic('shield', 20, '#b85c3f')}</div>
      <div>
        <div class="serif mid" style="font-size:${c(20)};font-weight:600;line-height:1.15">Shepherd Dashboard</div>
        <div class="mut" style="font-size:${c(11.5)}">New Moon Circle — Sydney · 24 members</div>
      </div>
    </div>`

  const nextMeet = `
    <div class="warm" style="padding:${c(13)} ${c(14)};display:flex;align-items:center;gap:${c(10)}">
      <div class="ib" style="width:${c(34)};height:${c(34)};background:#f5e0d8">${ic('calendar', 17, '#b85c3f')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:${c(12.5)};color:#1e2337">Next meet — Tue 10 Nov, 7:00 PM</div>
        <div class="mut" style="font-size:${c(11)}">Discussion questions not yet set.</div>
      </div>
      <span class="btn" style="background:#1e2337;color:#faf6ee;font-size:${c(11)};padding:${c(7)} ${c(12)}">Set Questions</span>
    </div>`

  const body = landscape
    ? `<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:${c(16)};padding:${c(12)} ${c(22)} 0;height:100%;align-content:start">${header.replace('padding:' + c(2) + ' ' + c(18) + ' 0', `padding:${c(2)} 0 ${c(6)};grid-column:1/-1`)}${report}${actions}</div>`
    : `<div style="display:flex;flex-direction:column;gap:${c(13)};padding:${c(4)} ${c(18)} 0;height:100%">${header}${report}${nextMeet}${actions}</div>`

  return `<div class="scroll" style="display:flex;flex-direction:column">${body}</div>${phone ? '<div class="homeind"></div>' : ''}`
}

// ── registry ─────────────────────────────────────────────────────────────

export const CONCEPTS = [
  { slug: 'daily-verse', headline: 'The Word, every day', sub: 'Sacred reading from five traditions — free, forever.', render: homeScreen },
  { slug: 'sacred-library', headline: 'Blessed are the meek', sub: 'The full sacred library. No ads. No noise. Never.', render: readerScreen },
  { slug: 'weekly-themes', headline: 'Reflection with purpose', sub: 'Weekly themes on justice, hope and community.', render: themesScreen },
  { slug: 'find-circle', headline: 'Find your circle', sub: 'Meet the other meek in your area — Australia first, growing worldwide.', render: circlesScreen },
  { slug: 'new-moon', headline: 'Gather under the new moon', sub: 'Virtual meetups now; local circles form as you grow.', render: circleDetailScreen },
  { slug: 'voice-counted', headline: 'One voice, counted', sub: 'Questions seeded to your phone — answer in your own time.', render: questionsScreen },
  { slug: 'pattern-emerges', headline: 'The pattern emerges', sub: 'Anonymised insights from many voices, heard as one.', render: analyticsScreen },
  { slug: 'meek-organise', headline: 'The meek organise', sub: 'From shared concern to councils and MPs. Change from the inside out.', render: shepherdScreen },
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function buildScreen(concept, w, h, landscape, phone) {
  // h*0.85 lets landscape screens fill their height better (portrait phones are
  // width-bound, so this only affects landscape devices)
  const k = clamp(Math.min(w, h * 0.85) / 390, 0.62, 2.4)
  const inner = concept.render(w, h, landscape, k, phone)
  return `<div class="scr" style="--k:${k.toFixed(3)};width:${Math.round(w)}px;height:${Math.round(h)}px;display:flex;flex-direction:column">
    ${statusbar()}
    ${inner}
  </div>`
}
