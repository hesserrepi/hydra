// Candle draft 6/10: the picture melts. Candles on a shelf whose wax runs down the
// screen, and the wax is the picture itself: every drip drags the colours from
// the shelf line down with it, so the hydra picture looks like it is melting off
// the candles and pooling at the bottom.
//
// How it plugs into hydra: p5 paints the drips (s1: red = wax, green = how far each drop has
// fallen). hydra fills them with o1 pulled down by modulateScrollY on that green,
// so the streaks carry whatever the background is doing at the shelf.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out before it relights
candleHalo = true // thin contrasting edge under pencil lines so they read over hydra
candleT0 = p5.millis()
candleClock = () => {
  const t = (p5.millis() - candleT0) / 1000
  const cycle = t % (candleBurn + candleOut)
  return { t, cycle, left: Math.max(0, 1 - cycle / candleBurn), lit: cycle < candleBurn, outFor: cycle - candleBurn }
}

// --- hand-drawn line kit (the same in every draft) ---
// Lines are drawn as many short segments that wander off the ideal path,
// change pressure, skip where the pencil lifts and pick up paper tooth.
hdSeed = 0 // set a few times a second in p5.draw so the lines "boil" gently
hdG = p5 // what the kit draws into: p5 itself or one of the p5.Graphics maps
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
  hdG.strokeCap(p5.ROUND)
  // a thin contrasting edge under the line (not a glow), so it reads over a busy hydra picture
  if (halo && candleHalo) {
    hdG.stroke(halo[0], halo[1], halo[2], haloAlpha)
    segs.forEach((g) => { hdG.strokeWeight(g[4] + 2.4 * k); hdG.line(g[0], g[1], g[2], g[3]) })
  }
  segs.forEach((g) => {
    hdG.stroke(col[0], col[1], col[2], g[5])
    hdG.strokeWeight(g[4])
    hdG.line(g[0], g[1], g[2], g[3])
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
  hdG.noStroke()
  for (let l = 0; l < layers; l++) {
    hdG.fill(col[0], col[1], col[2], alpha)
    hdG.beginShape()
    pts.forEach(([x, y], i) => {
      const n1 = p5.noise(seed + l * 3.1 + i * 0.31, hdSeed * 0.2) - 0.5
      const n2 = p5.noise(seed + 40 + l * 3.1 + i * 0.31, hdSeed * 0.2) - 0.5
      hdG.vertex(x + n1 * wob * 2, y + n2 * wob * 2)
    })
    hdG.endShape(p5.CLOSE)
  }
}
hdGlow = (x, y, r, rgb, a) => {
  const ctx = hdG.drawingContext
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
// a candle in fine pencil: solid wax, outlines drawn twice, drips, saucer, wick,
// an open flame with a warm wash and smoke when it goes out. Returns its geometry.
hdCandle = (x, base, side, c, { ink = [58, 56, 54], paper = [246, 241, 230], fill = 248, flame = true, flameWash = [255, 190, 90], saucer = true, width = 0.075, height = 0.55, smoke = true } = {}) => {
  const geo = hdGeo(x, base, side, c, width, height)
  const { w, h, top, fy, fh, lean, seed } = geo
  const o = { col: ink, weight: 1.3, jitter: 1.4, grain: 0.55, gaps: 0.1, halo: paper }
  if (saucer) hdWash(hdArc(x, base, w * 1.2, w * 0.22, 0, p5.TWO_PI, 20), paper.map((v) => v - 12), fill, seed + 40, w * 0.03)
  if (fill > 0) hdWash(hdRect(x - w / 2, top, w, h), paper, fill, seed + 41, w * 0.03)
  for (const pass of [0, 1]) {
    hdStroke(hdSeg(x - w / 2, top, x - w / 2, base), { ...o, seed: seed + 1 + pass * 7, jitter: 1.4 + pass, halo: pass ? null : paper })
    hdStroke(hdSeg(x + w / 2, top, x + w / 2, base), { ...o, seed: seed + 2 + pass * 7, jitter: 1.4 + pass, alpha: pass ? 140 : 230, halo: pass ? null : paper })
  }
  const dir = side ? -1 : 1
  for (let y = top + w * 0.4; y < base - w * 0.2; y += w * 0.16) hdStroke([[x + dir * w * 0.46, y], [x + dir * w * 0.3, y + w * 0.12]], { ...o, weight: 0.7, alpha: 150, halo: null, seed: seed + y })
  hdStroke(hdArc(x, top, w / 2, w * 0.13, 0.3, p5.TWO_PI + 0.1), { ...o, seed: seed + 3 })
  for (let i = 0; i < 2; i++) {
    const dx = x + (i ? 0.22 : -0.3) * w
    const dl = Math.min(h * 0.6, w * (0.4 + 0.8 * p5.noise(seed + i)))
    hdStroke([[dx - w * 0.05, top + w * 0.1], [dx - w * 0.05, top + dl], [dx, top + dl + w * 0.06], [dx + w * 0.05, top + dl], [dx + w * 0.05, top + w * 0.14]], { ...o, weight: 0.9, halo: null, seed: seed + 10 + i })
  }
  if (saucer) {
    hdStroke(hdArc(x, base, w * 1.2, w * 0.22, -0.2, p5.PI + 0.3), { ...o, seed: seed + 4 })
    hdStroke(hdArc(x, base, w * 1.2, w * 0.22, p5.PI + 0.6, p5.TWO_PI - 0.4), { ...o, seed: seed + 5, alpha: 130, halo: null })
  }
  hdStroke([[x, top], [x + w * 0.03, fy + w * 0.1], [x + lean * 0.1, fy]], { ...o, weight: 1.8, seed: seed + 6 })
  if (flame && c.lit) {
    hdWash(hdTear(x, fy, w * 0.42, fh, lean), flameWash, 150, seed + 7, w * 0.08)
    hdStroke(hdTear(x, fy, w * 0.42, fh, lean, 0.3), { ...o, seed: seed + 8 })
    hdStroke(hdTear(x, fy - w * 0.05, w * 0.2, fh * 0.55, lean * 0.5, 0.6), { ...o, weight: 0.9, halo: null, seed: seed + 9 })
  }
  if (smoke) hdSmoke(x, fy, w, c, ink, 1, seed + 30)
  return geo
}
// a low-resolution p5.Graphics used as an extra hydra source (maps don't need detail)
hdMap = (div) => {
  const g = p5.createGraphics(Math.ceil(p5.width / div), Math.ceil(p5.height / div))
  g.pixelDensity(1)
  return g
}
// draw into a map using full-screen coordinates
hdInto = (g, fn) => {
  hdG = g
  g.push()
  g.scale(g.width / p5.width)
  fn(g)
  g.pop()
  hdG = p5
}
// --- end of kit ---
meltMap = hdMap(2)
s1.init({ src: meltMap.elt })
meltDrips = 8 // drips per candle over one burn

// the lower edge of the wax hanging over the shelf: a band that thickens as the
// candle melts, with drips that slide down to the floor and spread into a pool
meltEdge = (c, x, w, base, seed) => {
  const melted = 1 - c.left
  const half = w * (1.4 + 2.6 * melted)
  const band = w * (0.15 + 0.5 * melted)
  const floor = p5.height + 2
  const drips = []
  for (let i = 0; i < meltDrips; i++) {
    const start = candleBurn * 0.85 * (i + 0.8 * hdHash(seed + i)) / meltDrips
    const fall = 8 + 14 * hdHash(seed + i * 3)
    const u = Math.min(1, Math.max(0, (c.cycle - start) / fall))
    if (u <= 0) continue
    drips.push({
      dx: x + (hdHash(seed + i * 5) - 0.5) * half * 1.6,
      dw: w * (0.2 + 0.25 * hdHash(seed + i * 7)),
      len: (floor - base - band) * u * u * (3 - 2 * u)
    })
  }
  const curtain = []
  for (let i = 0; i <= 80; i++) {
    const xx = x - half + half * 2 * i / 80
    let y = base + band * (0.75 + 0.5 * p5.noise(xx * 0.03, seed))
    for (const { dx, dw } of drips) {
      const d = (xx - dx) / (dw * 1.8) // each drip leaves the edge through a little bulge
      if (Math.abs(d) < 1) y = Math.max(y, base + band + dw * 1.2 * Math.sqrt(1 - d * d))
    }
    curtain.push([xx, y])
  }
  // the drips themselves: wavy, thicker towards the bead at the end
  const runs = drips.map(({ dx, dw, len }, i) => {
    const y0 = base + band
    const y1 = y0 + len
    const at = (y) => dx + Math.sin(y * 0.02 + i * 1.7) * dw * 0.6 + Math.sin(y * 0.07 + i) * dw * 0.15
    const left = []
    const right = []
    const n = Math.max(2, Math.ceil(len / 8))
    for (let j = 0; j <= n; j++) {
      const y = y0 + len * j / n
      const th = dw * (0.45 + 0.35 * j / n) * (0.85 + 0.15 * Math.sin(y * 0.09 + i))
      left.push([at(y) - th, y])
      right.push([at(y) + th, y])
    }
    return { left, right, hx: at(y1), hy: y1, r: dw * 0.9 }
  })
  // the pool on the floor, wider and deeper as the candle melts
  const depth = p5.height * 0.07 * melted
  const reach = half + w * 3 * melted
  const pool = []
  for (let i = 0; i <= 40; i++) {
    const pd = i / 20 - 1
    pool.push([x + pd * reach, floor - depth * Math.sqrt(1 - pd * pd)])
  }
  return { curtain, pool, runs }
}

meltPaint = (edges, base) => hdInto(meltMap, (g) => {
  const ctx = g.drawingContext
  g.background(0)
  // red = wax; green = how far below the shelf, so hydra knows how far to pull the picture
  const grad = ctx.createLinearGradient(0, base, 0, base + p5.height)
  grad.addColorStop(0, 'rgb(255,0,0)')
  grad.addColorStop(1, 'rgb(255,255,0)')
  ctx.fillStyle = grad
  for (const { curtain, pool, runs } of edges) {
    for (const { left, right, hx, hy, r } of runs) {
      ctx.beginPath()
      left.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
      right.slice().reverse().forEach(([px, py]) => ctx.lineTo(px, py))
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(hx, hy - r * 0.3, r, r * 1.25, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath() // hanging from the shelf down to its edge
    ctx.moveTo(curtain[0][0], base)
    curtain.forEach(([px, py]) => ctx.lineTo(px, py))
    ctx.lineTo(curtain[curtain.length - 1][0], base)
    ctx.fill()
    ctx.beginPath() // lying on the floor
    pool.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.fill()
  }
})

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  p5.clear()
  const base = p5.height * 0.6 // on a shelf, so the wax has somewhere to run
  const edges = []
  for (const side of [0, 1]) {
    const x = p5.width * (side ? 0.91 : 0.09)
    const seed = side * 100
    const { w } = hdGeo(x, base, side, c, 0.075, 0.42)
    const edge = meltEdge(c, x, w, base, seed)
    edges.push(edge)
    // a pencil line along the hanging edge of the wax and round the pool
    const ink = { col: [58, 56, 54], weight: 1, jitter: 0.8, grain: 0.4, gaps: 0.08, halo: [246, 241, 230], haloAlpha: 80 }
    hdStroke(edge.curtain, { ...ink, seed: seed + 200 })
    edge.runs.forEach((r, j) => {
      hdStroke(r.left, { ...ink, halo: null, alpha: 170, seed: seed + 210 + j })
      hdStroke(r.right, { ...ink, halo: null, alpha: 170, seed: seed + 230 + j })
      hdStroke(hdArc(r.hx, r.hy - r.r * 0.3, r.r, r.r * 1.25, -0.2, Math.PI + 0.2, 10), { ...ink, halo: null, alpha: 170, seed: seed + 250 + j })
    })
    if (c.left < 0.99) hdStroke(edge.pool, { ...ink, seed: seed + 201 })
    hdCandle(x, base, side, c, { height: 0.42, saucer: false })
    hdStroke(hdSeg(x - w * 4.2, base + 1, x + w * 4.2, base + 1), { col: [58, 56, 54], weight: 1.3, jitter: 1.2, grain: 0.5, gaps: 0.1, halo: [246, 241, 230], seed: seed + 70 })
  }
  meltPaint(edges, base)
}

// --- hydra ---
// Hesse's background, drawn into o1; the candles work on top of it
o1.setLinear()
a.show()

_factor = 1
a_factor = [0.5, 0.87, 0.2, 0.75, 0.55, 0.92, -0.3, 0.5].smooth().fast(0.1)
osc(16, -0.1, 1)
  .glow(src(o1).invert().modulateRotate(o1), a_factor)
  .modulate(voronoi(64, 1, 2))
  .blend(o1)
  .out(o1)

// layerP5: lay a texture with straight (not premultiplied) alpha over the picture, like p5's canvas.
// keyBy: give a texture the alpha of a channel mix of a map, e.g. keyBy(src(s1), 1, 0, 0) uses its red.
setFunction({ name: 'layerP5', type: 'combine', inputs: [], glsl: 'return vec4(mix(_c0.rgb, _c1.rgb, _c1.a), max(_c0.a, _c1.a));' })
setFunction({
  name: 'keyBy',
  type: 'combine',
  inputs: [{ name: 'r', type: 'float', default: 1 }, { name: 'g', type: 'float', default: 0 }, { name: 'b', type: 'float', default: 0 }],
  glsl: 'return vec4(_c0.rgb, clamp(_c1.r * r + _c1.g * g + _c1.b * b, 0.0, 1.0));'
})

// the wax: the picture pulled down from the shelf line (green in s1 says how far)
candleMelt = () => src(o1).modulateScrollY(src(s1).g(), -0.95).saturate(1.3).contrast(1.1)

src(o1)
  .layerP5(candleMelt().modulate(noise(3, 0.2), 0.004).keyBy(src(s1), 1, 0, 0))
  .layerP5(src(s0))
  .out(o0)
// try: candleMelt = () => src(o1).modulateScrollY(src(s1).g(), -0.95).invert()
render(o0)
