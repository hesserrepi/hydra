// Candle draft 8/10: sound flame. The flames are drawn by sound: three
// outlines pushed out by hydra's audio spectrum (bass at the base, treble at the
// tip), and the wax is a stack of seismograph lines recording what it heard.
//
// How it plugs into hydra: reads a.fft (hydra's audio; turn the mic on in the editor), with a
// breathing stand-in when there is no sound. A heat map in s1 lets loud moments
// push and warm the picture through modulate and add.
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
soundHist = [] // recent loudness, newest first; the wax lines show it
soundNow = 0
soundTick = 0
soundMap = hdMap(4)
s1.init({ src: soundMap.elt })

// the spectrum from hydra's audio, or a stand-in when it's silent
soundBins = () => {
  const bins = (typeof a !== 'undefined' && a && a.fft) ? Array.from(a.fft) : []
  if (bins.length > 1 && bins.some((v) => v > 0.02)) return bins.map((v) => Math.min(1, Math.max(0, v)))
  const tt = p5.millis() / 1000
  return [0, 1, 2, 3, 4, 5].map((i) => 0.15 + 0.7 * p5.noise(tt * (0.8 + i * 0.6), i * 10) ** 2)
}
soundAt = (bins, u) => {
  const f = u * (bins.length - 1)
  const i = Math.floor(f)
  return bins[i] + ((bins[Math.min(i + 1, bins.length - 1)] - bins[i]) * (f - i))
}

soundCandle = (x, base, side, c, bins) => {
  const { w, h, top, fy, fh, lean, seed } = hdGeo(x, base, side, c, 0.085, 0.55)
  const ink = { col: [48, 44, 42], weight: 1.2, jitter: 1, grain: 0.4, gaps: 0.06, halo: [244, 240, 230] }
  hdWash(hdRect(x - w / 2, top, w, h), [244, 240, 230], 245, seed + 1, w * 0.02)
  hdStroke(hdSeg(x - w / 2, top, x - w / 2, base), { ...ink, seed: seed + 2 })
  hdStroke(hdSeg(x + w / 2, top, x + w / 2, base), { ...ink, seed: seed + 3 })
  hdStroke(hdSeg(x - w * 1.3, base, x + w * 1.3, base), { ...ink, seed: seed + 4 })
  // seismograph wax: one trace per remembered moment, newest at the top
  const gap = w * 0.16
  for (let j = 0, y = top + gap; y < base - gap * 0.5; j++, y += gap) {
    const amp = (soundHist[j] || 0) * gap * 1.4
    const pts = []
    for (let i = 0; i <= 16; i++) {
      const u = i / 16
      pts.push([x - w * 0.42 + u * w * 0.84, y + Math.sin(u * 20 + j * 1.7) * amp * Math.sin(u * Math.PI)])
    }
    hdStroke(pts, { ...ink, weight: 0.7, halo: null, alpha: 190, seed: seed + 10 + j })
  }
  hdStroke([[x, top], [x, fy]], { ...ink, weight: 1.6, seed: seed + 5 })
  if (c.lit) {
    const cx = x + lean * 0.3
    const cy = fy - fh * 0.4
    for (let ring = 0; ring < 3; ring++) {
      const sc = 1 - ring * 0.28
      const pts = hdTear(x, fy, w * 0.45 * sc, fh * sc, lean * sc, 0, 60).map(([px, py], i, arr) => {
        const u = i / (arr.length - 1)
        const v = soundAt(bins, 1 - Math.abs(u - 0.5) * 2) // bass at the base, treble at the tip
        const push = 1 + 0.6 * v * (0.6 + 0.4 * Math.sin(u * Math.PI * 14 + c.t * 9 * (ring + 1)))
        return [cx + (px - cx) * push, cy + (py - cy) * push]
      })
      hdStroke(pts, { col: ring === 1 ? [255, 214, 110] : [240, 100, 40], weight: 1.6 - ring * 0.3, jitter: 0.3, grain: 0.2, gaps: 0.02, halo: [40, 20, 10], haloAlpha: 120, seed: seed + 20 + ring })
    }
  }
  hdSmoke(x, fy, w, c, [70, 66, 64], 1, seed + 30)
  return { x: x + lean * 0.3, y: fy - fh * 0.5, fh }
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  const bins = soundBins()
  soundNow = c.lit ? bins.reduce((s, v) => s + v, 0) / bins.length : soundNow * 0.95
  if (c.t - soundTick > 0.12) {
    soundTick = c.t
    soundHist.unshift(soundNow)
    soundHist.length = Math.min(soundHist.length, 160)
  }
  p5.clear()
  const base = p5.height * 0.9
  const spots = [0, 1].map((side) => soundCandle(p5.width * (side ? 0.91 : 0.09), base, side, c, bins))
  hdInto(soundMap, (g) => {
    const ctx = g.drawingContext
    g.background(0)
    if (!c.lit) return
    ctx.globalCompositeOperation = 'lighter'
    for (const { x, y, fh } of spots) {
      const r = fh * (2 + 5 * soundNow)
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, `rgba(255,${Math.round(160 + 90 * soundNow)},0,0.9)`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    ctx.globalCompositeOperation = 'source-over'
  })
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

src(o1)
  .modulate(src(s1), () => 0.01 + 0.08 * soundNow) // loud moments push the picture away from the flames
  .add(src(s1).r().color(1, 0.55, 0.2), () => 0.1 + 0.6 * soundNow)
  .layerP5(src(s0))
  .out(o0)
// try: a.setBins(8) for a more detailed flame
render(o0)
