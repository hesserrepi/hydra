// Candle draft 7/10: cyanotype. A sun print: each candle sits on a
// brushed sheet of Prussian blue, the candle, ferns and flame printed into it
// in white. The candle leaves a faint ghost of the height it had.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out (smoking) before it relights
candleBackground = false // true paints this draft's own backdrop; false keeps it transparent so hydra shows behind
candleHalo = true // thin contrasting edge under the lines so they read over hydra (false = bare lines)
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

hdStroke = (pts, { col = [50, 46, 44], weight = 1.2, jitter = 1.4, grain = 0.5, gaps = 0.1, seed = 0, alpha = 230, halo = null, haloAlpha = 110 } = {}) => {
  const k = Math.min(p5.width, p5.height) / 540 // sizes are tuned at 540 px
  const segs = []
  let dist = 0
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
        segs.push([px, py, x, y, Math.max(0.5, weight * k * pressure), alpha * tooth])
      }
      px = x
      py = y
    }
    dist += len
  }
  p5.strokeCap(p5.ROUND)
  // a thin contrasting edge under the line (not a glow), so it reads over a busy hydra picture
  if (halo && candleHalo && !candleBackground) {
    p5.stroke(halo[0], halo[1], halo[2], haloAlpha)
    segs.forEach((g) => { p5.strokeWeight(g[4] + 2.4 * k); p5.line(g[0], g[1], g[2], g[3]) })
  }
  segs.forEach((g) => {
    p5.stroke(col[0], col[1], col[2], g[5])
    p5.strokeWeight(g[4])
    p5.line(g[0], g[1], g[2], g[3])
  })
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
// particles that leave (x, y), swirl outwards and fade, worked out from the clock alone.
// draw(px, py, age 0..1, index) paints one of them.
hdSparks = (x, y, t, { count = 40, life = 4, reach = 100, swirl = 1.5, rise = 0.4, seed = 0, draw }) => {
  for (let i = 0; i < count; i++) {
    const age = ((t + hdHash(seed + i) * life) % life) / life
    const dir = hdHash(seed + i * 2.7) > 0.5 ? 1 : -1
    const ang = hdHash(seed + i * 1.3) * p5.TWO_PI + age * swirl * dir
    const r = reach * (0.12 + age * (0.5 + 0.7 * hdHash(seed + i * 3.1)))
    draw(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.8 - age * reach * rise, age, i)
  }
}
// rotate a list of points around (cx, cy)
hdRot = (pts, cx, cy, ang) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(ang) - (y - cy) * Math.sin(ang), cy + (x - cx) * Math.sin(ang) + (y - cy) * Math.cos(ang)])
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

cyanFern = (x, y, len, ang, seed) => {
  // a pressed fern frond: a curved rib with paired, slanted leaflets getting smaller
  const rib = []
  for (let i = 0; i <= 14; i++) {
    const u = i / 14
    const a2 = ang + u * 0.5
    const px = x + Math.cos(ang) * len * u + Math.cos(a2) * len * u * u * 0.2
    const py = y + Math.sin(ang) * len * u + Math.sin(a2) * len * u * u * 0.2
    rib.push([px, py])
    if (i === 0 || i === 14) continue
    const sz = len * 0.13 * (1 - u * 0.75)
    for (const sg of [-1, 1]) {
      const la = a2 + sg * 0.9
      const cx = px + Math.cos(la) * sz
      const cy = py + Math.sin(la) * sz
      hdWash(hdRot(hdArc(cx, cy, sz, sz * 0.32, 0, p5.TWO_PI, 10), cx, cy, la), [235, 244, 250], 170, seed + i * 2 + sg, 0)
    }
  }
  hdStroke(rib, { col: [235, 244, 250], weight: 1, jitter: 0.6, grain: 0.3, gaps: 0.04, seed })
}

cyanCandle = (x, base, side, c) => {
  const { w, h, top, fy, fh, lean, s, seed } = hdGeo(x, base, side, c, 0.08, 0.52)
  const white = [236, 244, 250]
  const o = { col: white, weight: 1.4, jitter: 1.1, grain: 0.35, gaps: 0.06 }
  // the sheet: brushed-on chemistry with ragged edges and brush streaks
  const fullTop = base - p5.height * 0.52 - w * 2.6
  const left = Math.max(s * 0.02, x - w * 2.3)
  const right = Math.min(p5.width - s * 0.02, x + w * 2.3)
  hdWash(hdRect(left, fullTop, right - left, base + w * 0.7 - fullTop), [20, 56, 118], 255, seed + 1, w * 0.12)
  hdWash(hdRect(left + w * 0.1, fullTop + w * 0.1, right - left - w * 0.2, base + w * 0.5 - fullTop), [28, 70, 138], 120, seed + 2, w * 0.2, 2)
  for (let i = 0; i < 9; i++) {
    const yy = fullTop + (base - fullTop) * hdHash(seed + i * 4)
    hdStroke([[left + w * 0.1, yy], [right - w * 0.1, yy + w * 0.3 * (hdHash(seed + i) - 0.5)]], { col: [50, 96, 160], weight: 5, jitter: 2, grain: 0.7, gaps: 0.3, alpha: 60, seed: seed + 10 + i })
  }
  // ferns printed at the foot
  cyanFern(left + w * 0.3, base + w * 0.4, w * 2.2, -1.2, seed + 20)
  cyanFern(right - w * 0.3, base + w * 0.4, w * 1.8, -1.9, seed + 30)
  // ghost of the full candle, then the candle itself
  hdWash(hdRect(x - w / 2, base - p5.height * 0.52, w, p5.height * 0.52), white, 30, seed + 3, w * 0.04)
  hdWash(hdRect(x - w / 2 - w * 0.06, top, w * 1.12, h), white, 80, seed + 4, w * 0.08)
  hdWash(hdRect(x - w / 2, top, w, h), white, 200, seed + 5, w * 0.03)
  hdStroke(hdArc(x, base, w * 1.2, w * 0.22, 0, p5.TWO_PI + 0.2), { ...o, seed: seed + 6 })
  hdStroke([[x, top], [x, fy]], { ...o, col: [20, 56, 118], weight: 1.6, seed: seed + 7 })
  if (c.lit) {
    hdWash(hdTear(x, fy, w * 0.55, fh * 1.15, lean), white, 70, seed + 8, w * 0.1)
    hdWash(hdTear(x, fy, w * 0.4, fh, lean), white, 230, seed + 9, w * 0.04)
    hdStroke(hdTear(x, fy, w * 0.18, fh * 0.5, lean * 0.5, 0.5), { ...o, col: [120, 170, 220], weight: 1, seed: seed + 10 })
  }
  hdSmoke(x, fy, w, c, white, 1.2, seed + 40)
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  if (candleBackground) p5.background(232, 228, 216)
  else p5.clear()
  const base = p5.height * 0.9
  cyanCandle(p5.width * 0.09, base, 0, c)
  cyanCandle(p5.width * 0.91, base, 1, c)
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
