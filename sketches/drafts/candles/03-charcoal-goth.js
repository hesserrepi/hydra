// Candle draft 3/10: charcoal goth. Black candles in heavy, smudged charcoal on
// tall iron stands, red pencil wax running down them, a red-hearted flame and
// a thin thread of smoke that never stops.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out (smoking) before it relights
candleBackground = false // true paints this draft's own backdrop; false keeps it transparent so hydra shows behind
candlePaper = 0.75 // soft patch behind each candle so the lines read over hydra (0 = none)
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

gothCandle = (x, base, side, c) => {
  const { w, h, top, fy, fh, lean, s, seed } = hdGeo(x, base, side, c, 0.085, 0.42)
  const char = [18, 14, 20]
  const o = { col: char, weight: 3, jitter: 2.2, grain: 0.75, gaps: 0.06 }
  const red = [168, 22, 34]
  hdPaper(x, (top + base) / 2 - w, w * 3.6, (base - top) / 2 + w * 3.6, '26,18,28')
  if (c.lit) hdGlow(x, fy - fh * 0.5, s * 0.45, '200,30,40', 0.3)
  // iron stand: a wobbly stem with knots, a dish and splayed feet
  const foot = p5.height * 0.97
  hdStroke(hdSeg(x, base + w * 0.3, x, foot - w * 0.6, 0), { ...o, weight: 4, seed: seed + 1 })
  for (let y = base + w * 0.8; y < foot - w; y += w * 0.7) hdStroke(hdArc(x, y, w * 0.22, w * 0.1, 0, p5.TWO_PI + 0.3, 12), { ...o, weight: 2.4, seed: seed + y })
  hdStroke([[x - w * 1.3, base], [x - w * 0.5, base + w * 0.35], [x + w * 0.5, base + w * 0.35], [x + w * 1.3, base]], { ...o, seed: seed + 2 })
  for (const sg of [-1, 1]) hdStroke([[x, foot - w * 0.8], [x + sg * w * 0.5, foot - w * 0.5], [x + sg * w * 1.1, foot]], { ...o, seed: seed + 3 + sg })
  // body: outline plus dense diagonal hatching, lighter towards the middle of the screen
  hdStroke(hdSeg(x - w / 2, top, x - w / 2, base), { ...o, seed: seed + 4 })
  hdStroke(hdSeg(x + w / 2, top, x + w / 2, base), { ...o, seed: seed + 5 })
  for (let y = top + w * 0.15; y < base; y += w * 0.11) {
    hdStroke([[x - w * 0.45, Math.min(base, y + w * 0.3)], [x + w * 0.45, y]], { ...o, weight: 1.8, alpha: 170, gaps: 0.2, seed: seed + y * 0.1 })
  }
  // red wax: drips that lengthen as it burns, and a pool on the dish
  const melted = 1 - c.left
  for (let i = 0; i < 4; i++) {
    const dx = x + (i / 3 - 0.5) * w * 0.85
    const len = Math.min(h * 0.85, w * (0.3 + 1.6 * hdHash(seed + i)) * (0.4 + melted * 1.4))
    hdStroke([[dx, top], [dx + w * 0.02, top + len * 0.6], [dx, top + len]], { ...o, col: red, weight: 2.6, grain: 0.4, gaps: 0.02, seed: seed + 20 + i })
  }
  hdStroke(hdArc(x, base - w * 0.04, w * (0.6 + 0.5 * melted), w * 0.1, 0, p5.TWO_PI, 16), { ...o, col: red, weight: 2.4, seed: seed + 6 })
  hdStroke(hdArc(x, top, w / 2, w * 0.13, 0, p5.TWO_PI + 0.2), { ...o, col: red, weight: 2.2, seed: seed + 7 })
  hdStroke([[x, top], [x, fy]], { ...o, weight: 2, seed: seed + 8 })
  if (c.lit) {
    hdWash(hdTear(x, fy, w * 0.4, fh * 1.1, lean), [210, 40, 50], 120, seed + 9, w * 0.05)
    hdWash(hdTear(x, fy, w * 0.2, fh * 0.6, lean * 0.6), [255, 190, 160], 200, seed + 10, w * 0.03)
    hdStroke(hdTear(x, fy, w * 0.42, fh * 1.1, lean, 0.4), { ...o, col: [90, 10, 20], weight: 1.4, seed: seed + 11 })
  }
  // charcoal smoke: a faint thread while lit, a heavy curl when it dies
  const thread = []
  for (let i = 0; i < 30; i++) thread.push([x + (p5.noise(i * 0.08 - c.t * 0.4, side * 9) - 0.5) * w * 3 * (i / 30), fy - w * 2.2 - i * s * 0.015])
  hdStroke(thread, { ...o, col: [150, 140, 160], weight: 1, alpha: c.lit ? 70 : 140, gaps: 0.25, seed: seed + 12 })
  hdSmoke(x, fy, w, c, [150, 140, 160], 2.4, seed + 30)
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  if (candleBackground) p5.background(26, 18, 28)
  else p5.clear()
  const base = p5.height * 0.6
  gothCandle(p5.width * 0.09, base, 0, c)
  gothCandle(p5.width * 0.91, base, 1, c)
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
