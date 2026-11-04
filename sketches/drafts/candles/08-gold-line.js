// Candle draft 8/10: gold line. A single fine gold line, art-nouveau in
// spirit: ivory candles in curling holders, each flame inside loose hand-drawn
// halo rings, a whiplash curl at the tip of the flame.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out (smoking) before it relights
candleBackground = false // true paints this draft's own backdrop; false keeps it transparent so hydra shows behind
candlePaper = 0.8 // soft patch behind each candle so the lines read over hydra (0 = none)
candleT0 = p5.millis()
candleClock = () => {
  const t = (p5.millis() - candleT0) / 1000
  const cycle = t % (candleBurn + candleOut)
  return { t, left: Math.max(0, 1 - cycle / candleBurn), lit: cycle < candleBurn, outFor: cycle - candleBurn }
}

// --- hand-drawn line kit (the same in every draft) ---
// Lines are drawn as many short segments that wander off the ideal path,
// change pressure, skip where the pencil lifts and pick up paper tooth.
hdSeed = 0 // set a few times a second in p5.draw so the lines "boil" gently
hdHash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v) }

hdStroke = (pts, { col = [50, 46, 44], weight = 1.2, jitter = 1.4, grain = 0.5, gaps = 0.1, seed = 0, alpha = 230 } = {}) => {
  const k = Math.min(p5.width, p5.height) / 540 // sizes are tuned at 540 px
  let dist = 0
  p5.strokeCap(p5.ROUND)
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const len = Math.hypot(x2 - x1, y2 - y1) || 0.001
    const steps = Math.max(1, Math.ceil(len / (2.5 * k)))
    const nx = -(y2 - y1) / len
    const ny = (x2 - x1) / len
    let px, py
    for (let j = 0; j <= steps; j++) {
      const u = j / steps
      const d = (dist + u * len) / k
      const off = (p5.noise(seed * 0.37 + d * 0.015, hdSeed * 0.35) - 0.5) * 2 * jitter * k
      const x = x1 + (x2 - x1) * u + nx * off
      const y = y1 + (y2 - y1) * u + ny * off
      if (j > 0 && p5.noise(seed + 50 + d * 0.012) > gaps) {
        const pressure = 0.45 + 0.8 * p5.noise(seed + 9 + d * 0.006)
        const tooth = 1 - grain * p5.noise(d * 0.8, seed + 3)
        p5.stroke(col[0], col[1], col[2], alpha * tooth)
        p5.strokeWeight(Math.max(0.5, weight * k * pressure))
        p5.line(px, py, x, y)
      }
      px = x
      py = y
    }
    dist += len
  }
}

// a straight line that overshoots both ends a little, as quick drawings do
hdSeg = (x1, y1, x2, y2, over = 0.04) => {
  const dx = (x2 - x1) * over
  const dy = (y2 - y1) * over
  return [[x1 - dx, y1 - dy], [(x1 + x2) / 2, (y1 + y2) / 2], [x2 + dx, y2 + dy]]
}
hdArc = (cx, cy, rx, ry, a0, a1, n = 24) => {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const ang = a0 + (a1 - a0) * i / n
    pts.push([cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry])
  }
  return pts
}
hdRect = (x, y, w, h) => [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]]
// flame outline from its base (x, y); `open` leaves a gap at the tip so it never quite closes
hdTear = (x, y, w, fh, lean, open = 0.2, n = 30) => {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const u = open + (p5.TWO_PI - open) * i / n
    const up = (1 + Math.cos(u)) / 2
    pts.push([x + lean * up * up + Math.sin(u) * Math.sin(u / 2) * w, y + w * 0.2 - (fh + w * 0.2) * up])
  }
  return pts
}
// a flat patch of colour whose edge wanders (one call per layer of pigment)
hdWash = (pts, col, alpha, seed, wob = 0, layers = 1) => {
  p5.noStroke()
  for (let l = 0; l < layers; l++) {
    p5.fill(col[0], col[1], col[2], alpha)
    p5.beginShape()
    pts.forEach(([x, y], i) => {
      const n1 = p5.noise(seed + l * 3.1 + i * 0.31, hdSeed * 0.2) - 0.5
      const n2 = p5.noise(seed + 40 + l * 3.1 + i * 0.31, hdSeed * 0.2) - 0.5
      p5.vertex(x + n1 * wob * 2, y + n2 * wob * 2)
    })
    p5.endShape(p5.CLOSE)
  }
}
hdGlow = (x, y, r, rgb, a) => {
  const ctx = p5.drawingContext
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(0.4, `rgba(${rgb},${a * 0.35})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}
// a soft patch of paper behind a candle, so fine lines still read over a busy hydra picture
hdPaper = (x, y, rx, ry, rgb) => {
  if (candleBackground || candlePaper <= 0) return
  const ctx = p5.drawingContext
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, `rgba(${rgb},${candlePaper})`)
  g.addColorStop(0.55, `rgba(${rgb},${candlePaper * 0.8})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
  ctx.restore()
}
// where everything sits for one candle at this moment
hdGeo = (x, base, side, c, width = 0.075, height = 0.55) => {
  const s = Math.min(p5.width, p5.height)
  const w = s * width
  const h = p5.height * height * (0.1 + 0.9 * c.left)
  const top = base - h
  const flick = p5.noise(c.t * 4 + side * 9)
  return {
    s, w, h, top, flick,
    k: s / 540,
    fy: top - w * 0.25,
    fh: w * (1.4 + 0.35 * flick),
    lean: (p5.noise(c.t * 1.6 + side * 3) - 0.5) * w * 0.6,
    seed: side * 100
  }
}
// smoke after the flame goes out: one curling line that drifts up and fades
hdSmoke = (x, y, w, c, col, weight, seed) => {
  if (c.lit || c.outFor > candleOut) return
  const f = c.outFor / candleOut
  const pts = []
  for (let i = 0; i < 26; i++) pts.push([x + Math.sin(i * 0.45 - c.t * 2.5) * w * 0.25 * (i / 10), y - i * w * 0.14 - f * w])
  hdStroke(pts, { col, weight, alpha: 220 * (1 - f), jitter: 1, grain: 0.5, gaps: 0.2, seed })
}
// --- end of kit ---

goldCandle = (x, base, side, c) => {
  const { w, h, top, fy, fh, lean, s, seed } = hdGeo(x, base, side, c, 0.08, 0.45)
  const gold = [214, 170, 80]
  const o = { col: gold, weight: 1.3, jitter: 1.1, grain: 0.3, gaps: 0.06 }
  const hy = fy - fh * 0.45
  hdPaper(x, (top + base) / 2 - w, w * 3.6, (base - top) / 2 + w * 4, '18,56,60')
  // halo: open rings that turn slowly, and a few beads
  if (c.lit) hdGlow(x, hy, s * 0.16, '250,220,150', 0.35)
  for (let r = 0; r < 3; r++) {
    const rad = s * (0.1 + r * 0.025)
    const a0 = c.t * 0.1 * (r % 2 ? -1 : 1) + r
    hdStroke(hdArc(x, hy, rad, rad, a0, a0 + p5.TWO_PI - 0.5, 40), { ...o, weight: 1, alpha: c.lit ? 220 : 110, seed: seed + 1 + r })
  }
  for (let i = 0; i < 10; i++) {
    const ang = i / 10 * p5.TWO_PI + c.t * 0.08
    hdStroke(hdArc(x + Math.cos(ang) * s * 0.15, hy + Math.sin(ang) * s * 0.15, w * 0.05, w * 0.05, 0, p5.TWO_PI, 8), { ...o, weight: 0.9, seed: seed + 10 + i })
  }
  // holder: a lily cup on a stem that curls into two feet
  const foot = p5.height * 0.96
  hdStroke([[x - w * 1.0, base - w * 0.25], [x - w * 0.5, base + w * 0.2], [x + w * 0.5, base + w * 0.2], [x + w * 1.0, base - w * 0.25]], { ...o, seed: seed + 20 })
  for (const sg of [-1, 1]) {
    const pts = []
    for (let i = 0; i <= 16; i++) {
      const u = i / 16
      pts.push([x + sg * Math.sin(u * 2.2) * w * 1.1 * u, base + w * 0.2 + (foot - base - w * 0.2) * u - Math.sin(u * 3.1) * w * 0.3])
    }
    hdStroke(pts, { ...o, seed: seed + 21 + sg })
    hdStroke(hdArc(pts[16][0] - sg * w * 0.15, pts[16][1] - w * 0.15, w * 0.15, w * 0.15, 0, p5.TWO_PI - 0.6, 10), { ...o, seed: seed + 23 + sg })
  }
  // ivory candle
  hdWash(hdRect(x - w / 2, top, w, h), [244, 234, 210], 220, seed + 30, w * 0.03)
  hdStroke(hdSeg(x - w / 2, top, x - w / 2, base), { ...o, seed: seed + 31 })
  hdStroke(hdSeg(x + w / 2, top, x + w / 2, base), { ...o, seed: seed + 32 })
  hdStroke(hdArc(x, top, w / 2, w * 0.12, 0.3, p5.TWO_PI + 0.2), { ...o, seed: seed + 33 })
  hdStroke([[x, top], [x, fy]], { ...o, seed: seed + 34 })
  if (c.lit) {
    hdWash(hdTear(x, fy, w * 0.4, fh, lean), [230, 100, 50], 200, seed + 35, w * 0.04)
    hdWash(hdTear(x, fy, w * 0.22, fh * 0.6, lean * 0.6), [252, 200, 90], 230, seed + 36, w * 0.03)
    // whiplash: the outline runs on past the tip into a curl
    const t = hdTear(x, fy, w * 0.42, fh, lean, 0.1)
    const tip = t[t.length - 1]
    const curl = []
    for (let i = 0; i <= 12; i++) {
      const u = i / 12
      curl.push([tip[0] + Math.sin(u * 4) * w * 0.25 * u, tip[1] - u * w * 0.6])
    }
    hdStroke(t.concat(curl), { ...o, seed: seed + 37 })
  }
  hdSmoke(x, fy, w, c, gold, 1, seed + 40)
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  if (candleBackground) p5.background(18, 56, 60)
  else p5.clear()
  const base = p5.height * 0.68
  goldCandle(p5.width * 0.09, base, 0, c)
  goldCandle(p5.width * 0.91, base, 1, c)
}

// hydra background (Hesse's), drawn into o1 so the candles stay on top of the feedback
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
// hydra gets a hand in the drawing too: a slow wobble, as if the paper breathes
candleLayer = src(s0).modulate(noise(2.5, 0.08), 0.005)
src(o1).layerP5(candleLayer).out(o0)
render(o0)
// try: candleLayer = src(s0).modulate(o1, 0.02) so the background pushes the lines around
