// Candle draft 6/10: neon. Glowing tube outlines on a dark synthwave floor:
// cyan candles, a magenta and amber flame that hums and stutters, and a
// reflection in the floor grid.
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

// draw a path three times: wide faint glow, medium glow, bright core
neonTube = (col, weight, drawFn) => {
  const ctx = p5.drawingContext
  p5.noFill()
  ctx.shadowColor = col
  ctx.shadowBlur = weight * 6
  p5.stroke(col); p5.strokeWeight(weight * 2.2); drawFn()
  ctx.shadowBlur = weight * 2
  p5.stroke(255, 255, 255, 220); p5.strokeWeight(weight * 0.8); drawFn()
  ctx.shadowBlur = 0
}

neonCandle = (x, base, side, c) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.08
  const h = p5.height * 0.5 * (0.1 + 0.9 * c.left)
  const top = base - h
  const tw = Math.max(1, s * 0.006)
  const ctx = p5.drawingContext
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  neonTube('#19e6ff', tw, () => {
    p5.beginShape()
    p5.vertex(x - w / 2, top)
    p5.vertex(x - w / 2, base)
    p5.vertex(x + w / 2, base)
    p5.vertex(x + w / 2, top)
    p5.endShape(p5.CLOSE)
    // a drip
    p5.line(x - w * 0.2, top, x - w * 0.2, top + w * (0.4 + 0.6 * (1 - c.left)))
  })
  neonTube('#b46bff', tw, () => p5.line(x - w * 1.1, base, x + w * 1.1, base))

  const fy = top - w * 0.15
  p5.stroke(255, 255, 255, 120); p5.strokeWeight(tw); p5.line(x, top, x, fy)
  // the tube stutters now and then, like a failing transformer
  const stutter = p5.noise(c.t * 10 + side * 20) > 0.78 && p5.noise(c.t * 1.3 + side) > 0.6
  if (c.lit && !stutter) {
    const fh = w * (1.4 + 0.25 * p5.noise(c.t * 5 + side))
    const lean = (p5.noise(c.t * 2 + side * 4) - 0.5) * w * 0.4
    const flame = (sx, sy) => {
      p5.beginShape()
      p5.vertex(x + lean * sy, fy - fh * sy)
      p5.bezierVertex(x + w * 0.45 * sx, fy - fh * 0.35 * sy, x + w * 0.35 * sx, fy + w * 0.05, x, fy + w * 0.05)
      p5.bezierVertex(x - w * 0.35 * sx, fy + w * 0.05, x - w * 0.45 * sx, fy - fh * 0.35 * sy, x + lean * sy, fy - fh * sy)
      p5.endShape()
    }
    neonTube('#ff2fa8', tw, () => flame(1, 1))
    neonTube('#ffb02e', tw, () => flame(0.45, 0.55))
  } else if (!c.lit && c.outFor < candleOut) {
    const k = c.outFor / candleOut
    p5.drawingContext.globalAlpha = 1 - k
    neonTube('#7a5cff', tw * 0.7, () => {
      p5.beginShape()
      for (let i = 0; i < 24; i++) p5.vertex(x + Math.sin(i * 0.6 - c.t * 4) * w * 0.25 * (i / 12), fy - i * w * 0.12 - k * w)
      p5.endShape()
    })
    p5.drawingContext.globalAlpha = 1
  }
}

p5.draw = () => {
  const c = candleClock()
  p5.background(10, 6, 22)
  const horizon = p5.height * 0.86
  // floor grid
  p5.strokeWeight(1)
  p5.stroke(120, 40, 200, 90)
  for (let i = -12; i <= 12; i++) p5.line(p5.width / 2 + i * p5.width * 0.02, horizon, p5.width / 2 + i * p5.width * 0.2, p5.height)
  for (let k = 0; k < 6; k++) {
    const y = horizon + (p5.height - horizon) * ((k + (c.t * 0.3) % 1) / 6) ** 2
    p5.line(0, y, p5.width, y)
  }
  neonCandle(p5.width * 0.09, horizon, 0, c)
  neonCandle(p5.width * 0.91, horizon, 1, c)
  // reflection: copy the scene above the horizon, flipped and faded
  const rh = p5.height - horizon
  p5.push()
  p5.drawingContext.globalAlpha = 0.25
  p5.scale(1, -1)
  p5.image(p5.get(0, horizon - rh, p5.width, rh), 0, -horizon - rh, p5.width, rh)
  p5.pop()
}

src(s0).out()
// try: src(s0).modulate(osc(40, 0.1), 0.002).out() for a scanline wobble
