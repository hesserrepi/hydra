// Candle draft 2/10: botanical. Each candle grows out of a tuft of long,
// blade-like leaves with roots below, drawn in sepia ink like an old herbarium
// sheet. The leaves sway a little and the flame opens like a bud.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out (smoking) before it relights
candleBackground = false // true paints this draft's own backdrop; false keeps it transparent so hydra shows behind
candlePaper = 0.85 // soft patch behind each candle so the lines read over hydra (0 = none)
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

// one leaf blade from its foot (x, y): out along `ang`, bending as it goes, open at the foot
botLeaf = (x, y, len, ang, bend, wid) => {
  const side = []
  const back = []
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    const a2 = ang + bend * u * u
    const px = x + Math.cos(ang) * len * u + Math.cos(a2) * len * u * u * 0.15
    const py = y + Math.sin(ang) * len * u + Math.sin(a2) * len * u * u * 0.15
    const half = wid * Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - u * 0.6)
    side.push([px - Math.sin(a2) * half, py + Math.cos(a2) * half])
    back.unshift([px + Math.sin(a2) * half, py - Math.cos(a2) * half])
  }
  return side.concat(back)
}

botCandle = (x, base, side, c) => {
  const { w, h, top, fy, fh, lean, seed } = hdGeo(x, base, side, c, 0.065, 0.5)
  const ink = [74, 56, 40]
  const leafInk = [70, 84, 56]
  const o = { col: ink, weight: 1.1, jitter: 1.2, grain: 0.4, gaps: 0.08 }
  hdPaper(x, (top + base) / 2, w * 3.6, (base - top) / 2 + w * 4, '244,238,224')
  if (c.lit) hdGlow(x, fy - fh * 0.4, w * 2.4, '255,214,140', 0.2)
  // roots
  for (let i = 0; i < 6; i++) {
    const ang = p5.HALF_PI + (i - 2.5) * 0.3
    const len = w * (0.9 + 0.7 * hdHash(seed + i))
    hdStroke([[x + (i - 2.5) * w * 0.08, base], [x + Math.cos(ang) * len * 0.5, base + Math.sin(ang) * len * 0.5 + w * 0.1], [x + Math.cos(ang + 0.2) * len, base + Math.sin(ang + 0.2) * len]], { ...o, weight: 0.8, seed: seed + 40 + i })
  }
  // leaves sprouting from the base, swaying slowly
  for (let i = 0; i < 6; i++) {
    const sgn = i % 2 ? 1 : -1
    const spread = 0.35 + 0.18 * Math.floor(i / 2)
    const sway = (p5.noise(c.t * 0.3 + i + side * 7) - 0.5) * 0.25
    const ang = -p5.HALF_PI + sgn * spread + sway
    const len = w * (2.2 + 1.4 * hdHash(seed + 10 + i))
    hdStroke(botLeaf(x + sgn * w * 0.2, base, len, ang, sgn * 0.6, w * 0.14), { ...o, col: leafInk, seed: seed + 50 + i })
    hdStroke([[x + sgn * w * 0.2, base], [x + sgn * w * 0.2 + Math.cos(ang) * len * 0.8, base + Math.sin(ang) * len * 0.8]], { ...o, col: leafInk, weight: 0.6, alpha: 140, seed: seed + 60 + i })
  }
  // the candle: a pale stem
  hdWash(hdRect(x - w / 2, top, w, h), [250, 244, 230], candleBackground ? 0 : 160, seed + 5, w * 0.03)
  hdStroke(hdSeg(x - w / 2, top, x - w / 2, base), { ...o, seed: seed + 1 })
  hdStroke(hdSeg(x + w / 2, top, x + w / 2, base), { ...o, seed: seed + 2 })
  hdStroke(hdArc(x, top, w / 2, w * 0.12, 0.2, p5.TWO_PI), { ...o, seed: seed + 3 })
  hdStroke([[x, top], [x + w * 0.04, fy]], { ...o, weight: 1.4, seed: seed + 4 })
  if (c.lit) {
    // the flame as a bud: an open outline with petal veins
    hdWash(hdTear(x, fy, w * 0.45, fh, lean), [250, 196, 110], 80, seed + 6, w * 0.06)
    hdStroke(hdTear(x, fy, w * 0.45, fh, lean, 0.25), { ...o, seed: seed + 7 })
    for (let v = -1; v <= 1; v++) {
      hdStroke([[x + v * w * 0.08, fy + w * 0.12], [x + v * w * 0.16 + lean * 0.3, fy - fh * 0.4], [x + lean * 0.8 + v * w * 0.05, fy - fh * 0.85]], { ...o, weight: 0.6, alpha: 150, seed: seed + 8 + v })
    }
  }
  hdSmoke(x, fy, w, c, ink, 0.8, seed + 30)
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  if (candleBackground) p5.background(240, 234, 220)
  else p5.clear()
  const base = p5.height * 0.8
  botCandle(p5.width * 0.09, base, 0, c)
  botCandle(p5.width * 0.91, base, 1, c)
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
