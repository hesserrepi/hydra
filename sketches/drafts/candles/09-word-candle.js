// Candle draft 9/10: word candle. Each candle is a phrase set up its side like
// the title on a book spine, in letters cut out of your hydra picture turned
// inside out. The flame eats the phrase from the top, one letter at a time, and
// burnt letters lift off as grey ash: what is left, what is, what.
//
// How it plugs into hydra: p5 sets the letters in a mask (s1: red = letters still standing,
// green = ash). hydra fills them with transformed copies of o1 and lets the
// mask waver with noise. Change candleWords to your own words.
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
candleWords = ['what is left', 'of the light'] // one phrase per candle, read from the bottom up
wordMap = hdMap(1) // full size so the letters stay sharp
s1.init({ src: wordMap.elt })

// the letters of one phrase, set up the candle like the title on a book spine
wordLayout = (g, side, base) => {
  const letters = candleWords[side].split('')
  g.textFont('Georgia')
  g.textStyle(p5.BOLDITALIC)
  g.textSize(100)
  const total = letters.reduce((sum, ch) => sum + g.textWidth(ch), 0)
  const size = Math.min(Math.min(p5.width, p5.height) * 0.13, p5.height * 0.78 / total * 100)
  let y = base
  const out = letters.map((ch) => {
    const adv = g.textWidth(ch) * size / 100
    const l = { ch, y0: y, y1: y - adv }
    y -= adv
    return l
  })
  return { out, size }
}

wordPaint = (c, g, asMask) => {
  const base = p5.height * 0.94
  g.textAlign(p5.LEFT, p5.CENTER)
  for (const side of [0, 1]) {
    const x = p5.width * (side ? 0.91 : 0.09)
    const { out, size } = wordLayout(g, side, base)
    const n = out.length
    const gone = Math.min(n, Math.floor((1 - c.left) * n)) // letters burnt so far, from the top
    g.textSize(size)
    out.forEach(({ ch, y0, y1 }, i) => {
      const fromTop = n - 1 - i
      g.push()
      if (fromTop >= gone) {
        const burning = fromTop === gone && c.lit
        const fl = burning ? 0.55 + 0.45 * p5.noise(c.t * 8 + side * 5) : 1
        g.translate(x, y0)
        g.rotate(-p5.HALF_PI)
        if (asMask) {
          g.noStroke()
          g.fill(Math.round(255 * fl), 0, 0)
        } else {
          g.noFill()
          g.stroke(40, 32, 28, 200)
          g.strokeWeight(Math.max(0.8, size * 0.012))
        }
        g.text(ch, 0, 0)
        g.pop()
        return
      }
      // burnt: lifts off, turns and drifts up as ash for a few seconds
      const age = c.cycle - (fromTop + 1) / n * candleBurn
      if (age < 0 || age > 8) { g.pop(); return }
      const f = age / 8
      g.translate(x + (p5.noise(i * 3 + side * 50, age * 0.25) - 0.5) * size * 4 * f, y0 - age * size * 0.7)
      g.rotate(-p5.HALF_PI + (hdHash(i + side * 30) - 0.5) * 4 * f)
      g.textSize(size * (1 - 0.5 * f))
      if (asMask) {
        g.noStroke()
        g.fill(0, Math.round(255 * (1 - f)), 0)
      } else {
        g.noFill()
        g.stroke(90, 90, 90, 140 * (1 - f))
        g.strokeWeight(Math.max(0.6, size * 0.01))
      }
      g.text(ch, 0, 0)
      g.pop()
    })
    if (!asMask && c.lit && gone < n) {
      // the flame sits on the burning letter
      const fy = out[n - 1 - gone].y1 - size * 0.05
      const w = size * 0.6
      const fh = w * (1.6 + 0.4 * p5.noise(c.t * 4 + side * 9))
      const lean = (p5.noise(c.t * 1.6 + side * 3) - 0.5) * w * 0.6
      const fx = x
      hdGlow(fx, fy - fh * 0.4, fh * 1.3, '255,200,120', 0.35)
      hdWash(hdTear(fx, fy, w * 0.42, fh, lean), [255, 190, 90], 200, side * 100 + 7, w * 0.06)
      hdStroke(hdTear(fx, fy, w * 0.42, fh, lean, 0.3), { col: [50, 40, 34], weight: 1.3, jitter: 1, grain: 0.4, gaps: 0.08, halo: [246, 240, 228], seed: side * 100 + 8 })
    }
  }
}

p5.draw = () => {
  const c = candleClock()
  hdSeed = Math.floor(c.t * 3)
  p5.clear()
  wordPaint(c, p5, false)
  hdInto(wordMap, (g) => {
    g.background(0)
    wordPaint(c, g, true)
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

// letters made of the picture inside out; ash made of it in grey
candleLetters = () => src(o1).invert().contrast(1.5).saturate(1.3)
candleAsh = () => src(o1).saturate(0).brightness(-0.15)

src(o1)
  .layerP5(candleLetters().keyBy(src(s1).modulate(noise(3, 0.3), 0.003), 1, 0, 0))
  .layerP5(candleAsh().keyBy(src(s1), 0, 1, 0))
  .layerP5(src(s0))
  .out(o0)
// try: candleWords = ['soft and', 'gatherable']
render(o0)
