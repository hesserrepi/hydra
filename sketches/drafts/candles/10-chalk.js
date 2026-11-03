// Candle draft 10/10: chalkboard. Chalk on a smudged slate: grainy strokes
// that break up on the board, coloured chalk for the flame and a scribbled
// halo, with the smoke rubbed in like a thumb smear.
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

chalkBoard = null
chalkMakeBoard = () => {
  const g = p5.createGraphics(p5.width, p5.height)
  g.background(38, 52, 46)
  g.noStroke()
  for (let i = 0; i < 40; i++) { // old half-wiped smudges
    g.fill(220, 230, 220, p5.random(2, 4))
    g.ellipse(p5.random(p5.width), p5.random(p5.height), p5.random(60, 300), p5.random(20, 90))
  }
  for (let i = 0; i < p5.width * p5.height * 0.01; i++) {
    g.fill(255, p5.random(4, 14))
    g.rect(p5.random(p5.width), p5.random(p5.height), 1, 1)
  }
  return g
}

// a chalk stroke: many small dabs with gaps where the chalk skips on the board.
// The dab pattern is fixed per stroke (seeded), so the line does not shimmer.
chalkLine = (x1, y1, x2, y2, col, wgt, seed) => {
  const n = Math.max(2, Math.ceil(p5.dist(x1, y1, x2, y2) / (wgt * 0.5)))
  p5.noStroke()
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const grain = p5.noise(seed + i * 0.9)
    if (grain < 0.3) continue
    p5.fill(col[0], col[1], col[2], 120 + 135 * grain)
    const j = (p5.noise(seed * 3 + i * 0.4) - 0.5) * wgt
    p5.rect(p5.lerp(x1, x2, k) + j, p5.lerp(y1, y2, k) - j, wgt * grain, wgt * grain)
  }
}
chalkPath = (pts, col, wgt, seed) => {
  for (let i = 0; i < pts.length - 1; i++) chalkLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, wgt, seed + i * 17)
}

chalkCandle = (x, base, side, c) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.08
  const h = p5.height * 0.55 * (0.1 + 0.9 * c.left)
  const top = base - h
  const wgt = Math.max(2, s * 0.01)
  const white = [236, 236, 228]
  const seed = side * 100

  // outline and shading strokes
  chalkLine(x - w / 2, top, x - w / 2, base, white, wgt, seed + 1)
  chalkLine(x + w / 2, top, x + w / 2, base, white, wgt, seed + 2)
  const rim = []
  for (let i = 0; i <= 16; i++) rim.push([x + Math.cos(i / 16 * p5.TWO_PI) * w / 2, top + Math.sin(i / 16 * p5.TWO_PI) * w * 0.15])
  chalkPath(rim, white, wgt * 0.8, seed + 3)
  const dir = side ? -1 : 1
  for (let y = top + w * 0.3; y < base - w * 0.1; y += w * 0.28) chalkLine(x + dir * w * 0.45, y, x + dir * w * 0.1, y + w * 0.2, white, wgt * 0.5, seed + y)
  chalkLine(x - w * 1.2, base, x + w * 1.2, base, white, wgt, seed + 4)
  chalkLine(x - w * 1.0, base + w * 0.2, x + w * 1.0, base + w * 0.2, white, wgt * 0.7, seed + 5)
  chalkLine(x, top, x + w * 0.03, top - w * 0.25, white, wgt * 0.6, seed + 6)

  const fy = top - w * 0.25
  if (c.lit) {
    // the flame is redrawn a few times a second, like a quick re-sketch
    const step = Math.floor(c.t * 6)
    const fh = w * (1.4 + 0.3 * p5.noise(step * 0.3 + side))
    const lean = (p5.noise(step * 0.2 + side * 4) - 0.5) * w * 0.5
    // teardrop: u = 0 is the pointed tip, u = PI the round bottom
    const tear = (k) => {
      const pts = []
      for (let i = 0; i <= 20; i++) {
        const u = i / 20 * p5.TWO_PI
        const up = (1 + Math.cos(u)) / 2
        pts.push([x + lean * k * up + Math.sin(u) * Math.sin(u / 2) * w * 0.45 * k, fy + w * 0.1 * k - (fh + w * 0.1) * k * up])
      }
      return pts
    }
    chalkPath(tear(1), [240, 150, 90], wgt, seed + step)
    chalkPath(tear(0.55), [250, 230, 120], wgt * 0.9, seed + step + 50)
    // scribbled halo
    for (let i = 0; i < 14; i++) {
      const ang = i / 14 * p5.TWO_PI
      const r1 = w * 1.3
      const r2 = w * (1.6 + 0.2 * p5.noise(i + step * 0.1))
      const cy = fy - fh * 0.5
      chalkLine(x + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, x + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, [250, 230, 120], wgt * 0.6, seed + i * 7 + step)
    }
  } else if (c.outFor < candleOut) {
    // smoke smeared in with a thumb: soft translucent blobs drifting up
    const k = c.outFor / candleOut
    p5.noStroke()
    for (let i = 0; i < 8; i++) {
      p5.fill(220, 225, 220, 30 * (1 - k))
      p5.ellipse(x + Math.sin(i * 0.8 + c.t) * w * 0.3 * (i / 4), fy - w * (0.4 + i * 0.4) - k * w, w * (0.4 + i * 0.12), w * 0.5)
    }
  }
}

p5.draw = () => {
  if (!chalkBoard || chalkBoard.width !== p5.width) chalkBoard = chalkMakeBoard()
  const c = candleClock()
  p5.image(chalkBoard, 0, 0)
  const base = p5.height * 0.88
  chalkCandle(p5.width * 0.09, base, 0, c)
  chalkCandle(p5.width * 0.91, base, 1, c)
}

src(s0).out()
// try: src(s0).modulate(noise(20, 0.5), 0.001).out() for dusty grain
