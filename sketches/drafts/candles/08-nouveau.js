// Candle draft 8/10: art nouveau. Mucha-style poster: ivory candles in curling
// gilded holders, each flame framed by a gold halo of rings, flat colours with
// gold outlines on deep teal.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out (smoking) before it relights
candleBackground = false // true paints this draft's own backdrop; false keeps it transparent so hydra shows behind
candleT0 = p5.millis()
candleClock = () => {
  const t = (p5.millis() - candleT0) / 1000
  const cycle = t % (candleBurn + candleOut)
  return { t, left: Math.max(0, 1 - cycle / candleBurn), lit: cycle < candleBurn, outFor: cycle - candleBurn }
}

nvGold = [214, 168, 74]
nvDeep = [16, 52, 56]
nvTeal = [32, 86, 88]

nvHolder = (x, base, w) => {
  // a lily-shaped cup on a stem that curls into two whiplash feet
  const lw = Math.max(1, w * 0.07)
  p5.stroke(nvGold); p5.strokeWeight(lw)
  p5.fill(120, 82, 38)
  p5.beginShape()
  p5.vertex(x - w * 1.0, base - w * 0.25)
  p5.bezierVertex(x - w * 0.8, base + w * 0.4, x + w * 0.8, base + w * 0.4, x + w * 1.0, base - w * 0.25)
  p5.bezierVertex(x + w * 0.5, base, x - w * 0.5, base, x - w * 1.0, base - w * 0.25)
  p5.endShape(p5.CLOSE)
  p5.noFill()
  const foot = p5.height * 0.97
  p5.bezier(x, base + w * 0.25, x, foot - w, x - w * 1.6, foot - w * 0.2, x - w * 0.9, foot - w * 0.9)
  p5.bezier(x, base + w * 0.25, x, foot - w, x + w * 1.6, foot - w * 0.2, x + w * 0.9, foot - w * 0.9)
  p5.circle(x - w * 0.9, foot - w * 0.75, w * 0.3)
  p5.circle(x + w * 0.9, foot - w * 0.75, w * 0.3)
  p5.line(x - w * 1.2, foot, x + w * 1.2, foot)
}

nvCandle = (x, base, side, c) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.08
  const h = p5.height * 0.45 * (0.1 + 0.9 * c.left)
  const top = base - h
  const flick = p5.noise(c.t * 4 + side * 5)
  const lw = Math.max(1, w * 0.07)
  const fy = top - w * 0.2
  const fh = w * (1.5 + 0.25 * flick)
  const hy = fy - fh * 0.45

  // halo: concentric gold rings with a beaded ring, slowly turning
  p5.noStroke()
  p5.fill(c.lit ? [240, 214, 150] : [120, 140, 130])
  p5.circle(x, hy, s * 0.24)
  p5.noFill()
  p5.stroke(nvGold); p5.strokeWeight(lw)
  p5.circle(x, hy, s * 0.24)
  p5.circle(x, hy, s * 0.2)
  p5.circle(x, hy, s * 0.3)
  p5.fill(nvGold); p5.noStroke()
  for (let i = 0; i < 24; i++) {
    const ang = i / 24 * p5.TWO_PI + c.t * 0.1
    p5.circle(x + Math.cos(ang) * s * 0.135, hy + Math.sin(ang) * s * 0.135, w * 0.1)
  }

  nvHolder(x, base, w)

  // ivory candle with a flat shade band
  p5.stroke(nvGold); p5.strokeWeight(lw)
  p5.fill(244, 234, 210)
  p5.rect(x - w / 2, top, w, h)
  p5.noStroke()
  p5.fill(214, 196, 166)
  p5.rect(x + w * 0.15, top + lw / 2, w * 0.3, h - lw)
  // one long drip that curls like a vine
  p5.noFill(); p5.stroke(244, 234, 210); p5.strokeWeight(w * 0.12)
  const dl = w * (0.5 + 1.5 * (1 - c.left))
  p5.bezier(x - w * 0.5, top + w * 0.05, x - w * 0.62, top + dl * 0.3, x - w * 0.45, top + dl * 0.6, x - w * 0.55, top + dl)
  p5.stroke(nvGold); p5.strokeWeight(lw)
  p5.ellipse(x, top, w, w * 0.25)
  p5.line(x, top, x, fy)

  if (c.lit) {
    // stylised whiplash flame: an S-curved tip
    const lean = (p5.noise(c.t * 1.5 + side * 3) - 0.5) * w * 0.8
    const flame = (k, col) => {
      p5.fill(col)
      p5.beginShape()
      p5.vertex(x + lean * k, fy - fh * k)
      p5.bezierVertex(x - w * 0.2 * k, fy - fh * 0.7 * k, x + w * 0.5 * k, fy - fh * 0.4 * k, x + w * 0.35 * k, fy)
      p5.bezierVertex(x + w * 0.2 * k, fy + w * 0.15 * k, x - w * 0.2 * k, fy + w * 0.15 * k, x - w * 0.35 * k, fy)
      p5.bezierVertex(x - w * 0.5 * k, fy - fh * 0.3 * k, x + lean * 0.2 * k, fy - fh * 0.6 * k, x + lean * k, fy - fh * k)
      p5.endShape(p5.CLOSE)
    }
    p5.stroke(nvGold); p5.strokeWeight(lw)
    flame(1, p5.color(226, 96, 48))
    p5.noStroke()
    flame(0.6, p5.color(250, 196, 80))
  } else if (c.outFor < candleOut) {
    // smoke as a single ornamental spiral
    const k = c.outFor / candleOut
    p5.noFill()
    p5.stroke(nvGold[0], nvGold[1], nvGold[2], 255 * (1 - k))
    p5.strokeWeight(lw)
    p5.beginShape()
    for (let i = 0; i < 60; i++) {
      const ang = i * 0.25 + c.t
      const r = w * 0.05 * i * 0.15
      p5.vertex(x + Math.cos(ang) * r * 3, fy - i * w * 0.05 - k * w * 0.6)
    }
    p5.endShape()
  }
}

p5.draw = () => {
  const c = candleClock()
  if (candleBackground) p5.background(nvDeep)
  else p5.clear()
  // a panel with gold rule lines and corner arcs
  const m = Math.min(p5.width, p5.height) * 0.04
  if (candleBackground) {
    p5.noStroke(); p5.fill(nvTeal)
    p5.rect(m, m, p5.width - m * 2, p5.height - m * 2, m * 2)
    p5.noFill(); p5.stroke(nvGold); p5.strokeWeight(Math.max(1, m * 0.12))
    p5.rect(m, m, p5.width - m * 2, p5.height - m * 2, m * 2)
    p5.rect(m * 1.5, m * 1.5, p5.width - m * 3, p5.height - m * 3, m * 1.6)
  }
  const base = p5.height * 0.7
  nvCandle(p5.width * 0.11, base, 0, c)
  nvCandle(p5.width * 0.89, base, 1, c)
}

// hydra background (Hesse's), drawn into o1 so the candles stay crisp on top of the feedback
o1.setLinear()
a.show()

_factor = 1
a_factor = [0.5, 0.87, 0.2, 0.75, 0.55, 0.92, -0.3, 0.5].smooth().fast(0.1)
osc(16, -0.1, 1)
  .glow(src(o1).invert().modulateRotate(o1), a_factor)
  .modulate(voronoi(64, 1, 2))
  .blend(o1)
  .out(o1)

// p5's canvas arrives with straight (not premultiplied) alpha, but hyper-hydra's layer()
// expects premultiplied colour, which turns soft glows into white discs. This blends it right.
setFunction({
  name: 'layerP5',
  type: 'combine',
  inputs: [],
  glsl: 'return vec4(mix(_c0.rgb, _c1.rgb, _c1.a), max(_c0.a, _c1.a));'
})
src(o1).layerP5(src(s0)).out(o0)
render(o0)
// to let the candles melt into the feedback instead, use o0 in place of o1 above,
// end that chain with .layerP5(src(s0)).out() and drop the last two lines
