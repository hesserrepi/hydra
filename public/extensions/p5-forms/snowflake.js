// snowflake: p5.js snow crystals that grow the way real ones do, after Wilson
// "Snowflake" Bentley's photomicrographs (1885-1931): hexagonal plates with
// engraved ridges, sectored plates, broad and fern-like dendrites, and plates
// that sprout feathery arms when the weather changes on their way down.
//
//   p5 = new P5()
//   p5.hide()
//   s0.init({ src: p5.canvas })
//   snowflake.plate(p5)                     // nine crystals like Bentley's page, sets p5.draw
//   src(s0).out()
//
//   const f = snowflake(p5, { habit: 'fern', life: 'cycle' })
//   p5.draw = () => { snowflake.backdrop(p5); f.draw() }
//
// Each crystal is grown by a simulation of vapour diffusing onto a hexagonal
// lattice (Gravner & Griffeath's snowflake model), computed a little every
// frame. The water vapour around it is the "weather": change it while the
// crystal grows, with a function of time or a climate, and the crystal records
// the change, just as every arm of a real snowflake records the clouds it fell
// through. Thickness becomes brightness, the growth front leaves engraved
// rings, and light rakes across the relief.
//
// habits (the weather a crystal grows in)
//   'bentley'   a random life story from the seed: starts as a plate or a star and
//               changes habit two or three times as it grows (default)
//   'plate'     solid hexagonal plate with ribs to the corners
//   'sectored'  plate divided into six ribbed sectors
//   'broad'     six broad arms with stubby plate-like branches
//   'stellar'   stellar dendrite: arms with flat side branches
//   'dendrite'  ragged dendrite with many side branches
//   'fern'      fern-like arms, dense feathery side branches
//   'feather'   long arms full of fine needles
//   'needle'    delicate open skeleton of thin needles
//   'thick'     heavy arms with blunt branches
//
// options for every habit (defaults)
//   x, y        centre, as a fraction of the canvas              0.5, 0.5
//   size        radius, as a fraction of the shorter side        0.42
//   rotation    in radians                                       0
//   spin        turning speed, radians per second                0
//   seed        which variation                                  1
//   life        'grow', 'cycle' or 'still'                       'grow'
//   grow        seconds to grow up                               14
//   cycle       seconds of one life in 'cycle' (then it sublimes
//               from the edges and a new crystal grows)          40
//   delay       seconds before growing starts                    0
//   growth      0-1, overrides life (e.g. a slider or the audio)
//   speed       how fast time runs for this crystal              1
//   climate     habits in the order the crystal meets them, e.g.
//               ['plate', 'fern'] or [{ habit: 'plate' }, { habit: 'stellar', at: 0.4 }]
//               (at: fraction of the radius where it starts); overrides habit
//   fold        6, or 3 for a trigonal crystal                   6
//   trigonal    fold 3: how unequal the two sets of faces grow   0.6
//   twin        0-1, a second crystal turned 30 degrees on top
//               (twelve-branched snowflakes)                     0
//   resolution  lattice cells from centre to tip; more = finer
//               but slower to compute (restarts the crystal)     120
//   budget      milliseconds of simulation per frame, shared by
//               every crystal on the canvas                      8
//   palette     'bentley', 'frost', 'cyanotype', 'gilded', 'ink', 'neon',
//               or an object with any of the keys of snowflake.palettes.bentley
//   relief      strength of the raking light on the relief       1
//   light       direction the light comes from, radians          -2.2 (top left)
//   rim         bright rim along the edges                       1
//   rings       engraved lines left by the growth front          0.6
//   ringCount   how many of them                                 9
//   contrast    how much thickness shows as brightness           1
//   glow        halo around the crystal (0 = off, faster)        1
//   opacity     0-1                                              1
//
// the weather itself (every habit sets these; given here they override it)
//   rho         water vapour around the crystal                  ~0.35-0.8
//   beta        how hard it is for tips to grow (anisotropy)     ~1-2
//   alpha       how easily concave spots fill in                 ~0.15-0.4
//   theta       ... while the vapour there is below this         ~0.03-0.12
//   kappa       share of vapour that freezes at once             ~0.001-0.05
//   mu          quasi-liquid layer melting back to vapour        ~0.015-0.14
//   gamma       ice melting back to vapour                       ~0.0001
//   noise       random fluctuation of the vapour (still symmetric) 0
// These are read every frame, so a function of time changes the weather while
// the crystal grows, e.g. { rho: (t) => t < 6 ? 0.35 : 0.65 } grows a plate
// that sprouts ferns. Changing seed, habit, climate, fold or resolution grows
// a new crystal.
//
// flake methods
//   draw()           draw it on the p5 canvas (call from p5.draw)
//   set(options)     change options
//   grow()           start growing again from nothing (the crystal is kept)
//   reseed(seed)     a new variation (random when seed is left out), regrown
//
// snowflake.plate(p5, options) lays out several crystals like the page of a
// book and, unless draw: false, sets p5.draw. Options: habits (names or option
// objects, default nine), cols, rows, seed, background (false = transparent,
// for layering in hydra), stagger (seconds between crystals starting to grow),
// plus any flake option for all of them. It returns { flakes, draw, set, grow, reseed }.
//
// snowflake.snowfall(p5, options) lets small grown crystals fall, tumble and
// drift. Options: count 60, kinds (distinct crystals, 6), habits, size 0.05
// (of the shorter side), depth 1 (how much size and brightness vary), speed 1,
// wind 0.2, sway 1, seed, palette, glow, background, draw. Every option may be
// a function of time. It returns { draw, set, reseed }.
//
// snowflake.backdrop(p5, { palette, grain, vignette }) paints Bentley's black
// velvet. snowflake.habits lists the habit names.

{
  const TAU = Math.PI * 2
  const SQ3 = Math.sqrt(3) / 2
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

  // seeded randomness
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

  // ------------------------------------------------------------------ weather

  const PARAMS = ['rho', 'beta', 'alpha', 'theta', 'kappa', 'mu', 'gamma']
  const habits = {
    plate: { rho: 0.35, beta: 1.5, alpha: 0.3, theta: 0.12, kappa: 0.005, mu: 0.12, gamma: 0.0001 },
    sectored: { rho: 0.35, beta: 1.3, alpha: 0.15, theta: 0.08, kappa: 0.005, mu: 0.03, gamma: 0.0001 },
    broad: { rho: 0.42, beta: 1.3, alpha: 0.3, theta: 0.12, kappa: 0.005, mu: 0.12, gamma: 0.0001 },
    stellar: { rho: 0.42, beta: 1.15, alpha: 0.3, theta: 0.12, kappa: 0.005, mu: 0.12, gamma: 0.0001 },
    dendrite: { rho: 0.5, beta: 1.3, alpha: 0.2, theta: 0.025, kappa: 0.003, mu: 0.07, gamma: 0.0001 },
    fern: { rho: 0.65, beta: 1.6, alpha: 0.2, theta: 0.025, kappa: 0.0025, mu: 0.015, gamma: 0.0001 },
    feather: { rho: 0.8, beta: 1.6, alpha: 0.2, theta: 0.025, kappa: 0.0025, mu: 0.015, gamma: 0.0001 },
    needle: { rho: 0.42, beta: 1.0, alpha: 0.3, theta: 0.12, kappa: 0.005, mu: 0.12, gamma: 0.0001 },
    thick: { rho: 0.4, beta: 2.0, alpha: 0.2, theta: 0.025, kappa: 0.05, mu: 0.015, gamma: 0.0001 }
  }

  // a life story for 'bentley': where the crystal starts, and what it meets on the way down
  const starts = ['plate', 'plate', 'sectored', 'broad', 'stellar', 'plate', 'dendrite']
  const later = ['fern', 'stellar', 'dendrite', 'broad', 'sectored', 'feather', 'plate', 'thick', 'needle', 'fern', 'stellar']
  function randomClimate (seed) {
    const r = rng(seed, 77)
    const phases = [{ habit: starts[Math.floor(r() * starts.length)], at: 0 }]
    const n = 1 + Math.floor(r() * 3)
    let at = 0.12 + r() * 0.22
    for (let i = 0; i < n && at < 0.85; i++) {
      let habit
      do habit = later[Math.floor(r() * later.length)]
      while (habit === phases[phases.length - 1].habit)
      phases.push({ habit, at })
      at += 0.15 + r() * 0.3
    }
    return phases
  }

  // the habit or climate as a list of phases with their weather, varied a little by the seed
  function makeClimate (o) {
    let list = o.climate
    if (!list || !list.length) {
      if (o.habit === 'bentley' || !habits[o.habit]) {
        if (o.habit !== 'bentley' && typeof o.habit === 'string') throw new Error(`snowflake: unknown habit '${o.habit}', use one of ${Object.keys(habits).join(', ')} or bentley`)
        list = randomClimate(o.seed)
      } else list = [{ habit: o.habit }]
    }
    const r = rng(o.seed, 5)
    return list.map((entry, i) => {
      const e = typeof entry === 'string' ? { habit: entry } : entry
      const base = habits[e.habit] || habits.plate
      const w = { ...base, ...e }
      w.rho *= 1 + (r() - 0.5) * 0.06
      w.beta *= 1 + (r() - 0.5) * 0.08
      w.at = e.at ?? (i === 0 ? 0 : i / list.length)
      return w
    }).sort((a, b) => a.at - b.at)
  }

  // ---------------------------------------------------------------- lattices

  // A hexagonal lattice in axial coordinates (q, r) stored in an N x N array.
  // Snowflakes are symmetric, so only one cell of every orbit under the
  // symmetry group is simulated (1/12 of them for six-fold crystals) and the
  // full picture reads its values through `map`.
  const lattices = new Map()
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
  function lattice (R, fold) {
    const key = R + ':' + fold
    if (lattices.has(key)) return lattices.get(key)
    const N = 2 * R + 1
    const M = N * N
    const idx = (q, r) => (r + R) * N + (q + R)
    const inside = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= R - 2
    const images = (q, r) => {
      const out = []
      let p = [q, -q - r, r]
      for (let k = 0; k < 6; k++) {
        if (fold === 6 || k % 2 === 0) out.push(idx(p[0], p[2]), idx(p[2], p[0]))
        p = [-p[2], -p[0], -p[1]] // 60 degrees
      }
      return out
    }
    const canon = new Int32Array(M).fill(-1)
    for (let r = -R; r <= R; r++) {
      for (let q = -R; q <= R; q++) {
        if (inside(q, r)) canon[idx(q, r)] = Math.min(...images(q, r))
      }
    }
    const id = new Int32Array(M).fill(-1)
    const cells = []
    for (let i = 0; i < M; i++) if (canon[i] === i) { id[i] = cells.length; cells.push(i) }
    const K = cells.length
    const ring = new Uint16Array(K)
    const angle = new Float32Array(K)
    const nb = new Int32Array(K * 6)
    for (let k = 0; k < K; k++) {
      const i = cells[k]
      const q = i % N - R
      const r = Math.floor(i / N) - R
      ring[k] = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
      angle[k] = Math.atan2(r * SQ3, q + r / 2)
      for (let j = 0; j < 6; j++) {
        const qq = q + DIRS[j][0]
        const rr = r + DIRS[j][1]
        nb[k * 6 + j] = inside(qq, rr) ? id[canon[idx(qq, rr)]] : K // K: the vapour far away
      }
    }
    const map = new Int32Array(M).fill(-1)
    for (let i = 0; i < M; i++) if (canon[i] >= 0) map[i] = id[canon[i]]
    // cells sorted by ring, so a step only visits the cells near the crystal
    const order = Int32Array.from({ length: K }, (_, k) => k).sort((u, v) => ring[u] - ring[v])
    const ringEnd = new Int32Array(R + 2)
    for (let o = 0, r = 0; r <= R + 1; r++) {
      while (o < K && ring[order[o]] <= r) o++
      ringEnd[r] = o
    }
    const L = { R, N, K, fold, nb, map, ring, angle, order, ringEnd, center: id[canon[idx(0, 0)]] }
    lattices.set(key, L)
    return L
  }

  // ------------------------------------------------------------- simulation

  // Gravner & Griffeath, "Modeling snow crystal growth: a three-dimensional
  // mesoscopic approach" (2009), on a single layer: diffusion, freezing,
  // attachment, melting.
  class Crystal {
    constructor (R, fold, climate, seed, trigonal = 0) {
      const L = this.L = lattice(R, fold)
      const K = L.K
      this.climate = climate
      this.a = new Uint8Array(K + 1)
      this.b = new Float32Array(K + 1)
      this.c = new Float32Array(K + 1)
      this.d = new Float32Array(K + 1)
      this.d2 = new Float32Array(K + 1)
      this.t = new Float32Array(K + 1).fill(-1)
      this.attach = new Int32Array(K)
      this.aniso = new Float32Array(K + 1).fill(1)
      // sin(3 angle) is unchanged by the 3-fold group, so three arms grow faster than the other three
      if (fold === 3) for (let k = 0; k < K; k++) this.aniso[k] = 1 - trigonal * Math.sin(3 * L.angle[k])
      this.rho = climate[0].rho
      this.d.fill(this.rho)
      this.a[L.center] = 1
      this.c[L.center] = 1
      this.t[L.center] = 0
      this.step = 0
      this.radius = 1
      this.limit = R - 6
      this.maxSteps = 60000
      this.stepAt = new Float32Array(R + 2).fill(-1) // first step at which each ring was reached
      this.stepAt[0] = 0
      this.stepAt[1] = 0
      this.filled = new Int32Array(R + 2) // attached cells per ring
      this.filled[0] = 1
      this.solid = 0 // rings up to here are all ice
      this.done = false
      this.random = mulberry(hash(seed, 3))
      this.version = 0
      this.lo = 0.9
      this.hi = 1.1
    }


    // the weather at the current radius, with the user's overrides
    weather (over) {
      const f = this.radius / this.limit
      let w = this.climate[0]
      for (const phase of this.climate) if (phase.at <= f) w = phase
      const out = {}
      for (const key of PARAMS) out[key] = over[key] ?? w[key]
      out.noise = over.noise ?? w.noise ?? 0
      return out
    }

    run (ms, over) {
      if (this.done) return
      const L = this.L
      const { K, nb, order, ringEnd, ring } = L
      const { a, b, c, d, d2, t, attach, aniso } = this
      const start = performance.now()
      let n = 0
      while (!this.done) {
        if ((++n & 7) === 0 && performance.now() - start > ms) break
        const P = this.weather(over)
        // more or less vapour everywhere when the weather changes
        if (P.rho !== this.rho) {
          const delta = P.rho - this.rho
          for (let i = 0; i < K; i++) if (!a[i]) d[i] = Math.max(0, d[i] + delta)
          this.rho = P.rho
        }
        d[K] = this.rho
        const end = ringEnd[Math.min(L.R + 1, this.radius + 30)]
        // rings that are solid ice don't change any more (plates fill in from the centre)
        while (this.solid < this.radius && this.filled[this.solid + 1] === ringEnd[this.solid + 1] - ringEnd[this.solid]) this.solid++
        const begin = this.solid > 1 ? ringEnd[this.solid - 2] : 0
        const step = ++this.step
        // diffusion; attached neighbours reflect
        for (let o = begin; o < end; o++) {
          const i = order[o]
          if (a[i]) continue
          const di = d[i]
          const base = i * 6
          let s = di
          for (let k = 0; k < 6; k++) { const j = nb[base + k]; s += a[j] ? di : d[j] }
          d2[i] = s / 7
        }
        const noise = P.noise
        for (let o = begin; o < end; o++) {
          const i = order[o]
          if (a[i]) continue
          d[i] = noise ? d2[i] * (1 + noise * (this.random() * 2 - 1)) : d2[i]
        }
        // freezing, attachment and melting at the boundary
        let na = 0
        const { beta, alpha, theta, kappa, mu, gamma } = P
        for (let o = begin; o < end; o++) {
          const i = order[o]
          if (a[i]) continue
          const base = i * 6
          const m = a[nb[base]] + a[nb[base + 1]] + a[nb[base + 2]] + a[nb[base + 3]] + a[nb[base + 4]] + a[nb[base + 5]]
          if (!m) continue
          const di = d[i]
          b[i] += (1 - kappa) * di
          c[i] += kappa * di
          d[i] = 0
          let ok
          if (m <= 2) ok = b[i] >= beta
          else if (m === 3) {
            ok = b[i] >= aniso[i] || (b[i] >= alpha * aniso[i] &&
              d[nb[base]] + d[nb[base + 1]] + d[nb[base + 2]] + d[nb[base + 3]] + d[nb[base + 4]] + d[nb[base + 5]] < theta)
          } else ok = true
          if (ok) attach[na++] = i
          else {
            d[i] += mu * b[i] + gamma * c[i]
            b[i] *= 1 - mu
            c[i] *= 1 - gamma
          }
        }
        for (let k = 0; k < na; k++) {
          const i = attach[k]
          a[i] = 1
          c[i] += b[i]
          b[i] = 0
          t[i] = step
          this.filled[ring[i]]++
          if (ring[i] > this.radius) {
            for (let r = this.radius + 1; r <= ring[i]; r++) this.stepAt[r] = step
            this.radius = ring[i]
          }
        }
        if (this.radius >= this.limit || step >= this.maxSteps) {
          this.done = true
          this.limit = this.radius
        }
      }
      this.normalise()
      this.version++
    }

    // range of thickness to show as brightness
    normalise () {
      const { a, c } = this
      let s = 0
      let s2 = 0
      let n = 0
      for (let i = 0; i < this.L.K; i++) {
        if (!a[i]) continue
        s += c[i]
        s2 += c[i] * c[i]
        n++
      }
      if (n < 4) return
      const mean = s / n
      const sd = Math.sqrt(Math.max(1e-8, s2 / n - mean * mean))
      this.lo = mean - 1.6 * sd
      this.hi = mean + 1.6 * sd
    }

    // the step to show for growth g (0-1), as the radius grows evenly
    stepFor (g) {
      if (g >= 1 && this.done) return this.step
      const target = g * this.limit
      if (target >= this.radius) return this.step
      const r0 = Math.floor(target)
      const s0 = this.stepAt[r0]
      const s1 = this.stepAt[r0 + 1]
      return s0 + (s1 - s0) * (target - r0)
    }
  }

  // crystals that don't depend on time are shared (plates, snowfall, regrowing)
  const crystals = new Map()
  function crystalFor (key, make) {
    if (key && crystals.has(key)) {
      const c = crystals.get(key)
      crystals.delete(key)
      crystals.set(key, c)
      return c
    }
    const c = make()
    if (key) {
      crystals.set(key, c)
      if (crystals.size > 40) crystals.delete(crystals.keys().next().value)
    }
    return c
  }

  // simulation time is shared by every crystal on a canvas, frame by frame
  const frames = new WeakMap()
  const budgetLeft = (p, budget) => {
    let f = frames.get(p)
    if (!f || f.frame !== p.frameCount) { f = { frame: p.frameCount, used: 0 }; frames.set(p, f) }
    return { f, left: budget - f.used }
  }

  // ---------------------------------------------------------------- palettes

  const palettes = {
    bentley: { bg: '#0e1011', deep: '#30373b', ice: '#b9c2c5', bright: '#fbfcf8', glow: 'rgba(215, 228, 235, 0.55)' },
    frost: { bg: '#081627', deep: '#163f66', ice: '#8ec8ee', bright: '#f1fbff', glow: 'rgba(120, 190, 255, 0.6)' },
    cyanotype: { bg: '#0c2742', deep: '#24527d', ice: '#b8d3e8', bright: '#ffffff', glow: 'rgba(170, 210, 255, 0.45)' },
    gilded: { bg: '#110d09', deep: '#5c3d14', ice: '#d3ad62', bright: '#fff4cf', glow: 'rgba(255, 185, 80, 0.45)' },
    ink: { bg: '#efe8d8', deep: '#b3ab9a', ice: '#4a4640', bright: '#0f0e0c', glow: 'rgba(0, 0, 0, 0)' },
    neon: { bg: '#05020c', deep: '#3b0a5e', ice: '#ff4fd8', bright: '#8ffcff', glow: 'rgba(255, 80, 220, 0.6)' }
  }
  const getPalette = (p) => (typeof p === 'string' ? palettes[p] || palettes.bentley : { ...palettes.bentley, ...p })

  const parseColor = (() => {
    let ctx
    return (css) => {
      if (!ctx) ctx = document.createElement('canvas').getContext('2d')
      ctx.fillStyle = '#000'
      ctx.fillStyle = css
      const s = ctx.fillStyle
      if (s[0] === '#') return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
      return s.match(/[\d.]+/g).slice(0, 3).map(Number)
    }
  })()

  // 256 colours from deep through ice to bright, packed for a Uint32 ImageData view
  const luts = new Map()
  function lut (pal) {
    const key = pal.deep + pal.ice + pal.bright
    if (luts.has(key)) return luts.get(key)
    const [d, i, b] = [pal.deep, pal.ice, pal.bright].map(parseColor)
    const out = new Uint32Array(256)
    for (let k = 0; k < 256; k++) {
      const v = k / 255
      const [from, to, u] = v < 0.55 ? [d, i, v / 0.55] : [i, b, (v - 0.55) / 0.45]
      const e = u * u * (3 - 2 * u)
      const ch = (n) => Math.round(from[n] + (to[n] - from[n]) * e)
      out[k] = (255 << 24 | ch(2) << 16 | ch(1) << 8 | ch(0)) >>> 0
    }
    luts.set(key, out)
    return out
  }

  // ---------------------------------------------------------------- painting

  // neighbour offsets in the N x N array and their directions on screen
  const OFF_DIRS = DIRS.map(([q, r]) => [q + r / 2, r * SQ3])

  // Paints the crystal as it was at `upTo` steps into an N x N image (one
  // pixel per lattice cell); drawing it with a skew turns it back into hexagons.
  function paint (cr, img, upTo, o, lightAngle) {
    const { N, K, map } = cr.L
    const { a, c, t } = cr
    const pal = getPalette(o.palette)
    const colors = lut(pal)
    const H = paint.H && paint.H.length >= K + 1 ? paint.H : (paint.H = new Float32Array(K + 1))
    const fade = Math.max(1, (cr.step / Math.max(1, cr.radius)) * 1.5)
    const ringStep = Math.max(1, upTo / Math.max(1, o.ringCount))
    const span = 1 / Math.max(1e-6, cr.hi - cr.lo)
    // height of every simulated cell: thickness, minus a groove where the growth front left a ring
    for (let k = 0; k < K; k++) {
      if (!a[k] || t[k] > upTo) { H[k] = -1; continue }
      H[k] = clamp01((c[k] - cr.lo) * span)
    }
    H[K] = -1
    const lx = Math.cos(lightAngle)
    const ly = Math.sin(lightAngle)
    const data = img.data32
    const offs = [1, -1, N, -N, 1 - N, N - 1]
    const relief = o.relief * 0.55
    const contrast = o.contrast
    const rim = o.rim
    const rings = o.rings
    const opacity = clamp01(o.opacity)
    for (let i = 0; i < N * N; i++) {
      const k = map[i]
      if (k < 0 || H[k] < 0) { data[i] = 0; continue }
      const h = H[k]
      let gx = 0
      let gy = 0
      let open = 0
      let groove = 0
      const band = Math.floor(t[k] / ringStep)
      for (let j = 0; j < 6; j++) {
        const kk = map[i + offs[j]]
        let hn
        if (kk < 0 || H[kk] < 0) { hn = -0.7; open++ } else {
          hn = H[kk]
          if (rings && Math.floor(t[kk] / ringStep) < band) groove = 1
        }
        gx += hn * OFF_DIRS[j][0]
        gy += hn * OFF_DIRS[j][1]
      }
      // light falls on slopes that face it
      const lit = -(gx * lx + gy * ly) / 3
      let v = 0.5 + (h - 0.5) * 0.6 * contrast + lit * relief
      if (open) v += 0.22 * rim + 0.05 * open * rim
      if (groove) v -= 0.22 * rings
      v = v < 0 ? 0 : v > 1 ? 1 : v
      // the newest cells fade in, so growth is smooth
      const alpha = clamp01((upTo - t[k]) / fade + 0.35) * opacity
      const col = colors[(v * 255) | 0]
      if (alpha >= 1) data[i] = col
      else {
        // premultiply is done by the canvas; just set alpha
        data[i] = ((Math.round(alpha * 255) << 24) | (col & 0xffffff)) >>> 0
      }
    }
    img.ctx.putImageData(img.image, 0, 0)
  }

  function makeImage (N) {
    const canvas = document.createElement('canvas')
    canvas.width = N
    canvas.height = N
    const ctx = canvas.getContext('2d')
    const image = ctx.createImageData(N, N)
    return { canvas, ctx, image, data32: new Uint32Array(image.data.buffer) }
  }

  // draw the N x N image so that each pixel lands on its hexagonal cell; radius R -> S pixels
  function drawCrystal (ctx, img, R, S, glow, pal, pd) {
    const k = S / R
    ctx.save()
    ctx.scale(k, k)
    ctx.transform(1, 0, 0.5, SQ3, -1.5 * R, -SQ3 * R)
    ctx.imageSmoothingEnabled = true
    if (glow > 0) {
      ctx.shadowColor = pal.glow
      ctx.shadowBlur = Math.min(60, S * 0.06 * glow) * pd
    }
    ctx.drawImage(img.canvas, -0.5, -0.5)
    ctx.restore()
  }

  // ---------------------------------------------------------------- flakes

  const common = {
    habit: 'bentley',
    climate: undefined,
    x: 0.5,
    y: 0.5,
    size: 0.42,
    rotation: 0,
    spin: 0,
    seed: 1,
    life: 'grow',
    grow: 14,
    cycle: 40,
    delay: 0,
    growth: undefined,
    fold: 6,
    trigonal: 0.6,
    twin: 0,
    resolution: 120,
    budget: 8,
    palette: 'bentley',
    relief: 1,
    light: -2.2,
    rim: 1,
    rings: 0.6,
    ringCount: 9,
    contrast: 1,
    glow: 1,
    opacity: 1
  }

  const isP5 = (v) => v && typeof v.ellipse === 'function' && typeof v.millis === 'function'
  const resolveP5 = (p) => {
    if (isP5(p)) return p
    if (isP5(window.p5)) return window.p5
    throw new Error('snowflake: pass a p5 instance, e.g. p5 = new P5(); snowflake(p5, { ... })')
  }
  const value = (v, t) => (typeof v === 'function' ? v(t) : v)

  class Flake {
    constructor (p, options = {}) {
      this.p = p
      this.options = { ...options }
      this.age = 0
      this.last = undefined
      this.growth = 0
      this.crystal = null
      this.key = ''
      this.img = null
      this.painted = ''
    }

    set (options = {}) { Object.assign(this.options, options); return this }
    grow () { this.age = 0; return this }
    reseed (seed = Math.floor(Math.random() * 1e6)) { this.options.seed = seed; return this.grow() }

    resolve (t) {
      const raw = { ...common, ...this.options }
      const o = {}
      for (const key in raw) o[key] = key === 'climate' ? raw[key] : value(raw[key], t)
      if (typeof o.climate === 'function') o.climate = o.climate(t)
      for (const key of [...PARAMS, 'noise']) if (o[key] !== undefined) o[key] = Number(o[key])
      return o
    }

    // the crystal for these options, made when seed, habit, climate, fold or resolution change
    crystalFor (o, seed) {
      const R = Math.max(16, Math.min(400, Math.round(o.resolution)))
      const fold = Number(o.fold) === 3 ? 3 : 6
      const trigonal = fold === 3 ? Math.round(clamp01(o.trigonal) * 50) / 100 : 0
      const climate = makeClimate({ ...o, seed })
      const live = PARAMS.some((k) => typeof this.options[k] === 'function') || typeof this.options.noise === 'function'
      const fixed = {}
      for (const k of [...PARAMS, 'noise']) if (o[k] !== undefined) fixed[k] = o[k]
      // live weather can't be shared: it depends on when this crystal grew
      const key = JSON.stringify([R, fold, trigonal, seed, climate, live ? 'live' : fixed])
      if (this.crystal && key === this.key) return this.crystal
      this.key = key
      this.crystal = crystalFor(live ? null : key, () => new Crystal(R, fold, climate, seed, trigonal))
      return this.crystal
    }

    draw () {
      const p = this.p
      const ctx = p.drawingContext
      if (!ctx || typeof ctx.drawImage !== 'function' || !('shadowBlur' in ctx)) throw new Error('snowflake: needs a 2D p5 canvas (not WEBGL)')
      const now = p.millis() / 1000
      const dt = this.last === undefined ? 0 : Math.min(0.25, Math.max(0, now - this.last))
      this.last = now
      const speed = value(this.options.speed ?? 1, this.age)
      this.age += dt * speed
      const t = this.age
      const o = this.resolve(t)
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

      const cr = this.crystalFor(o, seed)
      // grow the simulation ahead of what is shown
      if (!cr.done && g > 0) {
        const over = {}
        for (const k of [...PARAMS, 'noise']) if (o[k] !== undefined) over[k] = o[k]
        const { f, left } = budgetLeft(p, o.budget)
        if (left > 0.5 || cr.step === 0) {
          const t0 = performance.now()
          cr.run(Math.max(0.5, left), over)
          f.used += performance.now() - t0
        }
      }
      if (g <= 0) return this

      const upTo = cr.stepFor(g)
      const angle = o.rotation + o.spin * t
      const lightAngle = o.light - angle
      const pal = getPalette(o.palette)
      const N = cr.L.N
      if (!this.img || this.img.canvas.width !== N) { this.img = makeImage(N); this.painted = '' }
      const look = [cr.version, Math.round(upTo * 4), Math.round(lightAngle * 50), o.palette && JSON.stringify(o.palette),
        o.relief, o.rim, o.rings, o.ringCount, o.contrast, o.opacity, this.key].join('|')
      if (look !== this.painted) {
        paint(cr, this.img, upTo, o, lightAngle)
        this.painted = look
      }

      const S = o.size * Math.min(p.width, p.height)
      const pd = typeof p.pixelDensity === 'function' ? p.pixelDensity() : 1
      ctx.save()
      ctx.translate(o.x * p.width, o.y * p.height)
      ctx.rotate(angle)
      // a fold-3 crystal's long arms point up and to the sides
      if (cr.L.fold === 3) ctx.rotate(Math.PI / 6)
      if (o.twin > 0) {
        ctx.save()
        ctx.rotate(Math.PI / 6)
        ctx.globalAlpha = clamp01(o.twin) * 0.85
        drawCrystal(ctx, this.img, cr.L.R, S * (0.7 + 0.25 * clamp01(o.twin)), o.glow, pal, pd)
        ctx.restore()
      }
      drawCrystal(ctx, this.img, cr.L.R, S, o.glow, pal, pd)
      ctx.restore()
      return this
    }
  }

  function snowflake (p, options) {
    if (!isP5(p) && options === undefined) { options = p; p = undefined }
    return new Flake(resolveP5(p), options)
  }

  // ---------------------------------------------------------------- backdrop

  let grain
  const grainPattern = (ctx) => {
    if (!grain) {
      const c = document.createElement('canvas')
      c.width = c.height = 128
      const g = c.getContext('2d')
      const img = g.createImageData(128, 128)
      const r = mulberry(7)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = r() * 255
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = 10
      }
      g.putImageData(img, 0, 0)
      grain = c
    }
    return ctx.createPattern(grain, 'repeat')
  }

  snowflake.backdrop = (p, { palette = 'bentley', grain = 1, vignette = 1 } = {}) => {
    p = resolveP5(p)
    const pal = getPalette(palette)
    const ctx = p.drawingContext
    const w = p.width
    const h = p.height
    ctx.save()
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    if (vignette > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.75)
      g.addColorStop(0, 'rgba(0, 0, 0, 0)')
      g.addColorStop(1, `rgba(0, 0, 0, ${0.45 * vignette})`)
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

  // ---------------------------------------------------------------- plate

  snowflake.plate = (p, options) => {
    if (!isP5(p) && options === undefined) { options = p; p = undefined }
    p = resolveP5(p)
    const {
      habits: list = [
        { climate: ['sectored', { habit: 'plate', at: 0.6 }], fold: 3 },
        { climate: ['plate', { habit: 'broad', at: 0.3 }] },
        { climate: ['plate', { habit: 'stellar', at: 0.3 }, { habit: 'dendrite', at: 0.7 }] },
        { climate: ['plate', { habit: 'needle', at: 0.3 }] },
        { climate: ['plate', { habit: 'fern', at: 0.25 }, { habit: 'dendrite', at: 0.7 }] },
        { climate: ['sectored', { habit: 'plate', at: 0.5 }] },
        { habit: 'stellar', twin: 0.8 },
        { climate: ['broad', { habit: 'fern', at: 0.6 }] },
        { climate: ['plate', { habit: 'fern', at: 0.2 }] }
      ],
      cols, rows, seed = 1, background = true, draw = true, stagger = 1.2, grain = 1, vignette = 1,
      ...rest
    } = options || {}
    const n = list.length
    const c = cols || Math.max(1, Math.round(Math.sqrt(n * p.width / p.height)))
    const r = rows || Math.ceil(n / c)
    const m = Math.min(p.width, p.height)
    const cell = Math.min(p.width / c, p.height / r) / m
    const flakes = list.map((entry, i) => {
      const spec = typeof entry === 'string' ? { habit: entry } : entry
      const j = rng(seed, 1000, i)
      return new Flake(p, {
        x: (i % c + 0.5 + (j() - 0.5) * 0.06) / c,
        y: (Math.floor(i / c) + 0.5 + (j() - 0.5) * 0.06) / r,
        size: cell * 0.46,
        rotation: (j() - 0.5) * 0.25,
        seed: seed + i * 17,
        delay: i * stagger,
        resolution: 90,
        ...rest,
        ...spec
      })
    })
    const plate = {
      flakes,
      draw () {
        if (background) snowflake.backdrop(p, { palette: value(rest.palette ?? 'bentley', 0), grain, vignette })
        else p.clear()
        flakes.forEach((f) => f.draw())
      },
      set (o) { flakes.forEach((f) => f.set(o)); return plate },
      grow () { flakes.forEach((f) => f.grow()); return plate },
      reseed () { flakes.forEach((f) => f.reseed()); return plate }
    }
    if (draw) p.draw = plate.draw
    return plate
  }

  // ---------------------------------------------------------------- snowfall

  snowflake.snowfall = (p, options) => {
    if (!isP5(p) && options === undefined) { options = p; p = undefined }
    p = resolveP5(p)
    const opts = {
      count: 60, kinds: 6, habits: undefined, size: 0.05, depth: 1, speed: 1, wind: 0.2, sway: 1,
      seed: 1, palette: 'bentley', glow: 1, background: true, draw: true, resolution: 60, ...options
    }
    let kinds = []
    let flakes = []
    let kindKey = ''
    let last
    let age = 0
    const setup = (o) => {
      const key = JSON.stringify([o.kinds, o.habits, o.seed, o.resolution, o.palette])
      if (key !== kindKey) {
        kindKey = key
        // each kind is a full crystal grown once, then drawn as a sprite
        kinds = Array.from({ length: Math.max(1, Math.round(o.kinds)) }, (_, i) => {
          const h = o.habits ? o.habits[i % o.habits.length] : 'bentley'
          return new Flake(p, {
            ...(typeof h === 'string' ? { habit: h } : h),
            seed: o.seed * 31 + i * 7,
            resolution: o.resolution,
            palette: o.palette,
            life: 'still',
            glow: 0,
            rings: 0.4,
            x: -10, // grown and painted off screen
            size: 0.01
          })
        })
      }
      const n = Math.max(0, Math.round(o.count))
      const r = rng(o.seed, 9)
      while (flakes.length < n) {
        const z = r()
        flakes.push({ x: r(), y: r() * 1.2 - 0.1, z, kind: Math.floor(r() * 1e6), rot: r() * TAU, spin: (r() - 0.5) * 1.2, phase: r() * TAU, tumble: r() * 0.8 })
      }
      flakes.length = n
    }
    const fall = {
      draw () {
        const now = p.millis() / 1000
        const dt = last === undefined ? 0 : Math.min(0.1, Math.max(0, now - last))
        last = now
        age += dt
        const o = {}
        for (const k in opts) o[k] = k === 'habits' ? opts[k] : value(opts[k], age)
        setup(o)
        if (o.background) snowflake.backdrop(p, { palette: o.palette })
        else p.clear()
        kinds.forEach((k) => k.draw()) // grows them (off screen) until done
        const ctx = p.drawingContext
        const pal = getPalette(o.palette)
        const m = Math.min(p.width, p.height)
        const pd = typeof p.pixelDensity === 'function' ? p.pixelDensity() : 1
        // far flakes first
        const sorted = flakes.slice().sort((a, b) => a.z - b.z)
        for (const f of sorted) {
          const near = 1 - o.depth * (1 - (0.35 + 0.65 * f.z))
          const S = o.size * m * near
          f.y += dt * o.speed * (0.04 + 0.08 * near)
          f.x += dt * (o.wind * (0.3 + 0.7 * near) * 0.1 + Math.sin(age * 0.7 + f.phase) * 0.01 * o.sway)
          f.rot += dt * f.spin
          if (f.y > 1 + S / p.height * 1.2) { f.y = -S / p.height * 1.2; f.x = Math.random() }
          f.x = ((f.x % 1.2) + 1.2) % 1.2
          const kind = kinds[f.kind % kinds.length]
          const cr = kind.crystal
          if (!cr || !kind.img || kind.growth <= 0) continue
          ctx.save()
          ctx.translate((f.x - 0.1) * p.width, f.y * p.height)
          ctx.rotate(f.rot)
          // tumbling: the crystal tilts, so it looks narrower one way
          ctx.scale(1, 1 - f.tumble * (0.5 + 0.5 * Math.sin(age * 0.9 + f.phase)) * 0.6)
          ctx.globalAlpha = 0.45 + 0.55 * near
          if (cr.L.fold === 3) ctx.rotate(Math.PI / 6)
          drawCrystal(ctx, kind.img, cr.L.R, S, o.glow * near, pal, pd)
          ctx.restore()
        }
      },
      set (o) { Object.assign(opts, o); return fall },
      reseed (seed = Math.floor(Math.random() * 1e6)) { opts.seed = seed; flakes = []; return fall }
    }
    if (opts.draw) p.draw = fall.draw
    return fall
  }

  snowflake.habits = ['bentley', ...Object.keys(habits)]
  snowflake.weather = habits
  snowflake.palettes = palettes
  snowflake.defaults = (habit = 'bentley') => ({ ...common, ...(habits[habit] || {}), habit })
  snowflake.Flake = Flake

  window.snowflake = snowflake
}
