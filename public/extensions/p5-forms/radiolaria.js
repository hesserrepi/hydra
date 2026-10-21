// radiolaria: p5.js generators of growing radiolarian skeletons, after the
// Stephoidea plate of Ernst Haeckel's Kunstformen der Natur (1904): spiny ring
// skeletons, lattice spheres and cages, thorny branching arms, and yellow
// symbiont cells around a red central capsule.
//
//   p5 = new P5()
//   p5.hide()
//   s0.init({ src: p5.canvas })
//   radiolaria.plate(p5)                    // a whole plate, sets p5.draw
//   src(s0).out()
//
//   const r = radiolaria(p5, { form: 'bush', arms: 12, life: 'cycle' })
//   p5.draw = () => { radiolaria.backdrop(p5); r.draw() }
//
// Every specimen grows from nothing (life: 'grow'), keeps growing, dying and
// regrowing as a new variation (life: 'cycle'), or is shown fully grown
// ('still'). While it lives its spines sway and its symbionts drift; the 3D
// forms turn slowly. Every option may be a function of time in seconds,
// e.g. { arms: (t) => 6 + 4 * Math.sin(t / 5) } or { spineLength: () => 0.5 + a.fft[0] },
// and is read again each frame, so the skeleton follows it as it changes.
//
// forms
//   'ring'     front view of rings side by side with bars and branching spines
//              rings 2, spines 14, spineLength 1, branching 2, thorns 3
//   'cage'     crossed rings in 3D with radial thorny spines and apical horns
//              rings 3, girdle 1, spines 6, spineLength 1, branching 1, thorns 3, horn 1
//   'lattice'  porous lattice sphere girdled by bands, red capsule inside
//              pores 120, bands 2, spines 0, spineLength 1
//   'bush'     ring around the capsule, symbionts, thorny dendritic arms
//              arms 9, armLength 1, branching 3, thorns 4, droop 0.5, symbionts 40
//   'star'     double ring with two capsules and serrated radial blades
//              blades 18, bladeLength 1, bladeWidth 1, teeth 5, branching 1, symbionts 36
//   'basket'   barrel of columns between a porous dome and a porous ring
//              columns 10, pores 60
//
// options for every form (defaults)
//   x, y        centre, as a fraction of the canvas              0.5, 0.5
//   size        radius, as a fraction of the shorter side        0.42
//   rotation    in radians                                       0
//   seed        which variation                                  1
//   life        'grow', 'cycle' or 'still'                       'grow'
//   grow        seconds to grow up                               12
//   cycle       seconds of one life in 'cycle'                   40
//   delay       seconds before growing starts                    0
//   growth      0-1, overrides life (e.g. a slider or the audio)
//   speed       how fast time runs for this specimen             1
//   sway        how much spines and arms move                    1
//   spin        3D forms: turning speed, radians per second      0.15
//   tilt        3D forms: tilt towards the viewer, radians       0.35
//   thorns      thorns per spine                                 per form
//   thornLength thorn length, in spine widths                    2.2
//   branching   levels of side branches                          per form
//   spread      angle of side branches                           0.75
//   ratio       length of side branches                          0.55
//   curl        how much spines curve                            0.5
//   core        size of the red capsule (0 = none)               per form
//   symbionts   number of yellow cells                           per form
//   palette     'haeckel', 'cyanotype', 'gilded', 'ink', 'neon', or an
//               object with any of the keys of radiolaria.palettes.haeckel
//   glow        halo around the skeleton (0 = off, faster)       1
//   shading     side shadow that makes the bars look round       1
//   hatch       engraved hatching in the shadow                  0.5
//   outline     dark outline of every bar                        0.25
//   depth       opacity of the far side of 3D forms              0.4
//
// specimen methods
//   draw()           draw it on the p5 canvas (call from p5.draw)
//   set(options)     change options
//   grow()           start growing again from nothing
//   reseed(seed)     a new variation (random when seed is left out), regrown
//
// radiolaria.plate(p5, options) lays out several specimens like a plate and,
// unless draw: false, sets p5.draw. Options: forms (names or option objects,
// default all six), cols, rows, seed, background (false = transparent, for
// layering in hydra), stagger (seconds between specimens starting to grow),
// plus any specimen option for all of them. It returns { specimens, draw, set, grow, reseed }.
//
// radiolaria.backdrop(p5, { palette, grain, vignette }) paints the dark plate
// background. radiolaria.forms lists the form names.

{
  const TAU = Math.PI * 2
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
  const ease = (v) => { v = clamp01(v); return v * v * (3 - 2 * v) }

  // seeded randomness: every element gets its own stream, so changing a count
  // adds or removes elements without reshuffling the others
  const mulberry = (a) => () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const hash = (...n) => {
    let h = 0x811c9dc5
    for (const v of n) { h = Math.imul(h ^ (Math.floor(v * 7919) | 0), 0x01000193); h ^= h >>> 13 }
    return h >>> 0
  }
  const rng = (...n) => mulberry(hash(...n))
  // smooth wobble in -1..1
  const wob = (s, t) => Math.sin(t * 1.13 + s * 12.9898) * 0.6 + Math.sin(t * 0.67 + s * 4.1414) * 0.4

  const palettes = {
    haeckel: {
      bg: '#1e2123',
      bone: '#eef0e8',
      shade: 'rgba(70, 84, 92, 0.85)',
      hatch: 'rgba(24, 32, 38, 0.7)',
      outline: 'rgba(12, 16, 18, 0.9)',
      glow: 'rgba(205, 220, 226, 0.45)',
      core: ['#f8c09a', '#d6452e', '#6a1510'],
      nucleus: '#f4a07e',
      cone: '#f2832e',
      symbiont: '#d8d65a',
      symbiontDark: '#6f6d14'
    },
    cyanotype: {
      bg: '#0c2742',
      bone: '#e9f2f8',
      shade: 'rgba(28, 72, 118, 0.8)',
      hatch: 'rgba(10, 30, 60, 0.9)',
      outline: 'rgba(4, 16, 34, 0.9)',
      glow: 'rgba(150, 200, 255, 0.45)',
      core: ['#ffd29a', '#e8653a', '#7a2412'],
      nucleus: '#ffb07e',
      cone: '#ffb347',
      symbiont: '#f2d64b',
      symbiontDark: '#7d6310'
    },
    gilded: {
      bg: '#120e0a',
      bone: '#ecd08e',
      shade: 'rgba(96, 58, 20, 0.8)',
      hatch: 'rgba(40, 22, 6, 0.9)',
      outline: 'rgba(20, 10, 2, 0.9)',
      glow: 'rgba(255, 190, 90, 0.4)',
      core: ['#ffb08a', '#b8281e', '#4a0a08'],
      nucleus: '#ff8e6e',
      cone: '#ffd15a',
      symbiont: '#b9d155',
      symbiontDark: '#4b5c12'
    },
    ink: {
      bg: '#efe8d8',
      bone: '#2b2a28',
      shade: 'rgba(120, 110, 95, 0.55)',
      hatch: 'rgba(239, 232, 216, 0.9)',
      outline: 'rgba(0, 0, 0, 0.8)',
      glow: 'rgba(0, 0, 0, 0)',
      core: ['#f19a76', '#c23a28', '#5e140e'],
      nucleus: '#e9876a',
      cone: '#d9692a',
      symbiont: '#c9b72e',
      symbiontDark: '#4d4510'
    },
    neon: {
      bg: '#050508',
      bone: '#c8fff4',
      shade: 'rgba(255, 0, 160, 0.45)',
      hatch: 'rgba(40, 0, 60, 0.9)',
      outline: 'rgba(0, 0, 0, 0.6)',
      glow: 'rgba(0, 255, 200, 0.75)',
      core: ['#ffd0ff', '#ff2fa0', '#3a0040'],
      nucleus: '#ff9ef0',
      cone: '#ffe04a',
      symbiont: '#faff5a',
      symbiontDark: '#3a6a00'
    }
  }
  const getPalette = (p) => (typeof p === 'string' ? palettes[p] || palettes.haeckel : { ...palettes.haeckel, ...p })

  // ---------------------------------------------------------------- geometry

  // a path of filled shapes in specimen units (radius 1). Shapes are all wound
  // the same way, so overlapping bars merge into one skeleton; holes (pores,
  // the inside of rings) are wound the other way.
  class Pen {
    // detail: size of a pixel in specimen units, smaller parts are skipped
    constructor (path, detail = 0) { this.path = path; this.detail = detail }

    shape (pts, sign = 1) {
      if (pts.length < 3) return
      let a = 0
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1])
      if (a * sign < 0) pts = pts.slice().reverse()
      const p = this.path
      p.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1])
      // back to the start instead of closePath(), which gets slow on paths with many shapes
      p.lineTo(pts[0][0], pts[0][1])
    }

    circle (x, y, r, n = 14) {
      const pts = []
      for (let i = 0; i < n; i++) pts.push([x + Math.cos(i / n * TAU) * r, y + Math.sin(i / n * TAU) * r])
      this.shape(pts)
    }

    // open bar through pts; width is a number, or w(u) with u from 0 to 1 along it
    rib (pts, width, end) {
      const n = pts.length
      if (n < 2) return
      const w = typeof width === 'function' ? width : end === undefined ? () => width : (u) => width + (end - width) * u
      const L = [0]
      for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
      const total = L[n - 1] || 1e-6
      const left = []
      const right = []
      let t0x = 0
      let t0y = 0
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)]
        const b = pts[Math.min(n - 1, i + 1)]
        let tx = b[0] - a[0]
        let ty = b[1] - a[1]
        const l = Math.hypot(tx, ty) || 1
        tx /= l; ty /= l
        if (i === 0) { t0x = tx; t0y = ty }
        const h = w(L[i] / total) / 2
        left.push([pts[i][0] - ty * h, pts[i][1] + tx * h])
        right.push([pts[i][0] + ty * h, pts[i][1] - tx * h])
      }
      // rounded base, so bars join smoothly where they start
      const h0 = w(0) / 2
      const cap = [[pts[0][0] - t0x * h0 * 0.8 + t0y * h0 * 0.6, pts[0][1] - t0y * h0 * 0.8 - t0x * h0 * 0.6],
        [pts[0][0] - t0x * h0, pts[0][1] - t0y * h0],
        [pts[0][0] - t0x * h0 * 0.8 - t0y * h0 * 0.6, pts[0][1] - t0y * h0 * 0.8 + t0x * h0 * 0.6]]
      this.shape([...left, ...right.reverse(), ...cap])
    }

    // closed bar around pts; width is a number or w(u)
    loop (pts, width) {
      const n = pts.length
      const w = typeof width === 'function' ? width : () => width
      const a = []
      const b = []
      for (let i = 0; i < n; i++) {
        const p = pts[(i - 1 + n) % n]
        const q = pts[(i + 1) % n]
        let tx = q[0] - p[0]
        let ty = q[1] - p[1]
        const l = Math.hypot(tx, ty) || 1
        tx /= l; ty /= l
        const h = w(i / n) / 2
        a.push([pts[i][0] - ty * h, pts[i][1] + tx * h])
        b.push([pts[i][0] + ty * h, pts[i][1] - tx * h])
      }
      const area = (s) => Math.abs(s.reduce((acc, v, i) => { const u = s[(i + 1) % s.length]; return acc + v[0] * u[1] - u[0] * v[1] }, 0))
      const [outer, inner] = area(a) > area(b) ? [a, b] : [b, a]
      this.shape(outer, 1)
      this.shape(inner, -1)
    }

    // part of an ellipse as a bar, growing out from angle `from` in both
    // directions; closes into a ring when amount reaches 1
    arc (cx, cy, rx, ry, from, amount, width) {
      if (amount <= 0) return
      const w = typeof width === 'function' ? width : () => width
      const n = 72
      if (amount >= 1) {
        const pts = []
        for (let i = 0; i < n; i++) { const a = from + i / n * TAU; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]) }
        return this.loop(pts, (u) => w((u * TAU) % TAU))
      }
      for (const dir of [1, -1]) {
        const pts = []
        const m = Math.max(2, Math.ceil(n / 2 * amount))
        for (let i = 0; i <= m; i++) { const a = from + dir * i / m * amount * Math.PI; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]) }
        this.rib(pts, (u) => w(dir * u * amount * Math.PI) * (1 - Math.pow(u, 6) * 0.7))
      }
    }

    // a growing spine with thorns and alternating side branches, like the
    // arms of the plates. o: { g (0-1 growth of the whole spine), t, depth,
    // thorns, thornLength, spread, ratio, curl, sway, children }
    branch (x, y, ang, len, w, o, seed, d = 0) {
      const r = rng(seed, d)
      const levels = o.depth + 1
      const lg = ease((o.g - d / levels * 0.85) / (1.5 / levels))
      // all random numbers are drawn before anything is skipped
      const curl = (r() - 0.5) * 2 * o.curl
      const swaySeed = r()
      const lenJitter = 0.85 + 0.3 * r()
      const kids = d < o.depth ? Math.max(0, Math.round(o.children)) : 0
      const firstSide = r() < 0.5 ? 1 : -1
      const thornCount = Math.max(0, Math.round(o.thorns * Math.min(1.6, 0.4 + len * 2) * (1 - d * 0.15)))
      const thornSide = r() < 0.5 ? 1 : -1
      const kidRandom = Array.from({ length: kids }, () => [r(), r(), r()])
      const thornRandom = Array.from({ length: thornCount }, () => [r(), r()])
      if (lg <= 0 || len * lg < this.detail * 6) return

      const segs = len * lg < this.detail * 40 ? 4 : 10
      const L = len * lenJitter * lg
      const pts = [[x, y]]
      const angles = [ang]
      let a = ang + o.sway * 0.12 * (d + 1) * wob(swaySeed, o.t * 0.5)
      let px = x
      let py = y
      for (let i = 1; i <= segs; i++) {
        a += curl / segs + o.sway * 0.03 * wob(swaySeed + i, o.t * 0.7)
        px += Math.cos(a) * L / segs
        py += Math.sin(a) * L / segs
        pts.push([px, py])
        angles.push(a)
      }
      const width = (u) => w * (1 - u * 0.85)
      this.rib(pts, width)
      const at = (f) => {
        const i = Math.min(segs - 1, Math.floor(f * segs))
        const k = f * segs - i
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, angles[i + 1]]
      }

      for (let j = 0; j < thornCount; j++) {
        const [r1, r2] = thornRandom[j]
        const f = (j + 0.4 + 0.3 * r1) / (thornCount + 0.3)
        const tg = clamp01((lg - f * 0.9) * 4)
        if (tg <= 0 || width(f) * o.thornLength < this.detail * 2) continue
        const side = j % 2 ? thornSide : -thornSide
        const [bx, by, ba] = at(f)
        const ww = width(f)
        const ta = ba + side * (0.55 + 0.4 * r2)
        const tl = ww * o.thornLength * (0.7 + 0.6 * r2) * tg + ww * 0.5
        const sx = bx - Math.sin(ba) * side * ww * 0.3
        const sy = by + Math.cos(ba) * side * ww * 0.3
        this.rib([[sx, sy], [sx + Math.cos(ta) * tl * 0.55, sy + Math.sin(ta) * tl * 0.55], [sx + Math.cos(ta + side * 0.12) * tl, sy + Math.sin(ta + side * 0.12) * tl]], ww * 0.85, 0)
      }

      for (let k = 0; k < kids; k++) {
        const [r1, r2, r3] = kidRandom[k]
        const f = 0.22 + 0.68 * (k + 0.35 + 0.3 * r1) / kids
        if (lg < f * 0.8) continue
        const side = k % 2 ? -firstSide : firstSide
        const [bx, by, ba] = at(f)
        const ka = ba + side * o.spread * (0.75 + 0.5 * r2)
        const kl = len * o.ratio * (0.7 + 0.5 * r3) * (1 - f * 0.45)
        this.branch(bx, by, ka, kl, Math.max(width(f), w * 0.55) * 0.85, o, hash(seed, k, 77), d + 1)
      }
    }

    // a lanceolate blade with saw teeth along both edges
    blade (x, y, ang, len, wid, teeth) {
      const n = 32
      const left = []
      const right = []
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      const toothEvery = teeth > 0 ? Math.max(2, Math.round(n / (teeth + 1))) : Infinity
      for (let i = 0; i <= n; i++) {
        let u = i / n
        let hw = wid * (0.22 * (1 - u) + Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.8) * (1 - u * 0.4))
        if (i % toothEvery === toothEvery - 1 && i < n - 1) { u += 0.6 / n; hw *= 1.45 }
        const cx = x + c * len * u
        const cy = y + s * len * u
        left.push([cx - s * hw, cy + c * hw])
        right.push([cx + s * hw, cy - c * hw])
      }
      this.shape([...left, ...right.reverse()])
      // the midrib, a darker groove in the engraving comes from the shading
      this.rib([[x, y], [x + c * len * 0.85, y + s * len * 0.85]], wid * 0.35, wid * 0.1)
    }
  }

  // 3D: rotate around the vertical axis by spin, tilt towards the viewer, slight perspective
  const projector = (spin, tilt, persp = 0.15) => {
    const cs = Math.cos(spin)
    const ss = Math.sin(spin)
    const ct = Math.cos(tilt)
    const st = Math.sin(tilt)
    return ([x, y, z]) => {
      const x1 = x * cs + z * ss
      const z1 = -x * ss + z * cs
      const y2 = y * ct - z1 * st
      const z2 = y * st + z1 * ct
      const f = 1 / (1 - z2 * persp)
      return [x1 * f, -y2 * f, z2]
    }
  }

  // draw a 3D polyline as bars, front parts on `front` and far parts on `back`
  const bars3 = (pts3, proj, back, front, width) => {
    const runs = []
    let cur = []
    let side
    for (const p of pts3) {
      const q = proj(p)
      const s = q[2] >= 0
      if (side !== undefined && s !== side) {
        cur.push([q[0], q[1]])
        runs.push([side, cur])
        cur = [cur[cur.length - 2]]
      }
      side = s
      cur.push([q[0], q[1]])
    }
    runs.push([side, cur])
    runs.forEach(([s, c]) => (s ? front : back).rib(c, width))
  }

  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

  // one pore of a lattice: a rim around a hole, on the surface at c with tangents u, v
  const pore = (pen, proj, c, u, v, outer, inner, r, onSphere) => {
    const m = 10
    const jit = Array.from({ length: m }, () => 1 + 0.22 * (r() - 0.5))
    const ring = (rad) => jit.map((j, k) => {
      const a = k / m * TAU
      let p = [0, 1, 2].map((i) => c[i] + (u[i] * Math.cos(a) + v[i] * Math.sin(a)) * rad * j)
      if (onSphere) p = norm(p).map((x) => x * onSphere)
      const q = proj(p)
      return [q[0], q[1]]
    })
    pen.shape(ring(outer), 1)
    if (inner > 0) pen.shape(ring(inner), -1)
  }

  // yellow symbionts scattered in an elliptical annulus, drifting slowly
  const symbionts = (n, seed, rIn, rOut, g, t, born0, sx = 1, sy = 1, cx = 0) => {
    const list = []
    for (let i = 0; i < n; i++) {
      const r = rng(seed, 900, i)
      const a0 = r() * TAU
      const rad = rIn + (rOut - rIn) * Math.sqrt(r())
      const size = 0.024 * (0.75 + 0.5 * r())
      const om = (r() - 0.5) * 0.06
      const born = born0 + (1 - born0) * 0.85 * r()
      const k = ease((g - born) / 0.1)
      if (k <= 0) continue
      const a = a0 + t * om
      const rr = rad * (1 + 0.04 * wob(i, t * 0.6))
      list.push({ x: cx + Math.cos(a) * rr * sx, y: Math.sin(a) * rr * sy, r: size * k })
    }
    return list
  }

  // ------------------------------------------------------------------- forms

  const branchOptions = (o, g, t) => ({
    g, t,
    depth: Math.max(0, Math.round(o.branching)),
    thorns: o.thorns,
    thornLength: o.thornLength,
    spread: o.spread,
    ratio: o.ratio,
    curl: o.curl,
    sway: o.sway,
    children: o.children
  })

  const forms = {
    ring: {
      defaults: { rings: 2, spines: 14, spineLength: 1, branching: 2, thorns: 3, children: 2, core: 0, symbionts: 0 },
      build (P, o, g, t, seed) {
        const n = Math.max(1, Math.round(o.rings))
        const W = Math.min(0.72, 0.16 + 0.15 * n)
        const rx = W / n
        const ry = 0.32 * (1 + 0.02 * Math.sin(t * 0.8))
        const centers = Array.from({ length: n }, (_, k) => (k - (n - 1) / 2) * 2 * rx * 0.93)
        const rys = centers.map((c) => ry * (1 - 0.18 * Math.abs(c) / Math.max(W, 1e-6)))
        if (o.core > 0) {
          centers.forEach((c, k) => P.core({ x: c, y: 0, rx: rx * 0.62 * o.core, ry: rys[k] * 0.62 * o.core, k: ease((g - 0.3) / 0.3), seed: hash(seed, 40, k), nuclei: 2 }))
        }
        const pen = P.bone()
        const ringG = ease(g / 0.3)
        centers.forEach((c, k) => {
          const rr = rng(seed, 10, k)
          const beads = 4 + Math.floor(rr() * 5)
          pen.arc(c, 0, rx * 0.95, rys[k], -Math.PI / 2, ringG, (a) => 0.03 * (1 + 0.25 * Math.cos(beads * a)))
          // thorns on the rings, pointing out and in
          const tg = ease((g - 0.2) / 0.3)
          const count = Math.round(o.thorns * 3)
          for (let j = 0; j < count && tg > 0; j++) {
            const a = (j + rr()) / count * TAU
            const px = c + Math.cos(a) * rx * 0.95
            const py = Math.sin(a) * rys[k]
            const out = j % 3 ? 1 : -1
            const ta = a + (rr() - 0.5) * 0.8
            const tl = 0.05 * tg * (0.6 + 0.8 * rr())
            pen.rib([[px, py], [px + Math.cos(ta) * tl * out, py + Math.sin(ta) * tl * out]], 0.022, 0)
          }
        })
        const barG = ease((g - 0.15) / 0.25)
        if (n > 1 && barG > 0) {
          for (const sign of [-1, 1]) {
            const pts = centers.map((c, k) => [c, sign * rys[k] * 0.97])
            const mid = Math.floor(pts.length / 2)
            const span = Math.max(1, Math.ceil(barG * pts.length / 2))
            pen.rib(pts.slice(Math.max(0, mid - span), Math.min(pts.length, mid + span + (pts.length % 2))), 0.034)
          }
        }
        const sg = clamp01((g - 0.25) / 0.75)
        const m = Math.max(0, Math.round(o.spines))
        const opts = branchOptions(o, sg, t)
        const hullX = Math.abs(centers[0]) + rx
        for (let j = 0; j < m; j++) {
          const r = rng(seed, 20, j)
          const a = -Math.PI / 2 + j / m * TAU + (r() - 0.5) * 0.25
          const bx = Math.cos(a) * hullX * 0.96
          const by = Math.sin(a) * ry * 0.98
          const len = 0.42 * o.spineLength * (0.7 + 0.5 * r()) * (j === 0 ? 1.45 : 1)
          pen.branch(bx, by, a + (r() - 0.5) * 0.3, len, 0.045, opts, hash(seed, 21, j))
        }
      }
    },

    cage: {
      defaults: { rings: 3, girdle: 1, spines: 6, spineLength: 1, branching: 1, thorns: 3, horn: 1, children: 2, core: 0, symbionts: 0 },
      build (P, o, g, t, seed) {
        const R = 0.42
        const proj = projector(t * o.spin + seed, o.tilt)
        const back = P.bone(o.depth)
        if (o.core > 0) P.core({ x: 0, y: 0, rx: R * 0.5 * o.core, ry: R * 0.5 * o.core, k: ease((g - 0.2) / 0.3), seed, nuclei: 3 })
        const front = P.bone(1)
        const n = Math.max(1, Math.round(o.rings))
        const ringPoint = (phi, th) => [Math.cos(th) * Math.cos(phi) * R, Math.sin(th) * R * 1.05, Math.cos(th) * Math.sin(phi) * R]
        for (let k = 0; k < n; k++) {
          const phi = k / n * Math.PI + 0.3
          const rg = ease((g - k * 0.05) / 0.3)
          if (rg <= 0) continue
          const pts = []
          const steps = 80
          for (let i = 0; i <= steps; i++) pts.push(ringPoint(phi, -Math.PI / 2 + (i / steps * 2 - 1) * rg * Math.PI))
          bars3(pts, proj, back, front, 0.032)
        }
        const gg = ease((g - 0.2) / 0.25)
        if (o.girdle > 0 && gg > 0) {
          const pts = []
          for (let i = 0; i <= 80; i++) { const a = (i / 80 * 2 - 1) * gg * Math.PI; pts.push([Math.cos(a) * R * 1.02, 0, Math.sin(a) * R * 1.02]) }
          bars3(pts, proj, back, front, 0.028)
        }
        const sg = clamp01((g - 0.3) / 0.7)
        const opts = branchOptions(o, sg, t)
        const spine = (base, dir, len, w, s) => {
          const tip = base.map((v, i) => v + dir[i] * len)
          const b = proj(base)
          const e = proj(tip)
          const l2 = Math.hypot(e[0] - b[0], e[1] - b[1])
          ;(b[2] >= 0 ? front : back).branch(b[0], b[1], Math.atan2(e[1] - b[1], e[0] - b[0]), l2, w, opts, s)
        }
        const m = Math.max(0, Math.round(o.spines))
        for (let k = 0; k < n; k++) {
          const phi = k / n * Math.PI + 0.3
          for (let j = 0; j < m; j++) {
            const r = rng(seed, 30, k, j)
            const th = (j + 0.5) / m * TAU + k * 0.4
            const base = ringPoint(phi, th)
            const dir = norm(base.map((v) => v / R + (r() - 0.5) * 0.5))
            spine(base, dir, 0.45 * o.spineLength * (0.6 + 0.5 * r()), 0.036, hash(seed, 31, k, j))
          }
        }
        const horns = Math.round(o.horn)
        if (horns >= 1) spine([0, R * 1.05, 0], [0, 1, 0], 0.55 * o.spineLength, 0.05, hash(seed, 32))
        if (horns >= 2) spine([0, -R * 1.05, 0], [0, -1, 0], 0.45 * o.spineLength, 0.045, hash(seed, 33))
      }
    },

    lattice: {
      defaults: { pores: 120, bands: 2, spines: 0, spineLength: 1, branching: 0, thorns: 1, children: 2, core: 1, symbionts: 0 },
      build (P, o, g, t, seed) {
        const R = 0.62
        const proj = projector(t * o.spin + seed, o.tilt, 0.12)
        const back = P.bone(o.depth)
        if (o.core > 0) P.core({ x: 0, y: 0, rx: R * 0.62 * o.core, ry: R * 0.6 * o.core, k: ease(g / 0.4), seed, nuclei: 5, cone: true })
        const front = P.bone(1)
        const N = Math.max(8, Math.round(o.pores))
        const s = R * Math.sqrt(4 * Math.PI / N)
        const golden = Math.PI * (3 - Math.sqrt(5))
        const bands = Math.max(0, Math.round(o.bands))
        for (let i = 0; i < N; i++) {
          const yv = 1 - 2 * (i + 0.5) / N
          const rr = Math.sqrt(1 - yv * yv)
          const th = golden * i
          const c = [Math.cos(th) * rr, yv, Math.sin(th) * rr]
          const r = rng(seed, 300, i)
          // the lattice spreads out from the bands
          const dist = bands >= 2 ? Math.min(Math.abs(c[0]), Math.abs(c[1])) : bands === 1 ? Math.abs(c[0]) : (1 - c[1]) / 2
          const born = 0.12 + 0.72 * Math.pow(Math.asin(Math.min(1, dist)) / (Math.PI / 2), 0.8) + 0.06 * r()
          const lg = ease((g - born) / 0.16)
          if (lg <= 0) continue
          const u = norm(cross(c, Math.abs(c[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]))
          const v = cross(c, u)
          const outer = s * (0.62 + 0.06 * r()) / R
          const inner = outer - s * 0.17 / R * (0.4 + 0.6 * lg) - s * 0.03 / R
          const z = proj(c)[2]
          pore(z >= 0 ? front : back, proj, c, u, v, outer * (0.5 + 0.5 * lg), lg > 0.05 ? inner * (0.5 + 0.5 * lg) : 0, r, R * 1.0)
        }
        const bg = ease(g / 0.3)
        const planes = [
          (a) => [0, Math.sin(a), Math.cos(a)],
          (a) => [Math.sin(a), 0, Math.cos(a)],
          (a) => [Math.cos(a) * Math.SQRT1_2, Math.sin(a), Math.cos(a) * Math.SQRT1_2]
        ]
        for (let b = 0; b < Math.min(bands, 3) && bg > 0; b++) {
          const pts = []
          for (let i = 0; i <= 96; i++) pts.push(planes[b]((i / 96 * 2 - 1) * bg * Math.PI).map((x) => x * R * 1.03))
          bars3(pts, proj, back, front, 0.05)
        }
        const m = Math.max(0, Math.round(o.spines))
        const sg = clamp01((g - 0.55) / 0.45)
        const opts = branchOptions(o, sg, t)
        for (let j = 0; j < m; j++) {
          const yv = 1 - 2 * (j + 0.5) / m
          const rr = Math.sqrt(1 - yv * yv)
          const c = [Math.cos(golden * j * 3) * rr, yv, Math.sin(golden * j * 3) * rr]
          const b = proj(c.map((x) => x * R))
          const e = proj(c.map((x) => x * R * (1 + 0.45 * o.spineLength)))
          ;(b[2] >= 0 ? front : back).branch(b[0], b[1], Math.atan2(e[1] - b[1], e[0] - b[0]), Math.hypot(e[0] - b[0], e[1] - b[1]), 0.024, opts, hash(seed, 310, j))
        }
      }
    },

    bush: {
      defaults: { arms: 10, armLength: 1, branching: 3, thorns: 5, children: 3, droop: 0.5, core: 1, symbionts: 40, spread: 0.7, curl: 0.6 },
      build (P, o, g, t, seed) {
        const rx = 0.2
        const ry = 0.25 * (1 + 0.02 * Math.sin(t * 0.7))
        if (o.core > 0) P.core({ x: 0, y: 0.01, rx: 0.12 * o.core, ry: 0.13 * o.core, k: ease((g - 0.05) / 0.3), seed, nuclei: 4, cone: true })
        const pen = P.bone()
        const rr = rng(seed, 50)
        const beads = 5 + Math.floor(rr() * 4)
        pen.arc(0, 0, rx, ry, -Math.PI / 2, ease(g / 0.25), (a) => 0.026 * (1 + 0.3 * Math.cos(beads * a)))
        const n = Math.max(0, Math.round(o.arms))
        const opts = branchOptions(o, clamp01((g - 0.15) / 0.85), t)
        for (let k = 0; k < n; k++) {
          const r = rng(seed, 500, k)
          const a = -Math.PI / 2 + (k + 0.5) / n * TAU + (r() - 0.5) * 0.35
          const down = Math.max(0, Math.sin(a))
          const len = 0.62 * o.armLength * (0.8 + 0.35 * r()) * (1 + o.droop * down * 0.6) / (1 + o.droop * 0.3)
          pen.branch(Math.cos(a) * rx, Math.sin(a) * ry, a + (r() - 0.5) * 0.3, len, 0.045, opts, hash(seed, 510, k))
        }
        const ns = Math.max(0, Math.round(o.symbionts))
        const inside = Math.round(ns * 0.35)
        P.dots([
          ...symbionts(inside, hash(seed, 1), 0.13, 0.19, g, t, 0.3, rx / 0.2, ry / 0.2),
          ...symbionts(ns - inside, hash(seed, 2), 0.32, 0.88, g, t, 0.45)
        ])
      }
    },

    star: {
      defaults: { blades: 18, bladeLength: 1, bladeWidth: 1, teeth: 5, branching: 1, thorns: 2, children: 2, core: 1, symbionts: 36 },
      build (P, o, g, t, seed) {
        const lx = 0.125
        const lrx = 0.125
        const lry = 0.18 * (1 + 0.02 * Math.sin(t * 0.9))
        if (o.core > 0) {
          for (const sgn of [-1, 1]) P.core({ x: sgn * lx, y: 0, rx: 0.11 * o.core, ry: 0.16 * o.core, rot: sgn * 0.1, k: ease((g - 0.05) / 0.3), seed: hash(seed, sgn), nuclei: 2, cone: sgn > 0 })
        }
        const pen = P.bone()
        const rg = ease(g / 0.25)
        for (const sgn of [-1, 1]) pen.arc(sgn * lx, 0, lrx, lry, -Math.PI / 2, rg, (a) => 0.024 * (1 + 0.2 * Math.cos(6 * a)))
        if (rg > 0.5) pen.rib([[0, -lry * 1.05], [0, lry * 1.05]], 0.03)
        const n = Math.max(0, Math.round(o.blades))
        const bg = clamp01((g - 0.15) / 0.85)
        const opts = branchOptions({ ...o, branching: o.branching - 1 }, bg, t)
        for (let k = 0; k < n; k++) {
          const r = rng(seed, 600, k)
          const long = k % 2 === 0
          const a = -Math.PI / 2 + k / n * TAU + (r() - 0.5) * 0.12 + o.sway * 0.04 * wob(k, t * 0.4)
          const born = (long ? 0 : 0.15) + 0.1 * r()
          const lg = ease((bg - born) / 0.6)
          if (lg <= 0) continue
          const L = 0.66 * o.bladeLength * (long ? 1 : 0.72) * (0.85 + 0.25 * r()) * lg
          const W = 0.05 * o.bladeWidth * (long ? 1 : 0.8) * (0.6 + 0.4 * lg)
          const bx = Math.cos(a) * (2 * lrx) * 0.95
          const by = Math.sin(a) * lry * 0.95
          pen.blade(bx, by, a, L, W, Math.round(o.teeth))
          if (o.branching > 0 && long) {
            for (const side of [-1, 1]) {
              const f = 0.4 + 0.15 * r()
              pen.branch(bx + Math.cos(a) * L * f, by + Math.sin(a) * L * f, a + side * (0.7 + 0.2 * r()), L * 0.35, W * 0.5, opts, hash(seed, 610, k, side))
            }
          }
        }
        P.dots(symbionts(Math.max(0, Math.round(o.symbionts)), hash(seed, 3), 0.3, 1.0, g, t, 0.4))
      }
    },

    basket: {
      defaults: { columns: 10, pores: 60, spines: 0, spineLength: 1, branching: 0, thorns: 2, children: 2, core: 1, symbionts: 0, tilt: 0.45 },
      build (P, o, g, t, seed) {
        const R = 0.4
        const H = 0.36
        const proj = projector(t * o.spin + seed, o.tilt, 0.12)
        const back = P.bone(o.depth)
        if (o.core > 0) P.core({ x: 0, y: proj([0, 0, 0])[1], rx: 0.3 * o.core, ry: 0.3 * o.core, k: ease((g - 0.1) / 0.3), seed, nuclei: 3, cone: true })
        const front = P.bone(1)
        const pick = (p) => (proj(p)[2] >= 0 ? front : back)
        const n = Math.max(0, Math.round(o.columns))
        const cg = ease((g - 0.2) / 0.35)
        for (let k = 0; k < n && cg > 0; k++) {
          const phi = k / n * TAU
          const pts = []
          for (let i = 0; i <= 12; i++) {
            const y = -H + 2 * H * cg * i / 12
            const rad = R * (1 - 0.07 * Math.sin(Math.PI * (y + H) / (2 * H)))
            pts.push(proj([Math.cos(phi) * rad, y, Math.sin(phi) * rad]))
          }
          const mid = [Math.cos(phi) * R, 0, Math.sin(phi) * R]
          pick(mid).rib(pts.map((q) => [q[0], q[1]]), (u) => 0.05 * (1 - 0.35 * Math.sin(Math.PI * u)))
        }
        // porous bands around the bottom and the top of the barrel
        const nb = Math.max(8, Math.round(o.pores * 0.3))
        const sp = TAU * R / nb
        const band = (yc, born0, idx) => {
          for (let row = 0; row < 2; row++) {
            for (let i = 0; i < nb; i++) {
              const r = rng(seed, 700 + idx, row, i)
              const phi = (i + row * 0.5) / nb * TAU
              const lg = ease((g - born0 - 0.12 * i / nb - 0.04 * r()) / 0.12)
              if (lg <= 0) continue
              const c = [Math.cos(phi) * R * 1.02, yc + (row - 0.5) * sp * 0.85, Math.sin(phi) * R * 1.02]
              const u = [-Math.sin(phi), 0, Math.cos(phi)]
              const outer = sp * 0.6 * (0.5 + 0.5 * lg)
              pore(pick(c), proj, c, u, [0, 1, 0], outer, lg > 0.05 ? (outer - sp * 0.22 * lg) * 0.85 : 0, r, 0)
            }
          }
          const ring = []
          for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU; ring.push([Math.cos(a) * R * 1.03, yc, Math.sin(a) * R * 1.03]) }
          if (g > born0 + 0.1) bars3(ring, proj, back, front, 0.022)
        }
        band(-H, 0.05, 0)
        band(H, 0.5, 1)
        // domed porous cap
        const Nc = Math.max(6, Math.round(o.pores * 0.5))
        const golden = Math.PI * (3 - Math.sqrt(5))
        const sc = Math.sqrt(Math.PI * R * R / Nc)
        for (let i = 0; i < Nc; i++) {
          const r = rng(seed, 750, i)
          const rho = Math.sqrt((i + 0.5) / Nc) * R * 0.9
          const lg = ease((g - 0.6 - 0.3 * rho / R - 0.03 * r()) / 0.12)
          if (lg <= 0) continue
          const th = golden * i
          const c = [Math.cos(th) * rho, H + sp * 0.45 + 0.07 * (1 - (rho / R) ** 2), Math.sin(th) * rho]
          const outer = sc * 0.62 * (0.5 + 0.5 * lg)
          pore(pick([0, H + 1, 0]), proj, c, [1, 0, 0], [0, 0, 1], outer, lg > 0.05 ? (outer - sc * 0.22 * lg) * 0.85 : 0, r, 0)
        }
        const m = Math.max(0, Math.round(o.spines))
        const opts = branchOptions(o, clamp01((g - 0.6) / 0.4), t)
        for (let j = 0; j < m; j++) {
          const phi = j / m * TAU
          const base = [Math.cos(phi) * R, -H, Math.sin(phi) * R]
          const b = proj(base)
          const e = proj([Math.cos(phi) * R * (1 + 0.5 * o.spineLength), -H - 0.25 * o.spineLength, Math.sin(phi) * R * (1 + 0.5 * o.spineLength)])
          pick(base).branch(b[0], b[1], Math.atan2(e[1] - b[1], e[0] - b[0]), Math.hypot(e[0] - b[0], e[1] - b[1]), 0.026, opts, hash(seed, 760, j))
        }
      }
    }
  }

  const common = {
    form: 'bush',
    x: 0.5,
    y: 0.5,
    size: 0.42,
    rotation: 0,
    seed: 1,
    life: 'grow',
    grow: 12,
    cycle: 40,
    delay: 0,
    growth: undefined,
    speed: 1,
    sway: 1,
    spin: 0.15,
    tilt: 0.35,
    thorns: 3,
    thornLength: 2.2,
    branching: 2,
    children: 2,
    spread: 0.75,
    ratio: 0.55,
    curl: 0.5,
    palette: 'haeckel',
    glow: 1,
    shading: 1,
    hatch: 0.35,
    outline: 0.2,
    depth: 0.4
  }

  // ---------------------------------------------------------------- painting

  class Painter {
    constructor (detail) { this.steps = []; this.detail = detail }
    bone (alpha = 1) { const path = new Path2D(); this.steps.push({ kind: 'bone', path, alpha }); return new Pen(path, this.detail) }
    core (c) { this.steps.push({ kind: 'core', ...c }) }
    dots (list) { this.steps.push({ kind: 'dots', list }) }
  }

  const cache = new WeakMap() // context -> { key: pattern }
  const cached = (ctx, key, make) => {
    if (!cache.has(ctx)) cache.set(ctx, {})
    const c = cache.get(ctx)
    if (!(key in c)) c[key] = make()
    return c[key]
  }
  const hatchPattern = (ctx, color) => cached(ctx, 'hatch' + color, () => {
    const c = document.createElement('canvas')
    c.width = c.height = 5
    const g = c.getContext('2d')
    g.strokeStyle = color
    g.lineWidth = 1
    g.beginPath()
    for (const o of [-5, 0, 5]) { g.moveTo(o, 5); g.lineTo(o + 5, 0) }
    g.stroke()
    return ctx.createPattern(c, 'repeat')
  })
  const grainPattern = (ctx) => cached(ctx, 'grain', () => {
    const c = document.createElement('canvas')
    c.width = c.height = 192
    const g = c.getContext('2d')
    const img = g.createImageData(192, 192)
    const r = mulberry(7)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() < 0.5 ? 255 : 0
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 10 + r() * 16
    }
    g.putImageData(img, 0, 0)
    return ctx.createPattern(c, 'repeat')
  })

  function paintBone (ctx, step, o, pal, S, pd) {
    const { path, alpha } = step
    ctx.save()
    ctx.globalAlpha = alpha
    if (o.glow > 0 && alpha >= 1) {
      ctx.shadowColor = pal.glow
      ctx.shadowBlur = o.glow * S * pd * 0.03
    }
    ctx.fillStyle = pal.bone
    ctx.fill(path)
    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'
    if (o.shading > 0 || o.hatch > 0) {
      // shadow on the lower right side of every bar: shade it all, then put
      // the light back on a copy shifted towards the light
      ctx.save()
      ctx.clip(path)
      if (o.shading > 0) {
        ctx.globalAlpha = alpha * Math.min(1, o.shading)
        ctx.fillStyle = pal.shade
        ctx.fill(path)
      }
      if (o.hatch > 0) {
        const pattern = hatchPattern(ctx, pal.hatch)
        pattern.setTransform?.(new DOMMatrix().scale(1 / S))
        ctx.globalAlpha = alpha * Math.min(1, o.hatch)
        ctx.fillStyle = pattern
        ctx.fill(path)
      }
      const d = Math.max(0.005, 2.5 / S)
      ctx.translate(-d, -d)
      ctx.globalAlpha = alpha
      ctx.fillStyle = pal.bone
      ctx.fill(path)
      ctx.restore()
    }
    if (o.outline > 0) {
      ctx.globalAlpha = alpha * Math.min(1, o.outline)
      ctx.strokeStyle = pal.outline
      ctx.lineWidth = 0.8 / S
      ctx.stroke(path)
    }
    ctx.restore()
  }

  function paintCore (ctx, c, pal, o, S, pd) {
    const k = c.k
    if (!(k > 0)) return
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(c.rot || 0)
    ctx.scale(c.rx * k, c.ry * k)
    const [light, mid, dark] = pal.core
    if (o.glow > 0) {
      ctx.shadowColor = mid
      ctx.shadowBlur = o.glow * S * pd * 0.04 * k
    }
    const grad = ctx.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1)
    grad.addColorStop(0, light)
    grad.addColorStop(0.5, mid)
    grad.addColorStop(1, dark)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TAU)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.save()
    ctx.clip()
    const r = rng(c.seed, 5)
    // granular plasma
    ctx.fillStyle = 'rgba(255, 210, 180, 0.1)'
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU
      const d = Math.sqrt(r()) * 0.9
      ctx.beginPath()
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.04 + 0.08 * r(), 0, TAU)
      ctx.fill()
    }
    if (c.cone) {
      // the conical bundle of fine lines at the base of the capsule
      ctx.strokeStyle = pal.cone
      ctx.lineWidth = 0.014
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      for (let i = 0; i <= 14; i++) { ctx.moveTo(0, -0.1); ctx.lineTo(-0.36 + 0.72 * i / 14, 0.85) }
      ctx.stroke()
      ctx.globalAlpha = 0.35
      ctx.fillStyle = pal.cone
      ctx.beginPath()
      ctx.moveTo(0, -0.1); ctx.lineTo(-0.38, 0.86); ctx.lineTo(0.38, 0.86)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    for (let i = 0; i < (c.nuclei || 0); i++) {
      const a = r() * TAU
      const d = 0.2 + 0.4 * r()
      const nr = 0.12 + 0.12 * r()
      const nx = Math.cos(a) * d
      const ny = Math.sin(a) * d * (c.cone ? 0.6 : 1) - (c.cone ? 0.2 : 0)
      const ng = ctx.createRadialGradient(nx - nr * 0.35, ny - nr * 0.35, nr * 0.1, nx, ny, nr)
      ng.addColorStop(0, light)
      ng.addColorStop(0.6, pal.nucleus)
      ng.addColorStop(1, mid)
      ctx.fillStyle = ng
      ctx.beginPath()
      ctx.arc(nx, ny, nr, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = dark
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 0.02
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.restore()
    ctx.strokeStyle = dark
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 0.04
    ctx.beginPath()
    ctx.arc(0, 0, 0.98, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  function paintDots (ctx, list, pal, o, S, pd) {
    ctx.save()
    for (const d of list) {
      if (!(d.r > 0)) continue
      ctx.fillStyle = pal.symbiont
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = pal.symbiontDark
      ctx.lineWidth = d.r * 0.25
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(d.x + d.r * 0.1, d.y + d.r * 0.1, d.r * 0.36, 0, TAU)
      ctx.lineWidth = d.r * 0.14
      ctx.globalAlpha = 0.6
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(255, 255, 225, 0.65)'
      ctx.beginPath()
      ctx.arc(d.x - d.r * 0.38, d.y - d.r * 0.38, d.r * 0.2, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  // ---------------------------------------------------------------- specimens

  const isP5 = (v) => v && typeof v.ellipse === 'function' && typeof v.millis === 'function'
  const resolveP5 = (p) => {
    if (isP5(p)) return p
    if (isP5(window.p5)) return window.p5
    throw new Error('radiolaria: pass a p5 instance, e.g. p5 = new P5(); radiolaria(p5, { ... })')
  }
  const value = (v, t) => (typeof v === 'function' ? v(t) : v)

  class Specimen {
    constructor (p, options = {}) {
      this.p = p
      this.options = { ...options }
      this.age = 0
      this.last = undefined
    }

    set (options = {}) { Object.assign(this.options, options); return this }
    grow () { this.age = 0; return this }
    reseed (seed = Math.floor(Math.random() * 1e6)) { this.options.seed = seed; return this.grow() }

    resolve (t) {
      const form = value(this.options.form ?? common.form, t)
      const def = forms[form]
      if (!def) throw new Error(`radiolaria: unknown form '${form}', use one of ${Object.keys(forms).join(', ')}`)
      const raw = { ...common, ...def.defaults, ...this.options }
      const o = {}
      for (const key in raw) o[key] = key === 'form' ? form : value(raw[key], t)
      return { o, def }
    }

    draw () {
      const p = this.p
      const ctx = p.drawingContext
      if (!ctx || typeof ctx.fill !== 'function' || !('shadowBlur' in ctx)) throw new Error('radiolaria: needs a 2D p5 canvas (not WEBGL)')
      const now = p.millis() / 1000
      const dt = this.last === undefined ? 0 : Math.min(0.25, Math.max(0, now - this.last))
      this.last = now
      const speed = value(this.options.speed ?? 1, this.age)
      this.age += dt * speed
      const { o, def } = this.resolve(this.age)
      const t = this.age
      const live = Math.max(0, t - o.delay)
      let g
      let seed = o.seed
      if (o.growth !== undefined && o.growth !== null) g = clamp01(o.growth)
      else if (o.life === 'still') g = 1
      else if (o.life === 'cycle') {
        const cycle = Math.max(1, o.cycle)
        const phase = live % cycle
        const fade = Math.min(o.grow * 0.5, cycle * 0.2)
        seed += Math.floor(live / cycle) * 101
        g = phase < cycle - fade ? clamp01(phase / o.grow) : clamp01((cycle - phase) / fade) * clamp01((cycle - fade) / o.grow)
      } else g = clamp01(live / Math.max(0.01, o.grow))
      this.growth = g
      if (g <= 0) return this

      const S = o.size * Math.min(p.width, p.height)
      const P = new Painter(1 / S)
      def.build(P, o, g, t, seed)
      const pal = getPalette(o.palette)
      const pd = typeof p.pixelDensity === 'function' ? p.pixelDensity() : 1
      ctx.save()
      ctx.translate(o.x * p.width, o.y * p.height)
      ctx.rotate(o.rotation)
      ctx.scale(S, S)
      for (const step of P.steps) {
        if (step.kind === 'bone') paintBone(ctx, step, o, pal, S, pd)
        else if (step.kind === 'core') paintCore(ctx, step, pal, o, S, pd)
        else paintDots(ctx, step.list, pal, o, S, pd)
      }
      ctx.restore()
      return this
    }
  }

  function radiolaria (p, options) {
    if (!isP5(p) && options === undefined) { options = p; p = undefined }
    return new Specimen(resolveP5(p), options)
  }

  radiolaria.backdrop = (p, { palette = 'haeckel', grain = 1, vignette = 1 } = {}) => {
    p = resolveP5(p)
    const pal = getPalette(palette)
    const ctx = p.drawingContext
    const w = p.width
    const h = p.height
    ctx.save()
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    if (vignette > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.75)
      g.addColorStop(0, `rgba(255, 255, 255, ${0.05 * vignette})`)
      g.addColorStop(1, `rgba(0, 0, 0, ${0.5 * vignette})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    if (grain > 0) {
      ctx.globalAlpha = Math.min(1, grain)
      ctx.fillStyle = grainPattern(ctx)
      ctx.fillRect(0, 0, w, h)
    }
    ctx.restore()
  }

  radiolaria.plate = (p, options) => {
    if (!isP5(p) && options === undefined) { options = p; p = undefined }
    p = resolveP5(p)
    const {
      forms: list = ['bush', 'lattice', 'ring', 'cage', 'star', 'basket'],
      cols, rows, seed = 1, background = true, draw = true, stagger = 1.5, grain = 1, vignette = 1,
      ...rest
    } = options || {}
    const n = list.length
    const c = cols || Math.max(1, Math.round(Math.sqrt(n * p.width / p.height)))
    const r = rows || Math.ceil(n / c)
    const m = Math.min(p.width, p.height)
    const cell = Math.min(p.width / c, p.height / r) / m
    const specimens = list.map((entry, i) => {
      const spec = typeof entry === 'string' ? { form: entry } : entry
      const j = rng(seed, 1000, i)
      return new Specimen(p, {
        x: (i % c + 0.5 + (j() - 0.5) * 0.08) / c,
        y: (Math.floor(i / c) + 0.5 + (j() - 0.5) * 0.08) / r,
        size: cell * 0.43,
        rotation: (j() - 0.5) * 0.3,
        seed: seed + i * 17,
        delay: i * stagger,
        ...rest,
        ...spec
      })
    })
    const plate = {
      specimens,
      draw () {
        if (background) radiolaria.backdrop(p, { palette: value(rest.palette ?? 'haeckel', 0), grain, vignette })
        else p.clear()
        specimens.forEach((s) => s.draw())
      },
      set (o) { specimens.forEach((s) => s.set(o)); return plate },
      grow () { specimens.forEach((s) => s.grow()); return plate },
      reseed () { specimens.forEach((s) => s.reseed()); return plate }
    }
    if (draw) p.draw = plate.draw
    return plate
  }

  radiolaria.forms = Object.keys(forms)
  radiolaria.palettes = palettes
  radiolaria.defaults = (form) => ({ ...common, ...(forms[form] || forms.bush).defaults, form: forms[form] ? form : 'bush' })
  radiolaria.Specimen = Specimen

  window.radiolaria = radiolaria
}
