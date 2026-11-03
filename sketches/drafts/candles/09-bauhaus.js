// Candle draft 9/10: Bauhaus. Flat primary shapes on off-white: a blue bar of
// wax, a red and yellow flame of circle and triangle, a black half-disc
// holder and yellow rings of light that pulse outwards.
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

bhCandle = (x, base, side, c) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.09
  const h = p5.height * 0.55 * (0.1 + 0.9 * c.left)
  const top = base - h
  const fy = top - w * 0.15
  p5.noStroke()

  if (c.lit) {
    // rings of light: each grows and fades, then starts again
    p5.noFill()
    for (let i = 0; i < 4; i++) {
      const k = (c.t * 0.35 + i / 4 + side * 0.1) % 1
      p5.stroke(245, 196, 0, 255 * (1 - k))
      p5.strokeWeight(w * 0.12)
      p5.circle(x, fy - w * 0.6, w * 1.5 + k * s * 0.5)
    }
    p5.noStroke()
  }
  // holder: black half-disc and a red base line
  p5.fill(20)
  p5.arc(x, base, w * 2.2, w * 2.2, p5.PI, p5.TWO_PI)
  p5.fill(214, 40, 30)
  p5.rect(x - w * 1.4, base, w * 2.8, w * 0.18)
  // wax: a blue bar, with a quarter-circle of white as its melted top
  p5.fill(24, 64, 160)
  p5.rect(x - w / 2, top, w, h)
  p5.fill(240, 236, 226)
  p5.arc(x - w / 2, top, w * 0.7, w * 0.7, 0, p5.HALF_PI)
  // wick
  p5.fill(20)
  p5.rect(x - w * 0.04, fy, w * 0.08, top - fy)

  if (c.lit) {
    const tilt = Math.sin(c.t * 2.2 + side) * 0.12 + (p5.noise(c.t * 3 + side) - 0.5) * 0.25
    const fh = w * (1.3 + 0.15 * Math.sin(c.t * 5 + side))
    p5.push()
    p5.translate(x, fy)
    p5.rotate(tilt)
    p5.fill(214, 40, 30)
    p5.triangle(-w * 0.42, -w * 0.4, w * 0.42, -w * 0.4, 0, -fh - w * 0.4)
    p5.circle(0, -w * 0.4, w * 0.84)
    p5.fill(245, 196, 0)
    p5.circle(0, -w * 0.35, w * 0.42)
    p5.pop()
  } else if (c.outFor < candleOut) {
    // smoke as three grey squares stepping upward
    const k = c.outFor / candleOut
    for (let i = 0; i < 3; i++) {
      const kk = (k * 2 + i / 3) % 1
      p5.fill(120, 120, 120, 255 * (1 - k) * (1 - kk))
      const sz = w * (0.2 + 0.25 * kk)
      p5.rect(x - sz / 2 + Math.sin(i * 2) * w * 0.3 * kk, fy - w * 0.3 - kk * w * 2.5, sz, sz)
    }
  }
}

p5.draw = () => {
  const c = candleClock()
  p5.background(240, 236, 226)
  const base = p5.height * 0.88
  p5.noStroke()
  p5.fill(20)
  p5.rect(0, base + Math.min(p5.width, p5.height) * 0.016, p5.width, p5.height) // black ground band
  bhCandle(p5.width * 0.09, base, 0, c)
  bhCandle(p5.width * 0.91, base, 1, c)
}

src(s0).out()
// try: src(s0).kaleid(2).out() or src(s0).rotate(0, 0.02).out()
