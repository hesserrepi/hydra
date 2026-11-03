// Candle draft 5/10: pixel art. Chunky 8-bit candles drawn on a tiny buffer
// and scaled up without smoothing: a 4-frame flame, a dithered glow and wax
// that melts away one pixel row at a time.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out (smoking) before it relights
candleT0 = p5.millis()
candleClock = () => {
  const t = (p5.millis() - candleT0) / 1000
  const cycle = t % (candleBurn + candleOut)
  return { t, left: Math.max(0, 1 - cycle / candleBurn), lit: cycle < candleBurn, outFor: cycle - candleBurn }
}

pixBuf = null
pixPal = { bg: '#1a1c2c', bg2: '#29233a', glow1: '#5d275d', glow2: '#b13e53', wax: '#f4f4f4', waxShade: '#94b0c2', waxDark: '#566c86', red: '#b13e53', orange: '#ef7d57', yellow: '#ffcd75', white: '#fffbe0', dish: '#333c57', dishLight: '#566c86', smoke: '#566c86' }
// flame frames: rows from the top, '.' empty, 'r' red, 'o' orange, 'y' yellow, 'w' white
pixFlames = [
  ['..r..', '..o..', '.ror.', '.oyo.', 'roywo', 'royyo', '.ryr.'],
  ['...r.', '..or.', '.ror.', '.oyo.', 'royyo', 'roywo', '.ryr.'],
  ['..r..', '.ro..', '.ror.', '.oyo.', 'roywo', 'royyo', '.ror.'],
  ['.r...', '.or..', '.ror.', 'royo.', 'roywo', 'royyo', '.ryr.']
]

pixCandle = (g, x, base, side, c) => {
  const P = pixPal
  const w = 6
  const full = Math.floor(g.height * 0.55)
  const h = Math.max(3, Math.round(full * (0.1 + 0.9 * c.left)))
  const top = base - h
  const frame = Math.floor(c.t * 6 + side * 2) % 4

  if (c.lit) {
    // dithered glow: two checkerboard rings
    const cy = top - 5
    for (let yy = -16; yy <= 16; yy++) {
      for (let xx = -16; xx <= 16; xx++) {
        const d = Math.sqrt(xx * xx + yy * yy) + (frame % 2) * 0.7
        const even = (xx + yy) % 2 === 0
        if (d < 6 && even) g.fill(P.glow2)
        else if (d < 11 && even) g.fill(P.glow1)
        else if (d < 16 && xx % 2 === 0 && yy % 2 === 0) g.fill(P.glow1)
        else continue
        g.rect(x + xx, cy + yy, 1, 1)
      }
    }
  }
  // dish
  g.fill(P.dish); g.rect(x - 7, base, 14, 2)
  g.fill(P.dishLight); g.rect(x - 6, base, 12, 1)
  // wax with a light and a dark column
  g.fill(P.wax); g.rect(x - w / 2, top, w, h)
  g.fill(P.waxShade); g.rect(x + w / 2 - 2, top, 1, h)
  g.fill(P.waxDark); g.rect(x + w / 2 - 1, top, 1, h)
  // a drip that grows as it burns
  const drip = Math.min(h - 1, 1 + Math.floor((1 - c.left) * 6))
  g.fill(P.wax); g.rect(x - w / 2 - 1, top + 1, 1, drip)
  g.fill(P.waxShade); g.rect(x - w / 2, top, w, 1)
  // wick
  g.fill(P.bg); g.rect(x, top - 1, 1, 1)

  if (c.lit) {
    const rows = pixFlames[frame]
    const map = { r: P.red, o: P.orange, y: P.yellow, w: P.white }
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '.') continue
        g.fill(map[row[rx]])
        g.rect(x - 2 + rx, top - 1 - rows.length + ry, 1, 1)
      }
    })
  } else if (c.outFor < candleOut) {
    // smoke puffs rising in steps
    g.fill(P.smoke)
    for (let i = 0; i < 4; i++) {
      const k = (c.outFor * 0.6 + i * 0.25) % 1
      const fade = 1 - c.outFor / candleOut
      if (k > fade) continue
      g.rect(x + Math.round(Math.sin(k * 6 + i) * 2), top - 2 - Math.floor(k * 16), 1 + (i % 2), 1 + (i % 2))
    }
  }
}

p5.draw = () => {
  const scale = Math.max(2, Math.round(Math.min(p5.width, p5.height) / 64))
  const gw = Math.ceil(p5.width / scale)
  const gh = Math.ceil(p5.height / scale)
  if (!pixBuf || pixBuf.width !== gw || pixBuf.height !== gh) {
    pixBuf = p5.createGraphics(gw, gh)
    pixBuf.pixelDensity(1)
    pixBuf.noSmooth()
  }
  const g = pixBuf
  const c = candleClock()
  g.noStroke()
  g.background(pixPal.bg)
  g.fill(pixPal.bg2)
  for (let y = Math.floor(gh * 0.8); y < gh; y++) g.rect(0, y, gw, 1) // floor
  const base = Math.floor(gh * 0.8)
  pixCandle(g, Math.round(gw * 0.09), base, 0, c)
  pixCandle(g, Math.round(gw * 0.91), base, 1, c)
  p5.noSmooth()
  p5.image(g, 0, 0, gw * scale, gh * scale)
}

src(s0).out()
// try: src(s0).pixelate(200, 120).out() or add .scrollY(0, 0.01) for a CRT roll
