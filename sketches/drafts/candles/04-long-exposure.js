// Candle draft 4/10: long exposure. Moths circle the flames like insects round a
// lamp in a long-exposure photograph: each moth leaves a fading trail of light
// that loops around the candle and drifts off when the flame goes out.
//
// How it plugs into hydra: p5 draws the moths twice: as ink on the candles (s0) and as light
// (s1). hydra runs s1 through a feedback loop in o2 that fades slowly, which
// turns the moths into light trails, and adds those to the picture.
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
// a moth seen from above at (mx, my), heading `ang`, wings opened by `flap` (0..1)
mothDraw = (mx, my, ang, size, flap, alpha, o, seed) => {
  const open = 0.3 + 0.7 * flap
  for (const sg of [-1, 1]) {
    // forewing: a long blade swept back to a rounded tip; hindwing: a smaller lobe
    const fore = [[0, -0.15], [0.35, -0.3], [0.8, -0.2], [1.0, 0.05], [0.85, 0.2], [0.45, 0.22], [0.08, 0.1]]
    const hind = [[0.05, 0.1], [0.45, 0.25], [0.6, 0.45], [0.45, 0.62], [0.2, 0.55], [0.03, 0.35]]
    const place = (pts) => hdRot(pts.map(([u, v]) => [mx + sg * u * size * open, my + v * size]), mx, my, ang)
    hdWash(place(hind), [200, 180, 150], 200 * alpha, seed + sg, 0)
    hdWash(place(fore), [214, 196, 168], 220 * alpha, seed + sg + 2, 0)
    hdStroke(place(fore), { ...o, weight: 0.9, alpha: 230 * alpha, seed: seed + sg * 3 })
    hdStroke(place(hind), { ...o, weight: 0.8, alpha: 200 * alpha, halo: null, seed: seed + sg * 4 })
    // a vein and the eye spot
    hdStroke(place([[0.08, -0.05], [0.5, -0.08], [0.85, 0.02]]), { ...o, weight: 0.5, alpha: 160 * alpha, halo: null, seed: seed + sg * 5 })
    const [ex, ey] = place([[0.55, 0.05]])[0]
    hdStroke(hdArc(ex, ey, size * 0.07, size * 0.07, 0, p5.TWO_PI, 8), { ...o, weight: 0.7, alpha: 200 * alpha, halo: null, seed: seed + sg * 6 })
  }
  hdStroke(hdRot([[mx, my - size * 0.2], [mx, my + size * 0.5]], mx, my, ang), { ...o, weight: 2.4, alpha: 240 * alpha, halo: null, seed: seed + 5 })
  hdStroke(hdRot([[mx - size * 0.3, my - size * 0.55], [mx, my - size * 0.2], [mx + size * 0.3, my - size * 0.55]], mx, my, ang), { ...o, weight: 0.6, alpha: 200 * alpha, halo: null, seed: seed + 6 })
}

mothLight = hdMap(2)
mothLast = [] // where each moth was last frame
s1.init({ src: mothLight.elt })

// where the moths are now: loops round the flame, scattering when it dies
mothSwarm = (c, x, cy, fh, w, side, seed) => {
  const out = []
  const scatter = c.lit ? 0 : c.outFor
  for (let i = 0; i < 6; i++) {
    const speed = (1.1 + 0.9 * hdHash(seed + i)) * (i % 2 ? 1 : -1)
    const a1 = c.t * speed + hdHash(seed + i * 3) * p5.TWO_PI
    const rx = fh * (1.2 + 1.4 * hdHash(seed + i * 5)) * (1 + scatter * 1.2)
    const ry = rx * (0.45 + 0.3 * hdHash(seed + i * 9))
    out.push({
      mx: x + Math.cos(a1) * rx + Math.sin(c.t * 1.7 + i) * w * 0.3,
      my: cy + Math.sin(a1) * ry + Math.sin(c.t * 2.3 + i * 2) * w * 0.3 - scatter * w,
      heading: a1 + (speed > 0 ? p5.PI : 0),
      size: w * (0.55 + 0.25 * hdHash(i + side)),
      flap: Math.abs(Math.sin(c.t * 15 + i * 2)),
      alpha: c.lit ? 1 : Math.max(0, 1 - c.outFor / candleOut),
      seed: seed + 40 + i * 10
    })
  }
  return out
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  p5.clear()
  const base = p5.height * 0.88
  const swarms = []
  for (const side of [0, 1]) {
    const x = p5.width * (side ? 0.91 : 0.09)
    const { w, fy, fh } = hdCandle(x, base, side, c, { ink: [70, 50, 38], paper: [242, 234, 218], flameWash: [252, 196, 100] })
    swarms.push(mothSwarm(c, x, fy - fh * 0.5, fh, w, side, side * 100))
  }
  const ink = { col: [70, 50, 38], weight: 1.1, jitter: 1, grain: 0.4, gaps: 0.05, halo: [242, 234, 218], haloAlpha: 90 }
  swarms.flat().forEach((m) => m.alpha > 0 && mothDraw(m.mx, m.my, m.heading, m.size, m.flap, m.alpha, ink, m.seed))
  // the same moths as points of light: a line from where each one was last frame
  const now = swarms.flat()
  hdInto(mothLight, (g) => {
    g.background(0)
    g.strokeCap(p5.ROUND)
    g.strokeWeight(2.6 * Math.min(p5.width, p5.height) / 540)
    now.forEach((m, i) => {
      const was = mothLast[i] || m
      if (m.alpha <= 0 || Math.hypot(m.mx - was.mx, m.my - was.my) > p5.width * 0.1) return
      g.stroke(255, 240, 215, 255 * m.alpha)
      g.line(was.mx, was.my, m.mx, m.my)
    })
  })
  mothLast = now

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

// feedback in o2: last frame, faded a little, plus the moths now. Raise the 0.97s for longer exposures.
src(o2)
  .mult(solid(0.975, 0.965, 0.95))
  .add(src(s1), 1)
  .out(o2)

src(o1)
  .add(src(o2).color(1, 0.85, 0.6), 1.1)
  .layerP5(src(s0))
  .out(o0)
// try: .add(src(o2).kaleid(2).color(1, 0.8, 0.5), 0.8) for mirrored trails
render(o0)
