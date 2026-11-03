// Candle draft 2/10: ink sketch. Pen drawing on sketchbook paper: wobbly
// outlines that "boil" a few times a second, cross-hatched shadows and little
// light strokes around the flame.
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

// a pen line with a slight tremor; `seed` changes 8 times a second so lines boil
inkLine = (x1, y1, x2, y2, seed, wob) => {
  const n = Math.max(2, Math.ceil(p5.dist(x1, y1, x2, y2) / 6))
  p5.beginShape()
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const j = (p5.noise(seed * 7.3 + k * 2.5, x1 * 0.01, y1 * 0.01) - 0.5) * wob
    p5.vertex(p5.lerp(x1, x2, k) + j, p5.lerp(y1, y2, k) + j * 0.6)
  }
  p5.endShape()
}

inkPaper = null
inkMakePaper = () => {
  const g = p5.createGraphics(p5.width, p5.height)
  g.background(242, 235, 218)
  g.noStroke()
  for (let i = 0; i < p5.width * p5.height * 0.02; i++) {
    g.fill(120, 100, 70, p5.random(6, 18))
    g.rect(p5.random(p5.width), p5.random(p5.height), 1, 1)
  }
  return g
}

inkCandle = (x, base, side, c, seed) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.08
  const h = p5.height * 0.55 * (0.1 + 0.9 * c.left)
  const top = base - h
  const wob = s * 0.008
  p5.noFill()
  p5.stroke(28, 24, 30)
  p5.strokeWeight(Math.max(1, s * 0.004))

  // outline, drawn twice like a quick sketch
  for (let pass = 0; pass < 2; pass++) {
    const sd = seed + pass * 13 + side * 5
    inkLine(x - w / 2, top + w * 0.1, x - w / 2, base, sd, wob)
    inkLine(x + w / 2, top + w * 0.1, x + w / 2, base, sd + 1, wob)
    p5.ellipse(x + (p5.noise(sd) - 0.5) * wob, top + w * 0.1, w, w * 0.32)
  }
  // shadow hatching on the side away from the middle of the screen
  p5.strokeWeight(Math.max(0.7, s * 0.0025))
  const dir = side ? -1 : 1
  for (let y = top + w * 0.35; y < base - 2; y += s * 0.024) {
    const xa = x + dir * w * 0.5
    inkLine(xa, y, xa - dir * w * 0.3, y + s * 0.02, seed + y, wob * 0.4)
  }
  // drip
  const dx = x - dir * w * 0.2
  inkLine(dx, top + w * 0.25, dx, top + w * (0.6 + 0.6 * p5.noise(side)), seed + 3, wob * 0.5)
  // saucer
  p5.strokeWeight(Math.max(1, s * 0.004))
  p5.ellipse(x, base, w * 2.3, w * 0.45)
  p5.arc(x, base + w * 0.05, w * 2.3, w * 0.6, 0, p5.PI)
  // wick
  inkLine(x, top + w * 0.1, x + w * 0.05, top - w * 0.2, seed, wob * 0.3)

  const fy = top - w * 0.2
  if (c.lit) {
    const fh = w * (1.5 + 0.4 * p5.noise(c.t * 4 + side * 9))
    const lean = (p5.noise(c.t * 2 + side) - 0.5) * w * 0.5
    for (let pass = 0; pass < 2; pass++) {
      const j = (p5.noise(seed + pass * 4) - 0.5) * wob
      p5.beginShape()
      p5.vertex(x + lean + j, fy - fh)
      p5.bezierVertex(x + w * 0.45, fy - fh * 0.35, x + w * 0.35 + j, fy + w * 0.1, x, fy + w * 0.1)
      p5.bezierVertex(x - w * 0.35, fy + w * 0.1, x - w * 0.45 + j, fy - fh * 0.35, x + lean + j, fy - fh)
      p5.endShape()
    }
    // inner flame and light strokes
    p5.ellipse(x + lean * 0.3, fy - fh * 0.2, w * 0.2, w * 0.5)
    for (let i = 0; i < 9; i++) {
      const ang = -p5.PI / 2 + (i - 4) * 0.36 + (p5.noise(seed + i) - 0.5) * 0.2
      const r1 = w * 1.2
      const r2 = w * (1.55 + 0.25 * p5.noise(seed * 0.5 + i))
      const cy = fy - fh * 0.4
      inkLine(x + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, x + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, seed + i, wob * 0.3)
    }
  } else if (c.outFor < candleOut) {
    // smoke: a curly pen line that drifts up and thins out
    const k = c.outFor / candleOut
    p5.stroke(28, 24, 30, 255 * (1 - k))
    p5.beginShape()
    for (let i = 0; i < 40; i++) {
      const yy = fy - i * w * 0.12 - k * w
      p5.curveVertex(x + Math.sin(i * 0.5 - c.t * 3) * w * 0.15 * (i / 10), yy)
    }
    p5.endShape()
  }
}

p5.draw = () => {
  if (!inkPaper || inkPaper.width !== p5.width) inkPaper = inkMakePaper()
  const c = candleClock()
  if (candleBackground) p5.image(inkPaper, 0, 0)
  else p5.clear()
  const seed = Math.floor(c.t * 8)
  const base = p5.height * 0.9
  inkCandle(p5.width * 0.09, base, 0, c, seed)
  inkCandle(p5.width * 0.91, base, 1, c, seed)
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
