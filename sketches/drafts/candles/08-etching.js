// Candle draft 8/10: etching. An old engraving: baroque candlesticks
// turned on a lathe, the wax modelled entirely with hatching that follows the
// round of the candle, and a flame left as bare paper with fine rays.
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

// the candlestick's turned profile: radius (in candle widths) from the cup (u = 0) down to the foot (u = 1)
etchProfile = [[0, 1.0], [0.06, 0.45], [0.12, 0.3], [0.2, 0.28], [0.3, 0.55], [0.36, 0.3], [0.5, 0.22], [0.62, 0.26], [0.7, 0.45], [0.76, 0.3], [0.86, 0.5], [0.95, 1.25], [1, 1.25]]
etchR = (u) => {
  for (let i = 1; i < etchProfile.length; i++) {
    const [u1, r1] = etchProfile[i]
    const [u0, r0] = etchProfile[i - 1]
    if (u <= u1) return r0 + (r1 - r0) * (u - u0) / (u1 - u0)
  }
  return 1.25
}

etchCandle = (x, base, side, c) => {
  const { w, h, top, fy, fh, lean, s, seed } = hdGeo(x, base, side, c, 0.08, 0.45)
  const ink = [34, 26, 22]
  const paper = [240, 232, 214]
  const o = { col: ink, weight: 0.9, jitter: 0.6, grain: 0.3, gaps: 0.04, halo: paper, haloAlpha: 140 }
  const dir = side ? -1 : 1 // shadow side faces the screen edge
  if (c.lit) hdGlow(x, fy - fh * 0.5, fh * 1.6, '255,230,170', 0.4)
  // candlestick
  const foot = p5.height * 0.97
  const L = []
  const R = []
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    const y = base + (foot - base) * u
    L.push([x - etchR(u) * w, y])
    R.push([x + etchR(u) * w, y])
  }
  hdWash(L.concat(R.slice().reverse()), paper, 235, seed + 1, 0)
  hdStroke(L, { ...o, weight: 1.2, seed: seed + 2 })
  hdStroke(R, { ...o, weight: 1.2, seed: seed + 3 })
  // shading on the stick: horizontal hatches on the shadow side, ellipses at the turned rings
  for (let i = 1; i < 40; i++) {
    const u = i / 40
    const y = base + (foot - base) * u
    const r = etchR(u) * w
    hdStroke([[x + dir * r * 0.95, y], [x + dir * r * 0.3, y]], { ...o, weight: 0.6, halo: null, seed: seed + 10 + i })
  }
  for (const u of [0.3, 0.7, 0.95]) hdStroke(hdArc(x, base + (foot - base) * u, etchR(u) * w, w * 0.12, 0, p5.PI, 16), { ...o, halo: null, seed: seed + u * 50 })
  // wax: contour hatching that follows the cylinder, closer together on the shadow side
  hdWash(hdRect(x - w / 2, top, w, h), [246, 240, 226], 235, seed + 4, 0)
  for (let i = 0; i < 9; i++) {
    const a = (i + 0.5) / 9 * p5.PI
    const xx = x + Math.cos(a) * w / 2 * dir
    if (Math.cos(a) < -0.2) continue // the lit side stays bare
    hdStroke(hdSeg(xx, top + w * 0.12, xx, base, 0), { ...o, weight: 0.5 + 0.5 * Math.cos(a), seed: seed + 20 + i, halo: null })
  }
  for (let y = top + w * 0.3; y < base; y += w * 0.12) hdStroke(hdArc(x, y, w / 2, w * 0.1, dir > 0 ? -0.3 : p5.PI * 0.55, dir > 0 ? p5.PI * 0.45 : p5.PI + 0.3, 8), { ...o, weight: 0.5, halo: null, seed: seed + y })
  hdStroke(hdSeg(x - w / 2, top, x - w / 2, base, 0), { ...o, weight: 1.2, seed: seed + 5 })
  hdStroke(hdSeg(x + w / 2, top, x + w / 2, base, 0), { ...o, weight: 1.2, seed: seed + 6 })
  hdStroke(hdArc(x, top, w / 2, w * 0.12, 0, p5.TWO_PI), { ...o, weight: 1.1, seed: seed + 7 })
  hdStroke(hdArc(x, base, w, w * 0.18, 0, p5.TWO_PI), { ...o, weight: 1.1, seed: seed + 8 })
  hdStroke([[x, top], [x + w * 0.02, fy]], { ...o, weight: 1.8, seed: seed + 9 })
  if (c.lit) {
    // the flame stays paper; the light is engraved as many fine rays
    const cy = fy - fh * 0.45
    for (let i = 0; i < 40; i++) {
      const ang = i / 40 * p5.TWO_PI
      const r1 = fh * (0.75 + 0.05 * Math.abs(Math.sin(ang)))
      const r2 = fh * (1.1 + 0.6 * hdHash(seed + i + hdSeed * 0.01))
      hdStroke([[x + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 1.2], [x + Math.cos(ang) * r2, cy + Math.sin(ang) * r2 * 1.2]], { ...o, weight: 0.5, alpha: 200, seed: seed + 60 + i })
    }
    hdWash(hdTear(x, fy, w * 0.42, fh, lean), [252, 244, 222], 245, seed + 11, 0)
    hdStroke(hdTear(x, fy, w * 0.42, fh, lean, 0.15), { ...o, weight: 1, seed: seed + 12 })
    hdStroke(hdTear(x, fy, w * 0.2, fh * 0.5, lean * 0.5, 0.4), { ...o, weight: 0.6, halo: null, seed: seed + 13 })
  }
  hdSmoke(x, fy, w, c, ink, 0.8, seed + 30)
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  if (candleBackground) p5.background(238, 230, 212)
  else p5.clear()
  const base = p5.height * 0.66
  etchCandle(p5.width * 0.09, base, 0, c)
  etchCandle(p5.width * 0.91, base, 1, c)
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
