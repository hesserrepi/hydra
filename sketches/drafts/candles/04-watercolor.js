// Candle draft 4/10: watercolor. Loose washes on cold-press paper: the wax,
// the flame and its halo are layers of translucent pigment with darker,
// pooled edges that breathe slowly.
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

wcPaper = null
wcMakePaper = () => {
  const g = p5.createGraphics(p5.width, p5.height)
  g.background(246, 241, 230)
  g.noStroke()
  for (let i = 0; i < 2500; i++) {
    const x = p5.random(p5.width)
    const y = p5.random(p5.height)
    g.fill(170, 150, 120, p5.random(3, 9))
    g.ellipse(x, y, p5.random(2, 9), p5.random(2, 9))
  }
  return g
}

// one wash: a polygon pushed out by noise, painted in several faint layers,
// with a stronger outline where pigment pools at the edge
wcWash = (pts, col, seed, t, spread) => {
  const ctx = p5.drawingContext
  for (let layer = 0; layer < 5; layer++) {
    p5.fill(p5.red(col), p5.green(col), p5.blue(col), 26)
    p5.stroke(p5.red(col) * 0.75, p5.green(col) * 0.75, p5.blue(col) * 0.75, 28)
    p5.strokeWeight(1.5)
    p5.beginShape()
    pts.forEach(([x, y], i) => {
      const n = p5.noise(seed + layer * 3.3 + i * 0.37, t * 0.15)
      const ang = n * p5.TWO_PI * 2
      p5.vertex(x + Math.cos(ang) * spread * n, y + Math.sin(ang) * spread * n)
    })
    p5.endShape(p5.CLOSE)
  }
  ctx.globalAlpha = 1
}

// points around a rectangle / ellipse, so the washes have enough vertices to wobble
wcRect = (x, y, w, h) => {
  const pts = []
  const n = 14
  for (let i = 0; i < n; i++) pts.push([x + w * i / n, y])
  for (let i = 0; i < n; i++) pts.push([x + w, y + h * i / n])
  for (let i = 0; i < n; i++) pts.push([x + w - w * i / n, y + h])
  for (let i = 0; i < n; i++) pts.push([x, y + h - h * i / n])
  return pts
}
wcBlob = (x, y, rx, ry, pull = 0) => {
  const pts = []
  for (let i = 0; i < 36; i++) {
    const ang = i / 36 * p5.TWO_PI - p5.HALF_PI
    const up = Math.max(0, -Math.sin(ang)) ** 3 * pull
    pts.push([x + Math.cos(ang) * rx * (1 - up * 0.6), y + Math.sin(ang) * ry - up * ry])
  }
  return pts
}

wcCandle = (x, base, side, c) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.08
  const h = p5.height * 0.55 * (0.1 + 0.9 * c.left)
  const top = base - h
  const seed = side * 50
  const flick = p5.noise(c.t * 3 + side * 9)

  if (c.lit) wcWash(wcBlob(x, top - w * 0.9, s * 0.15, s * 0.15), p5.color(250, 205, 130), seed + 1, c.t, s * 0.05)
  wcWash(wcBlob(x, base + w * 0.1, w * 1.3, w * 0.25), p5.color(150, 160, 190), seed + 2, c.t, w * 0.15)
  wcWash(wcRect(x - w / 2, top, w, h), p5.color(214, 160, 150), seed + 3, c.t, w * 0.12)
  wcWash(wcRect(x - w / 2, top, w * 0.35, h), p5.color(170, 110, 120), seed + 4, c.t, w * 0.08)

  p5.stroke(70, 50, 50, 180)
  p5.strokeWeight(Math.max(1, w * 0.06))
  p5.line(x, top, x + w * 0.04, top - w * 0.25)

  const fy = top - w * 0.25
  if (c.lit) {
    const fh = w * (1.1 + 0.3 * flick)
    p5.noStroke()
    wcWash(wcBlob(x, fy - fh * 0.3, w * 0.42, fh * 0.55, 1.4), p5.color(240, 140, 60), seed + 5, c.t * 4, w * 0.1)
    wcWash(wcBlob(x, fy - fh * 0.2, w * 0.22, fh * 0.35, 1.2), p5.color(250, 220, 90), seed + 6, c.t * 4, w * 0.06)
  } else if (c.outFor < candleOut) {
    const k = c.outFor / candleOut
    wcWash(wcBlob(x + w * 0.3, fy - w * (1 + 3 * k), w * (0.5 + k), w * (0.8 + k)), p5.color(140, 140, 160, 0), seed + 7, c.t, w * 0.3 * (1 - k * 0.5))
  }
}

p5.draw = () => {
  if (!wcPaper || wcPaper.width !== p5.width) wcPaper = wcMakePaper()
  const c = candleClock()
  if (candleBackground) p5.image(wcPaper, 0, 0)
  else p5.clear()
  const base = p5.height * 0.9
  wcCandle(p5.width * 0.09, base, 0, c)
  wcCandle(p5.width * 0.91, base, 1, c)
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
