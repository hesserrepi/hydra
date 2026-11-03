// Candle draft 7/10: woodcut. Black ink on cream paper, as if cut from a
// block: gouged stripes model the wax, the flame is nested carved rings and
// rays of light are cut out of a dark field around it.
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

wcutInk = [24, 20, 18]
wcutPaper = [236, 226, 204]

// a tapered gouge mark: thick in the middle, pointed at both ends
wcutGouge = (x1, y1, x2, y2, wgt) => {
  const ang = Math.atan2(y2 - y1, x2 - x1) + p5.HALF_PI
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  p5.beginShape()
  p5.vertex(x1, y1)
  p5.quadraticVertex(mx + Math.cos(ang) * wgt, my + Math.sin(ang) * wgt, x2, y2)
  p5.quadraticVertex(mx - Math.cos(ang) * wgt, my - Math.sin(ang) * wgt, x1, y1)
  p5.endShape(p5.CLOSE)
}

wcutCandle = (x, base, side, c) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.09
  const h = p5.height * 0.55 * (0.1 + 0.9 * c.left)
  const top = base - h
  const flick = p5.noise(c.t * 5 + side * 7)
  const fy = top - w * 0.25
  const fh = w * (1.5 + 0.3 * flick)
  const cy = fy - fh * 0.45
  p5.noStroke()

  // dark field with rays carved out of it
  if (c.lit) {
    p5.fill(wcutInk)
    p5.circle(x, cy, s * 0.46)
    p5.fill(wcutPaper)
    const rays = 24
    for (let i = 0; i < rays; i++) {
      const ang = i / rays * p5.TWO_PI + c.t * 0.05 * (side ? -1 : 1)
      const r1 = w * 1.1
      const r2 = s * (0.19 + 0.03 * p5.noise(i, c.t * 0.5))
      wcutGouge(x + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, x + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, s * 0.008)
    }
  }
  // candle block, then paper-coloured gouges, thicker on the lit side
  p5.fill(wcutInk)
  p5.rect(x - w / 2, top, w, h)
  p5.fill(wcutPaper)
  const toward = side ? -1 : 1 // towards the middle of the screen
  for (let y = top + w * 0.35; y < base - w * 0.1; y += w * 0.18) {
    const len = w * (0.35 + 0.15 * p5.noise(y * 0.05))
    const x0 = x + toward * w * 0.45
    wcutGouge(x0, y, x0 - toward * len, y + w * 0.04, w * 0.06)
  }
  p5.fill(wcutPaper)
  p5.ellipse(x, top + w * 0.08, w * 0.8, w * 0.16)
  // saucer: a black slab with one carved line
  p5.fill(wcutInk)
  p5.ellipse(x, base + w * 0.08, w * 2.4, w * 0.5)
  p5.fill(wcutPaper)
  wcutGouge(x - w * 1, base + w * 0.12, x + w * 1, base + w * 0.12, w * 0.04)
  // wick
  p5.fill(wcutInk)
  p5.rect(x - w * 0.04, fy, w * 0.08, top - fy + 2)

  if (c.lit) {
    const lean = (p5.noise(c.t * 2 + side) - 0.5) * w * 0.5
    const ring = (k, col) => {
      p5.fill(col)
      p5.beginShape()
      p5.vertex(x + lean * k, fy - fh * k)
      p5.bezierVertex(x + w * 0.5 * k, fy - fh * 0.35 * k, x + w * 0.42 * k, fy + w * 0.12 * k, x, fy + w * 0.12 * k)
      p5.bezierVertex(x - w * 0.42 * k, fy + w * 0.12 * k, x - w * 0.5 * k, fy - fh * 0.35 * k, x + lean * k, fy - fh * k)
      p5.endShape(p5.CLOSE)
    }
    ring(1, wcutPaper)
    ring(0.82, wcutInk)
    ring(0.66, wcutPaper)
    ring(0.48, wcutInk)
    ring(0.3, wcutPaper)
  } else if (c.outFor < candleOut) {
    // smoke as carved black curls
    const k = c.outFor / candleOut
    p5.fill(wcutInk)
    for (let i = 0; i < 5; i++) {
      const yy = fy - w * (0.4 + i * 0.6) - k * w
      if (i / 5 > 1 - k * 0.8) continue
      const xx = x + Math.sin(i * 1.4 + c.t * 2) * w * 0.25
      wcutGouge(xx - w * 0.25, yy, xx + w * 0.25, yy - w * 0.25, w * 0.07)
    }
  }
}

p5.draw = () => {
  const c = candleClock()
  p5.background(wcutPaper)
  const base = p5.height * 0.9
  wcutCandle(p5.width * 0.09, base, 0, c)
  wcutCandle(p5.width * 0.91, base, 1, c)
  // a rough black border like the edge of the block
  p5.noFill()
  p5.stroke(wcutInk)
  p5.strokeWeight(Math.min(p5.width, p5.height) * 0.025)
  p5.rect(0, 0, p5.width, p5.height)
}

src(s0).out()
// try: src(s0).thresh(0.5, 0.05).out() for harder edges, or .color(0.9, 0.2, 0.15) for red ink
