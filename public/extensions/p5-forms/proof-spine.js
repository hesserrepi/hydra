// proofSpine: a glowing proof tree drawn with p5, for hydra to use as a source.
// A bright, jagged trunk (the proof, step by step) with curved branches in thick
// halos (the lemmas it calls), lemma names on leader lines at the sides, and
// faint dust in the background (the lemmas it never reached).
//
//   p5 = new P5()
//   p5.hide()
//   s0.init({ src: p5.canvas })
//   tree = proofSpine(p5, { mode: 'grow', color: '#d24dff' })
//   p5.draw = () => tree.draw()
//   src(s0).out()
//
//   proofSpine.show(p5, { mode: 'lightning', shape: 'star' })   // the same, sets p5.draw for you
//
// modes (how it is drawn and how it evolves)
//   'grow'       grows from the root: the trunk creeps along, branches unfurl as it
//                passes them, lemma names fade in when their branch is complete
//   'lightning'  strikes: a stepped leader zigzags along the trunk, the whole tree
//                flashes, flickers and dies down; every strike is a new tree
//   'search'     a proof search: a cursor walks the trunk and sends probes down
//                every branch; lemmas that are used light up in their halo and
//                their names type out, dead ends fade; at the end a QED pulse
//                runs back to the root
//   'assemble'   the lemmas drift in out of the dust and settle into place, from
//                the far end towards the root; then the trunk lights up and the
//                goal is proved
//   'sway'       fully grown and alive: branches sway like weed in a current, the
//                halos breathe, and pulses of light run from the branch tips into
//                the trunk and on to the root
//   'still'      fully grown, not moving
//
// shapes (the overall form of the trunk, like the figures of a harmonograph)
//   'spine'         a tall, gently S-shaped column, root at the top (default)
//   'fan'           a short trunk with long branches spreading into a delta
//   'river'         a horizontal meander with tributaries, root on the left
//   'spiral'        the trunk winds outward from the centre
//   'ring'          the trunk runs round a circle, like a wreath
//   'star'          several trunks from a root in the centre (arms)
//   'harmonograph'  the trunk follows a decaying Lissajous figure (f1, f2, damp)
//   or path: (s) => [x, y], your own trunk, s from 0 (root) to 1, x and y in about -0.5..0.5
//
// options (defaults)
//   mode        see above                                            'grow'
//   shape       see above                                            'spine'
//   color       any CSS colour, [r, g, b] (0-255, or 0-1), or a hue
//               number 0-1; everything else is mixed from it         '#d24dff'
//   background  CSS colour; false = transparent (clears every frame);
//               null = draw on top without clearing                  '#050307'
//   x, y        centre, as a fraction of the canvas                  0.5, 0.5
//   size        fraction of the canvas the tree fills                0.92
//   seed        which tree                                           1
//   branches    how many branches                                    320
//   halo        width of the halos (0 = none)                        1
//   glow        glow around the trunk (0 = none)                     1
//   dust        how much dust in the background (0 = none)           1
//   labels      true, false, how many, or an array of names          true (22)
//   goal        the name at the root                                 'mainTheorem'
//   legend      true, false, or an array of lines (bottom left)      true
//   textSize    label size in pixels; default scales with the tree
//   duration    seconds of one run (grow, search, assemble)          14 / 18 / 14
//   hold        seconds it stays finished before it starts again     4
//   period      seconds between lightning strikes                    4
//   afterglow   0-1, how much of a struck tree stays visible         0.12
//   loop        start again when finished                            true
//   vary        a new tree every time it starts again                false (true for lightning)
//   progress    0-1 overrides the clock (a slider, the audio, ...)
//   sway        sway amount; 1 in 'sway' mode, 0 in the others        -
//   speed       how fast time runs for this tree                     1
//   opacity     0-1                                                  1
//   arms        trunks of the 'star' shape                           5
//   turns       turns of the 'spiral' shape                          1.6
//   f1, f2      frequencies of the 'harmonograph' shape              2, 3
//   damp        how fast the 'harmonograph' figure shrinks           0.5
//
// Every option can be a function of time (seconds since the tree started),
// e.g. { color: (t) => [0.5 + 0.5 * Math.sin(t), 0.3, 1] }. Changing shape,
// seed, branches, labels or the shape's numbers makes a new tree.
//
// tree methods and fields
//   draw()          draw it on the p5 canvas (call from p5.draw)
//   set(options)    change options
//   restart()       run the animation again from the beginning
//   reseed(seed)    a new tree (random when seed is left out)
//   progress        how far the current run is, 0-1
//
// proofSpine.modes, proofSpine.shapes and proofSpine.lemmas list the names.

{
  const TAU = Math.PI * 2
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
  const smooth = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x) }
  const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3)
  const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }

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

  const lemmas = [
    'zorn_lemma', 'snakeLemma', 'five_lemma', 'yoneda', 'hahnBanach', 'bolzanoWeierstrass',
    'cauchy_schwarz', 'heineBorel', 'urysohn_metrization', 'tychonoff', 'baire_category',
    'open_mapping', 'closedGraph', 'sylow_exists', 'lagrange_index', 'chineseRemainder',
    'fermat_little', 'quadraticReciprocity', 'dirichlet_density', 'nakayama', 'hensel_lift',
    'krull_dim_le', 'noether_normalization', 'nullstellensatz', 'gauss_lemma', 'eisenstein_crit',
    'jordanHolder', 'schur_lemma', 'burnside_count', 'arzelaAscoli', 'stone_weierstrass',
    'banach_fixed_point', 'liouville_bound', 'residue_sum', 'cauchy_integral', 'mittag_leffler',
    'weierstrass_prod', 'hadamard_three', 'phragmen_lindelof', 'poisson_summation', 'parseval',
    'plancherel', 'dominated_conv', 'fatou_lemma', 'fubini_tonelli', 'radon_nikodym',
    'borel_cantelli', 'kolmogorov_01', 'ergodic_mean', 'hilbert_basis', 'artin_rees'
  ]
  const legendLines = ['trunk = the proof, step by step', 'branches = lemmas it calls', 'dust = lemmas never reached']

  const MODES = {
    grow: { duration: 14, hold: 4, vary: false, sway: 0 },
    lightning: { duration: 4, hold: 0, vary: true, sway: 0 },
    search: { duration: 18, hold: 4, vary: false, sway: 0 },
    assemble: { duration: 14, hold: 4, vary: false, sway: 0 },
    sway: { duration: 14, hold: 0, vary: false, sway: 1 },
    still: { duration: 1, hold: 0, vary: false, sway: 0 }
  }

  const common = {
    mode: 'grow',
    shape: 'spine',
    color: '#d24dff',
    background: '#050307',
    x: 0.5,
    y: 0.5,
    size: 0.92,
    seed: 1,
    branches: 320,
    halo: 1,
    glow: 1,
    dust: 1,
    labels: true,
    goal: 'mainTheorem',
    legend: true,
    textSize: undefined,
    period: 4,
    afterglow: 0.12,
    loop: true,
    speed: 1,
    opacity: 1,
    arms: 5,
    turns: 1.6,
    f1: 2,
    f2: 3,
    damp: 0.5
  }

  // ------------------------------------------------------------------ shapes
  // Each shape gives the trunk curves (s from root 0 to tip 1), how far branches
  // may reach from the trunk (env) and how much they lean down the trunk (lean).

  const SHAPES = {
    spine: (r) => {
      const ph = r() * TAU
      const amp = 0.05 + r() * 0.05
      const f = 1.1 + r() * 0.7
      const lean = (r() - 0.5) * 0.1
      return {
        arms: [(s) => [amp * Math.sin(ph + s * Math.PI * f) - amp * Math.sin(ph) + lean * s, s]],
        env: (s) => 0.03 + 0.27 * smooth(0, 0.45, s) - 0.06 * smooth(0.85, 1, s),
        lean: 0.35,
        reach: 1
      }
    },
    fan: (r) => {
      const ph = r() * TAU
      return {
        arms: [(s) => [0.025 * Math.sin(ph + s * 5), s * 0.6]],
        env: (s) => 0.04 + 0.55 * Math.pow(s, 1.1),
        lean: 0.45,
        reach: 1.35
      }
    },
    river: (r) => {
      const ph = r() * TAU
      const f = 1.5 + r()
      return {
        arms: [(s) => [s * 1.4, 0.09 * Math.sin(ph + s * Math.PI * f) - 0.09 * Math.sin(ph)]],
        env: (s) => 0.07 + 0.12 * smooth(0, 0.5, s),
        lean: 0.25,
        reach: 1
      }
    },
    spiral: (r, o) => {
      const turns = Math.max(0.3, Number(o.turns) || 1.6)
      const a0 = r() * TAU
      return {
        arms: [(s) => { const rad = 0.04 + 0.46 * s; const a = a0 + turns * TAU * s; return [rad * Math.cos(a), rad * Math.sin(a)] }],
        env: (s) => (0.03 + 0.14 * s) / Math.sqrt(turns / 1.6),
        lean: 0.1,
        reach: 1
      }
    },
    ring: (r) => {
      const a0 = -Math.PI / 2 + (r() - 0.5) * 0.5
      const wob = r() * TAU
      return {
        arms: [(s) => { const a = a0 + s * TAU * 0.94; const rad = 0.42 * (1 + 0.04 * Math.sin(3 * a + wob)); return [rad * Math.cos(a), rad * Math.sin(a)] }],
        env: (s) => 0.07 + 0.08 * smooth(0, 0.3, s),
        lean: 0.15,
        reach: 1
      }
    },
    star: (r, o) => {
      const n = Math.max(2, Math.min(12, Math.round(Number(o.arms) || 5)))
      const a0 = r() * TAU
      const arms = []
      for (let k = 0; k < n; k++) {
        const a = a0 + (k / n) * TAU + (r() - 0.5) * 0.3
        const curl = (r() - 0.5) * 0.9
        const len = 0.42 + r() * 0.1
        arms.push((s) => { const b = a + curl * s * s; return [len * s * Math.cos(b), len * s * Math.sin(b)] })
      }
      return { arms, env: (s) => (0.02 + 0.13 * smooth(0, 0.6, s)) * Math.sqrt(5 / n), lean: 0.3, reach: 1 }
    },
    harmonograph: (r, o) => {
      const f1 = Number(o.f1) || 2
      const f2 = Number(o.f2) || 3
      const damp = Math.max(0, Number(o.damp) || 0)
      const p1 = r() * TAU
      const p2 = r() * TAU
      return {
        arms: [(s) => { const t = s * TAU * 1.15; const d = Math.exp(-damp * s * 2); return [0.45 * d * Math.sin(f1 * t + p1), 0.45 * d * Math.sin(f2 * t + p2)] }],
        env: (s) => 0.05 + 0.04 * (1 - s),
        lean: 0.2,
        reach: 1
      }
    }
  }

  // ------------------------------------------------------------------ the tree

  const TRUNK_STEPS = 120

  // sample a curve and give every point a tangent and a normal
  const sampleArm = (curve, n) => {
    const base = []
    for (let i = 0; i <= n; i++) base.push(curve(i / n))
    const len = [0]
    for (let i = 1; i <= n; i++) len.push(len[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]))
    const frames = base.map((p, i) => {
      const a = base[Math.max(0, i - 1)]
      const b = base[Math.min(n, i + 1)]
      let tx = b[0] - a[0]
      let ty = b[1] - a[1]
      const l = Math.hypot(tx, ty) || 1
      tx /= l; ty /= l
      return { x: p[0], y: p[1], tx, ty, nx: -ty, ny: tx }
    })
    return { frames, length: len[n] || 1 }
  }

  const build = (o, seed) => {
    const r = rng(seed, 3)
    const shapeFn = typeof o.path === 'function'
      ? () => ({ arms: [o.path], env: (s) => 0.06 + 0.12 * smooth(0, 0.4, s), lean: 0.15, reach: 1 })
      : (SHAPES[o.shape] || SHAPES.spine)
    const shape = shapeFn(r, o)

    // trunks: a smooth curve, then a jagged walk across it (three strands, like a bolt)
    const arms = shape.arms.map((curve) => {
      const { frames, length } = sampleArm(curve, TRUNK_STEPS)
      const jagScale = Math.max(0.4, Math.min(1.6, length))
      const strands = []
      for (let k = 0; k < 3; k++) {
        const pts = new Float32Array((TRUNK_STEPS + 1) * 2)
        let walk = 0
        const amp = k === 0 ? 1 : 0.6
        for (let i = 0; i <= TRUNK_STEPS; i++) {
          const f = frames[i]
          walk = walk * 0.82 + (r() - 0.5) * 0.011 * amp * jagScale
          const off = i === 0 ? 0 : walk + (r() - 0.5) * 0.007 * amp * jagScale + (k === 0 ? 0 : (r() - 0.5) * 0.004)
          pts[i * 2] = f.x + f.nx * off
          pts[i * 2 + 1] = f.y + f.ny * off
        }
        strands.push(pts)
      }
      // little forks off the trunk
      const spurs = []
      const nSpurs = Math.round(18 * jagScale)
      for (let k = 0; k < nSpurs; k++) {
        const s = 0.03 + r() * 0.95
        const i = Math.round(s * TRUNK_STEPS)
        const f = frames[i]
        const side = r() < 0.5 ? -1 : 1
        let x = strands[0][i * 2]
        let y = strands[0][i * 2 + 1]
        let a = Math.atan2(f.ty + f.ny * side * 1.2, f.tx + f.nx * side * 1.2)
        const steps = 3 + Math.floor(r() * 4)
        const pts = new Float32Array((steps + 1) * 2)
        pts[0] = x; pts[1] = y
        for (let j = 1; j <= steps; j++) {
          a += (r() - 0.5) * 1.4
          const d = 0.004 + r() * 0.006
          x += Math.cos(a) * d; y += Math.sin(a) * d
          pts[j * 2] = x; pts[j * 2 + 1] = y
        }
        spurs.push({ s, pts })
      }
      return { frames, length, strands, spurs }
    })

    // branches, grown in the frame of the trunk where they start:
    // u runs down the trunk, v away from it on their side
    const nb = Math.max(0, Math.round(o.branches))
    const branches = []
    const STEPS = 26
    for (let i = 0; i < nb; i++) {
      const armIndex = Math.floor(r() * arms.length)
      const arm = arms[armIndex]
      const s = 0.015 + 0.97 * Math.pow(r(), 0.92)
      const ti = Math.min(TRUNK_STEPS, Math.round(s * TRUNK_STEPS))
      const f = arm.frames[ti]
      const ax = arm.strands[0][ti * 2]
      const ay = arm.strands[0][ti * 2 + 1]
      const side = r() < 0.5 ? -1 : 1
      const E = shape.env(s)
      const L = (0.2 + r() * 0.95) * (E * 1.5 + 0.04) * shape.reach
      const curl = r() < 0.12 ? 2.5 : 1
      const k = (r() - 0.5) * 6 * curl / Math.max(0.05, L * 3)
      let phi = -0.6 + r() * 1.5 + shape.lean * (1 - 0.8 * smooth(0.7, 1, s)) // 0 = straight out, + = down the trunk
      let u = 0
      let v = 0
      const ds = L / STEPS
      const pts = new Float32Array((STEPS + 1) * 2)
      pts[0] = ax; pts[1] = ay
      const map = (j) => {
        pts[j * 2] = ax + f.tx * u + f.nx * side * v
        pts[j * 2 + 1] = ay + f.ty * u + f.ny * side * v
      }
      for (let j = 1; j <= STEPS; j++) {
        phi += k * ds + (r() - 0.5) * 0.18
        const Eh = shape.env(clamp01(s + Math.max(0, u)))
        if (v > Eh) phi += (Math.PI / 2 + 0.7 - phi) * 0.3 // curl back down and in
        else if (v < -Eh * 0.5) phi += (Math.PI / 2 - 0.7 - phi) * 0.3 // crossed the trunk: turn out again
        if (s + u < -0.02) phi += (Math.PI / 2 - phi) * 0.4 // don't climb past the root
        if (s + u > 1.02) phi += (0.1 - phi) * 0.15 // nor far past the tip
        u += Math.sin(phi) * ds
        v += Math.cos(phi) * ds
        map(j)
      }
      const endA = phi
      // hairs at the tip and along the branch
      const tendrils = []
      const hair = (at, a0, n) => {
        const j = Math.round(at * STEPS)
        let x = pts[j * 2]
        let y = pts[j * 2 + 1]
        let a = a0
        const steps = 4 + Math.floor(r() * 4)
        const tp = new Float32Array((steps + 1) * 2)
        tp[0] = x; tp[1] = y
        const len = (0.006 + r() * 0.022) * n
        for (let q = 1; q <= steps; q++) {
          a += (r() - 0.5) * 1.1
          x += Math.cos(a) * len / steps; y += Math.sin(a) * len / steps
          tp[q * 2] = x; tp[q * 2 + 1] = y
        }
        tendrils.push({ at, pts: tp })
      }
      const jEnd = STEPS
      const ex = pts[jEnd * 2] - pts[(jEnd - 1) * 2]
      const ey = pts[jEnd * 2 + 1] - pts[(jEnd - 1) * 2 + 1]
      const endAngle = Math.atan2(ey, ex)
      void endA
      const nTip = 1 + Math.floor(r() * 4)
      for (let q = 0; q < nTip; q++) hair(1, endAngle + (r() - 0.5) * 2, 1)
      const nAlong = Math.floor(r() * 2.5)
      for (let q = 0; q < nAlong; q++) hair(0.35 + r() * 0.6, endAngle + (r() - 0.5) * 3, 0.7)

      const hasHalo = r() < 0.4
      branches.push({
        arm: armIndex,
        s,
        side,
        len: L,
        pts,
        tendrils,
        halo: hasHalo ? 0.006 + r() * 0.011 : 0,
        haloEnd: 0.55 + r() * 0.45,
        phase: r() * TAU,
        rate: 0.6 + r() * 0.8,
        pulse: 3 + r() * 5,
        proved: r() < 0.35,
        drift: [(r() - 0.5) * 1.4, (r() - 0.5) * 1.4, (r() - 0.5) * 4, r()],
        label: null
      })
    }

    // labels: spread over the trunk, alternating sides
    let names = []
    if (Array.isArray(o.labels)) names = o.labels.map(String)
    else if (o.labels !== false && o.labels !== 0) {
      const n = o.labels === true || o.labels === undefined ? 22 : Math.max(0, Math.round(o.labels))
      const pool = lemmas.slice()
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
      for (let i = 0; i < n; i++) names.push(pool[i % pool.length])
    }
    const bySpan = branches.slice().sort((a, b) => a.s - b.s)
    const labels = []
    if (names.length && bySpan.length) {
      for (let i = 0; i < names.length; i++) {
        const want = (i + 0.5) / names.length
        let best = null
        let bestD = Infinity
        for (const b of bySpan) {
          if (b.label) continue
          const d = Math.abs(b.s - want) + (b.len < 0.05 ? 0.05 : 0)
          if (d < bestD) { bestD = d; best = b }
        }
        if (!best) break
        best.label = names[i]
        best.proved = true
        labels.push({ text: names[i], branch: best })
      }
    }

    // fit everything into a unit box
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity
    const grow = (pts) => {
      for (let i = 0; i < pts.length; i += 2) {
        if (pts[i] < minX) minX = pts[i]; if (pts[i] > maxX) maxX = pts[i]
        if (pts[i + 1] < minY) minY = pts[i + 1]; if (pts[i + 1] > maxY) maxY = pts[i + 1]
      }
    }
    arms.forEach((a) => grow(a.strands[0]))
    branches.forEach((b) => grow(b.pts))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const shift = (pts) => { for (let i = 0; i < pts.length; i += 2) { pts[i] -= cx; pts[i + 1] -= cy } }
    arms.forEach((a) => { a.strands.forEach(shift); a.spurs.forEach((sp) => shift(sp.pts)); a.frames.forEach((f) => { f.x -= cx; f.y -= cy }) })
    branches.forEach((b) => { shift(b.pts); b.tendrils.forEach((t) => shift(t.pts)) })

    return { arms, branches, labels, w: Math.max(0.05, maxX - minX), h: Math.max(0.05, maxY - minY), seed, radial: arms.length > 1 || ['spiral', 'ring', 'river', 'harmonograph'].includes(o.shape) || typeof o.path === 'function' }
  }

  // ------------------------------------------------------------------ colour

  const parseColor = (p, c) => {
    if (typeof c === 'number') {
      const h = ((c % 1) + 1) % 1
      const f = (n) => { const k = (n + h * 6) % 6; return 255 * (1 - 0.7 * Math.max(0, Math.min(k, 4 - k, 1))) }
      return [f(5), f(3), f(1)]
    }
    if (Array.isArray(c)) {
      const small = c.slice(0, 3).every((v) => v <= 1)
      return c.slice(0, 3).map((v) => (small ? v * 255 : v))
    }
    try { const col = p.color(c); return col.levels.slice(0, 3) } catch (e) { return [210, 77, 255] }
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`
  const paletteFor = (base) => {
    const white = [255, 255, 255]
    const black = [0, 0, 0]
    const grey = [128, 128, 140]
    return {
      core: mix(base, white, 0.78),
      line: mix(base, white, 0.3),
      glow: base,
      halo: mix(mix(base, grey, 0.25), white, 0.12),
      edge: mix(base, black, 0.6),
      dust: mix(mix(base, grey, 0.55), black, 0.35),
      text: mix(base, white, 0.85),
      leader: mix(base, grey, 0.5)
    }
  }

  // ------------------------------------------------------------------ drawing helpers

  // add the part of a polyline from fraction a to b to the current path
  const addRange = (ctx, xs, a, b) => {
    const m = xs.length / 2 - 1
    if (m < 1 || b <= a) return
    a = clamp01(a); b = clamp01(b)
    const fa = a * m
    const fb = b * m
    let i = Math.floor(fa)
    let t = fa - i
    if (i >= m) { i = m - 1; t = 1 }
    ctx.moveTo(xs[i * 2] + (xs[i * 2 + 2] - xs[i * 2]) * t, xs[i * 2 + 1] + (xs[i * 2 + 3] - xs[i * 2 + 1]) * t)
    const end = Math.floor(fb)
    for (let j = i + 1; j <= end && j <= m; j++) ctx.lineTo(xs[j * 2], xs[j * 2 + 1])
    const te = fb - end
    if (end < m && te > 0) ctx.lineTo(xs[end * 2] + (xs[end * 2 + 2] - xs[end * 2]) * te, xs[end * 2 + 1] + (xs[end * 2 + 3] - xs[end * 2 + 1]) * te)
  }
  const pointAt = (xs, f) => {
    const m = xs.length / 2 - 1
    const fa = clamp01(f) * m
    let i = Math.floor(fa)
    let t = fa - i
    if (i >= m) { i = m - 1; t = 1 }
    return [xs[i * 2] + (xs[i * 2 + 2] - xs[i * 2]) * t, xs[i * 2 + 1] + (xs[i * 2 + 3] - xs[i * 2 + 1]) * t]
  }

  const isP5 = (v) => v && typeof v.ellipse === 'function' && typeof v.millis === 'function'
  const resolveP5 = (p) => {
    if (isP5(p)) return p
    if (isP5(window.p5)) return window.p5
    throw new Error('proofSpine: pass a p5 instance, e.g. p5 = new P5(); proofSpine(p5, { ... })')
  }
  const value = (v, t) => (typeof v === 'function' ? v(t) : v)
  const SHAPE_KEYS = ['shape', 'branches', 'labels', 'arms', 'turns', 'f1', 'f2', 'damp']

  // ------------------------------------------------------------------ the animation of each mode
  // Each returns what to draw this frame: how much of the trunk (from, to),
  // its brightness, and for every branch the part drawn (a, b), its line and
  // halo brightness, plus labels, pulses and flashes.

  const frameFor = (mode, tree, o, u, t, cycleT) => {
    const B = tree.branches
    const n = B.length
    const st = {
      from: 0, to: 1, bright: 1, spark: -1, flash: 0,
      a: new Float32Array(n), b: new Float32Array(n).fill(1),
      line: new Float32Array(n).fill(1), halo: new Float32Array(n).fill(1),
      settle: null, label: new Float32Array(n), typed: new Float32Array(n).fill(1),
      trunkPulses: [], branchPulses: [], goal: 1, dust: 1, ahead: 0
    }
    const lab = (i, v) => { st.label[i] = B[i].label ? clamp01(v) : 0 }

    if (mode === 'grow') {
      const front = easeInOut(u / 0.7) // trunk
      const reach = u / 0.7 // keeps going after the trunk is done
      st.to = front
      st.spark = front < 1 ? front : -1
      st.goal = smooth(0, 0.08, u)
      for (let i = 0; i < n; i++) {
        const g = clamp01((reach - B[i].s) / (0.12 + B[i].len * 0.8))
        st.b[i] = easeOut(g)
        st.halo[i] = smooth(0.15, 1, g)
        lab(i, smooth(0.85, 1, g))
      }
    } else if (mode === 'lightning') {
      // t: seconds since this strike began
      const lead = 0.45
      const af = clamp01(o.afterglow)
      if (t < lead) {
        // stepped leader: jumps along the trunk with pauses
        const q = t / lead
        const steps = 14
        const k = Math.floor(q * steps)
        const fr = q * steps - k
        const front = (k + smooth(0.6, 1, fr)) / steps
        st.to = front
        st.spark = front
        st.bright = 0.7
        for (let i = 0; i < n; i++) {
          const g = clamp01((front - B[i].s) * 9)
          st.b[i] = g * (B[i].proved ? 1 : 0.6)
          st.line[i] = 0.55 * g
          st.halo[i] = 0
          st.label[i] = 0
        }
        st.goal = 0.4
        st.dust = 0.6
      } else {
        // return stroke, then flicker and decay
        const d = t - lead
        const flick = (at, w) => Math.exp(-Math.pow((d - at) / w, 2))
        let e = Math.exp(-d / 0.55) + 0.6 * flick(0.18, 0.04) + 0.45 * flick(0.38, 0.05)
        e = Math.min(1.6, e)
        const level = af + (1 - af) * Math.min(1, e)
        st.bright = level * (1 + 0.6 * Math.max(0, e - 1))
        st.flash = 0.22 * Math.max(0, Math.exp(-d / 0.12) + 0.4 * flick(0.18, 0.04))
        for (let i = 0; i < n; i++) {
          st.line[i] = level
          st.halo[i] = Math.min(1, af * 2 + Math.exp(-d / 1.2))
          lab(i, Math.max(af * 2.5, Math.exp(-d / 1.6)))
        }
        st.goal = Math.max(0.5, Math.exp(-d / 2))
        st.dust = 0.6 + 0.4 * Math.exp(-d / 0.3)
      }
    } else if (mode === 'search') {
      const cursor = clamp01(u / 0.72)
      st.to = 1
      st.ahead = 0.1
      st.from = 0
      st.cut = cursor // trunk behind the cursor is lit, ahead is faint
      st.spark = cursor < 1 ? cursor : -1
      st.goal = 0.5
      const reach = u / 0.72
      for (let i = 0; i < n; i++) {
        const bi = B[i]
        const dur = 0.04 + bi.len * 0.35
        const g = clamp01((reach - bi.s) / dur)
        st.b[i] = g
        if (g <= 0) { st.line[i] = 0; st.halo[i] = 0; continue }
        if (g < 1) {
          st.line[i] = 0.3
          st.halo[i] = 0
          st.branchPulses.push([i, g, 0.12, 1.2])
        } else {
          const after = clamp01((reach - bi.s - dur) / 0.08)
          st.line[i] = bi.proved ? 0.4 + 0.6 * after : 0.3 - 0.18 * after
          st.halo[i] = bi.proved ? after : 0
          lab(i, after)
          st.typed[i] = after
        }
      }
      // QED: a pulse runs back from the tip to the root, then the goal lights
      const qed = smooth(0.8, 0.95, u)
      if (qed > 0 && qed < 1) st.trunkPulses.push([1 - qed, 0.12, 1.4, -1])
      st.goal = 0.5 + 0.5 * smooth(0.93, 0.98, u)
      if (u > 0.93) st.flash = 0.12 * Math.exp(-(u - 0.93) * 60)
    } else if (mode === 'assemble') {
      st.settle = new Float32Array(n)
      const lightUp = smooth(0.62, 0.86, u)
      st.to = 1
      st.cutFrom = 1 - lightUp // the trunk lights up from its tip to the root
      st.ahead = 0.14
      st.spark = lightUp > 0 && lightUp < 1 ? 1 - lightUp : -1
      for (let i = 0; i < n; i++) {
        const bi = B[i]
        const start = 0.04 + 0.42 * (1 - bi.s) + bi.drift[3] * 0.1
        const e = clamp01((u - start) / 0.2)
        st.settle[i] = easeOut(e)
        st.line[i] = 0.35 + 0.65 * smooth(0, 0.9, e)
        st.halo[i] = smooth(0.75, 1, e) * (0.4 + 0.6 * smooth(0, 1, (lightUp - (1 - bi.s)) * 5 + 0.2))
        lab(i, smooth(0.9, 1, e) * smooth(0, 0.3, lightUp + (bi.s - 0.7)))
      }
      st.goal = smooth(0.84, 0.9, u)
      if (u > 0.86) st.flash = 0.1 * Math.exp(-(u - 0.86) * 50)
    } else if (mode === 'sway') {
      const breath = Math.sin(cycleT * TAU / 6)
      st.bright = 0.9 + 0.1 * breath
      st.haloWidth = 1 + 0.12 * breath
      for (let i = 0; i < n; i++) {
        const bi = B[i]
        st.halo[i] = 0.85 + 0.15 * Math.sin(cycleT * 0.9 + bi.phase)
        st.line[i] = 0.75 + 0.25 * Math.sin(cycleT * 1.3 + bi.phase * 2)
        lab(i, 1)
        // a pulse from the tip into the trunk
        const ph = ((cycleT + bi.phase * 3) % bi.pulse) / 1.6
        if (ph < 1 && (bi.proved || bi.phase < 2)) st.branchPulses.push([i, 1 - ph, 0.15, 1])
        if (ph >= 1 && ph < 1.1 && bi.label) st.label[i] = 1.5
      }
      for (let k = 0; k < 3; k++) {
        const ph = ((cycleT + k * 1.7) % 5) / 2.4
        if (ph < 1) st.trunkPulses.push([1 - ph, 0.08, 1, -1])
      }
      st.goal = 0.85 + 0.15 * breath
    }
    return st
  }

  // ------------------------------------------------------------------ Spine

  class Spine {
    constructor (p, options = {}) {
      this.p = p
      this.options = { ...options }
      this.age = 0
      this.last = undefined
      this.progress = 0
      this.tree = null
      this.treeKey = ''
      this.dustCache = null
      this.lastMode = undefined
    }

    set (options = {}) { Object.assign(this.options, options); return this }
    restart () { this.age = 0; return this }
    reseed (seed = Math.floor(Math.random() * 1e6)) { this.options.seed = seed; return this.restart() }

    resolve (t) {
      const raw = { ...common, ...this.options }
      const o = {}
      for (const key in raw) o[key] = key === 'path' ? raw[key] : value(raw[key], t)
      return o
    }

    treeFor (o, seed) {
      const key = JSON.stringify([seed, ...SHAPE_KEYS.map((k) => o[k]), typeof o.path === 'function' ? String(o.path) : 0])
      if (this.tree && key === this.treeKey) return this.tree
      this.treeKey = key
      this.tree = build(o, seed)
      return this.tree
    }

    draw () {
      const p = this.p
      const ctx = p.drawingContext
      if (!ctx || typeof ctx.lineTo !== 'function' || !('shadowBlur' in ctx)) throw new Error('proofSpine: needs a 2D p5 canvas (not WEBGL)')
      const now = p.millis() / 1000
      const dt = this.last === undefined ? 0 : Math.min(0.25, Math.max(0, now - this.last))
      this.last = now
      this.age += dt * value(this.options.speed ?? 1, this.age)
      const t = this.age
      const o = this.resolve(t)
      const mode = MODES[o.mode] ? o.mode : 'grow'
      if (this.lastMode !== undefined && mode !== this.lastMode) this.age = 0
      this.lastMode = mode
      const M = MODES[mode]
      const duration = Math.max(0.2, o.duration ?? (mode === 'lightning' ? o.period : M.duration))
      const hold = Math.max(0, o.hold ?? M.hold)
      const vary = o.vary ?? M.vary
      const cycleLen = duration + hold + (mode === 'lightning' || mode === 'sway' ? 0 : 1.5)

      // where in its run the animation is
      let run = 0
      let inRun = t
      if (o.progress !== undefined && o.progress !== null) inRun = clamp01(o.progress) * duration
      else if (o.loop !== false && mode !== 'sway') { run = Math.floor(t / cycleLen); inRun = t - run * cycleLen }
      const u = clamp01(inRun / duration)
      this.progress = u
      // fade out before the next run
      let fade = 1
      if (o.loop !== false && mode !== 'lightning' && mode !== 'sway' && mode !== 'still' && o.progress == null) {
        fade = 1 - smooth(duration + hold, cycleLen, inRun)
      }
      const seed = Math.round(o.seed) + (vary ? run * 7919 : 0)
      const tree = this.treeFor(o, seed)
      const st = mode === 'still'
        ? frameFor('sway', tree, o, 1, 0, 0)
        : frameFor(mode, tree, o, u, mode === 'lightning' ? inRun : t, t)
      if (mode === 'still') { st.trunkPulses = []; st.branchPulses = []; st.bright = 1; st.haloWidth = 1; st.halo.fill(1); st.line.fill(1) }
      const swayAmt = o.sway ?? M.sway

      this.render(o, tree, st, swayAmt, t, fade * clamp01(o.opacity))
      return this
    }

    render (o, tree, st, swayAmt, t, alpha) {
      const p = this.p
      const ctx = p.drawingContext
      const W = p.width
      const H = p.height
      const base = parseColor(p, o.color)
      const pal = paletteFor(base)

      // background
      if (o.background === false) p.clear()
      else if (o.background !== null && o.background !== 'none') {
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
        ctx.fillStyle = typeof o.background === 'string' ? o.background : rgba(parseColor(p, o.background))
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
      }
      if (alpha <= 0) return

      // fit: leave room for the label columns
      const hasLabels = tree.labels.length > 0
      const availW = W * (hasLabels ? 0.78 : 0.94)
      const S = Math.max(1, o.size * Math.min(availW / tree.w, H / tree.h))
      const cx = o.x * W
      const cy = o.y * H
      const px = S / 1000 // a pixel of the 1000-pixel tree the look was tuned on
      const lw = (v) => Math.max(0.5, v * Math.max(0.55, px))

      ctx.save()
      ctx.globalAlpha = alpha

      // dust
      if (o.dust > 0) {
        this.drawDust(o, pal, W, H, tree.seed)
        if (this.dustCache) {
          ctx.globalAlpha = alpha * st.dust
          ctx.drawImage(this.dustCache.canvas, 0, 0, W, H)
          ctx.globalAlpha = alpha
        }
      }

      // where everything is this frame (sway and drifting in)
      const tx = (x) => cx + x * S
      const ty = (y) => cy + y * S
      const wob = (s, ph) => swayAmt * 0.022 * Math.pow(s, 1.4)
      const trunkOff = (s) => {
        const w = wob(s)
        return [w * Math.sin(t * 0.55 + s * 2.6), w * 0.6 * Math.cos(t * 0.43 + s * 2.1)]
      }
      const arms = tree.arms.map((arm) => {
        const strands = arm.strands.map((src) => {
          const xs = new Float32Array(src.length)
          for (let i = 0; i < src.length; i += 2) {
            const s = i / (src.length - 2)
            const [dx, dy] = swayAmt ? trunkOff(s) : [0, 0]
            xs[i] = tx(src[i] + dx); xs[i + 1] = ty(src[i + 1] + dy)
          }
          return xs
        })
        return { strands, src: arm }
      })
      const bxs = []
      const B = tree.branches
      for (let i = 0; i < B.length; i++) {
        const b = B[i]
        const src = b.pts
        const xs = new Float32Array(src.length)
        const m = src.length / 2 - 1
        const [ox, oy] = swayAmt ? trunkOff(b.s) : [0, 0]
        for (let j = 0; j <= m; j++) {
          const f = j / m
          let dx = ox
          let dy = oy
          if (swayAmt) {
            const w = swayAmt * Math.pow(f, 1.6) * b.len * 0.35
            dx += w * Math.sin(t * 1.1 * b.rate + b.phase + f * 2.2)
            dy += w * 0.6 * Math.cos(t * 0.9 * b.rate + b.phase * 1.3 + f * 2)
          }
          xs[j * 2] = tx(src[j * 2] + dx)
          xs[j * 2 + 1] = ty(src[j * 2 + 1] + dy)
        }
        if (st.settle && st.settle[i] < 1) {
          // drifting in from the dust: offset and turned around where it starts
          const e = st.settle[i]
          const k = 1 - e
          const ax = xs[0]
          const ay = xs[1]
          const rot = b.drift[2] * k
          const c = Math.cos(rot)
          const sn = Math.sin(rot)
          const ofx = b.drift[0] * k * S * 0.6
          const ofy = b.drift[1] * k * S * 0.6
          const sc = 0.4 + 0.6 * e
          for (let j = 0; j <= m; j++) {
            const rx = (xs[j * 2] - ax) * sc
            const ry = (xs[j * 2 + 1] - ay) * sc
            xs[j * 2] = ax + rx * c - ry * sn + ofx
            xs[j * 2 + 1] = ay + rx * sn + ry * c + ofy
          }
        }
        bxs.push(xs)
      }
      const tendrilXs = (b, xs, tp, at) => {
        // tendrils follow their branch point
        const m = b.pts.length / 2 - 1
        const j = Math.round(at * m)
        const dx = xs[j * 2] - tx(b.pts[j * 2])
        const dy = xs[j * 2 + 1] - ty(b.pts[j * 2 + 1])
        const out = new Float32Array(tp.length)
        for (let q = 0; q < tp.length; q += 2) { out[q] = tx(tp[q]) + dx; out[q + 1] = ty(tp[q + 1]) + dy }
        return out
      }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // halos: a dark edge and a lighter body, tube over tube
      if (o.halo > 0) {
        const hw = (st.haloWidth || 1) * o.halo
        // the root's halo
        const goalA = st.goal * Math.min(1, st.bright)
        if (goalA > 0.01) {
          for (const arm of arms) {
            ctx.beginPath()
            addRange(ctx, arm.strands[0], 0, 0.04)
            ctx.strokeStyle = rgba(pal.edge, 0.85 * goalA)
            ctx.lineWidth = 0.034 * S * hw + 3 * px
            ctx.stroke()
            ctx.strokeStyle = rgba(pal.halo, 0.6 * goalA)
            ctx.lineWidth = 0.034 * S * hw
            ctx.stroke()
          }
        }
        for (let i = 0; i < B.length; i++) {
          const b = B[i]
          const a = st.halo[i] * Math.min(1, st.bright)
          if (!b.halo || a < 0.01) continue
          const end = Math.min(st.b[i], b.haloEnd)
          if (end <= st.a[i]) continue
          const w = b.halo * S * hw
          ctx.beginPath()
          addRange(ctx, bxs[i], st.a[i], end)
          ctx.strokeStyle = rgba(pal.edge, 0.6 * a)
          ctx.lineWidth = w + 3 * Math.max(0.6, px)
          ctx.stroke()
          ctx.strokeStyle = rgba(pal.halo, 0.36 * a)
          ctx.lineWidth = w
          ctx.stroke()
        }
      }

      // branch lines, added up so that they brighten where they cross
      ctx.globalCompositeOperation = 'lighter'
      const buckets = new Map()
      const bucket = (a) => {
        const k = Math.max(1, Math.min(16, Math.round(a * 10)))
        if (!buckets.has(k)) buckets.set(k, [])
        return buckets.get(k)
      }
      for (let i = 0; i < B.length; i++) {
        const a = st.line[i] * st.bright
        if (a < 0.02 || st.b[i] <= st.a[i]) continue
        bucket(a).push(i)
      }
      for (const [k, list] of buckets) {
        const a = k / 10
        ctx.beginPath()
        for (const i of list) addRange(ctx, bxs[i], st.a[i], st.b[i])
        ctx.strokeStyle = rgba(pal.line, 0.5 * Math.min(1, a))
        ctx.lineWidth = lw(1.3) * (a > 1 ? 1 + (a - 1) : 1)
        ctx.stroke()
        // tendrils
        ctx.beginPath()
        for (const i of list) {
          const b = B[i]
          for (const td of b.tendrils) {
            if (st.b[i] < td.at - 0.001) continue
            const grown = td.at >= 1 ? 1 : clamp01((st.b[i] - td.at) * 5)
            const txs = tendrilXs(b, bxs[i], td.pts, td.at)
            addRange(ctx, txs, 0, grown)
          }
        }
        ctx.strokeStyle = rgba(pal.core, 0.32 * Math.min(1, a))
        ctx.lineWidth = lw(0.9)
        ctx.stroke()
      }

      // pulses along branches
      if (st.branchPulses.length) {
        ctx.beginPath()
        for (const [i, f, len] of st.branchPulses) addRange(ctx, bxs[i], Math.max(st.a[i], f - len), Math.min(st.b[i], f))
        ctx.strokeStyle = rgba(pal.core, 0.8)
        ctx.lineWidth = lw(2.2)
        ctx.shadowColor = rgba(pal.glow, 1)
        ctx.shadowBlur = 10 * px * o.glow
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // the trunk: glow, then a white-hot core, three strands
      const bright = st.bright
      const lit = (from, to, strength) => {
        if (to <= from || strength <= 0.01) return
        ctx.beginPath()
        for (const arm of arms) {
          for (let k = 0; k < 3; k++) addRange(ctx, arm.strands[k], from, to)
          for (const sp of arm.src.spurs) {
            if (sp.s < from || sp.s > to) continue
            const xs = new Float32Array(sp.pts.length)
            const [dx, dy] = swayAmt ? trunkOff(sp.s) : [0, 0]
            for (let q = 0; q < xs.length; q += 2) { xs[q] = tx(sp.pts[q] + dx); xs[q + 1] = ty(sp.pts[q + 1] + dy) }
            addRange(ctx, xs, 0, 1)
          }
        }
        if (o.glow > 0) {
          ctx.shadowColor = rgba(pal.glow, 1)
          ctx.shadowBlur = 16 * px * o.glow * Math.min(1.6, strength)
          ctx.strokeStyle = rgba(pal.line, 0.55 * Math.min(1, strength))
          ctx.lineWidth = lw(3.4)
          ctx.stroke()
          ctx.shadowBlur = 0
        }
        ctx.strokeStyle = rgba(pal.core, Math.min(1, 0.9 * strength))
        ctx.lineWidth = lw(1.5) * (strength > 1 ? strength : 1)
        ctx.stroke()
      }
      if (st.cut !== undefined) {
        lit(st.cut, st.to, st.ahead)
        lit(st.from, st.cut, bright)
      } else if (st.cutFrom !== undefined) {
        lit(0, st.cutFrom, st.ahead)
        lit(st.cutFrom, 1, bright)
      } else lit(st.from, st.to, bright)

      for (const [s, len, strength, dir] of st.trunkPulses) {
        const a0 = dir < 0 ? s : s - len
        const a1 = dir < 0 ? s + len : s
        ctx.beginPath()
        for (const arm of arms) addRange(ctx, arm.strands[0], a0, a1)
        ctx.shadowColor = rgba(pal.glow, 1)
        ctx.shadowBlur = 18 * px * o.glow
        ctx.strokeStyle = rgba([255, 255, 255], Math.min(1, strength))
        ctx.lineWidth = lw(3)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // the spark at the front
      if (st.spark >= 0) {
        for (const arm of arms) {
          const [x, y] = pointAt(arm.strands[0], st.spark)
          const r = 14 * Math.max(0.6, px)
          const g = ctx.createRadialGradient(x, y, 0, x, y, r)
          g.addColorStop(0, rgba([255, 255, 255], 0.95))
          g.addColorStop(0.3, rgba(pal.glow, 0.6))
          g.addColorStop(1, rgba(pal.glow, 0))
          ctx.fillStyle = g
          ctx.fillRect(x - r, y - r, r * 2, r * 2)
        }
      }

      // the flash of a strike or a proof
      if (st.flash > 0) {
        ctx.fillStyle = rgba(pal.glow, st.flash)
        ctx.fillRect(0, 0, W, H)
      }
      ctx.globalCompositeOperation = 'source-over'

      // labels on leader lines
      this.drawLabels(ctx, o, tree, st, pal, arms, bxs, { W, H, S, px, alpha, cx })

      ctx.restore()
    }

    drawLabels (ctx, o, tree, st, pal, arms, bxs, g) {
      const { W, H, S, px, cx } = g
      const fs = o.textSize || Math.max(9, Math.min(22, 12.5 * Math.max(0.75, px)))
      ctx.font = `${fs}px ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`
      ctx.textBaseline = 'middle'
      const margin = Math.max(8, W * 0.02)
      const items = []
      // the goal at the root
      if (o.goal && st.goal > 0.01) {
        const [x, y] = pointAt(arms[0].strands[0], 0)
        items.push({ text: String(o.goal), x, y, side: x > cx && tree.radial ? 1 : -1, vis: st.goal, typed: 1, goal: true })
      }
      for (const l of tree.labels) {
        const i = tree.branches.indexOf(l.branch)
        const v = st.label[i]
        if (v <= 0.01) continue
        const xs = bxs[i]
        // lead to the branch where it leaves the trunk, or its tip for radial shapes
        const [x, y] = tree.radial ? pointAt(xs, Math.min(st.b[i], 1)) : [xs[0], xs[1]]
        items.push({ text: l.text, x, y, side: tree.radial ? (x < cx ? -1 : 1) : l.branch.side, vis: v, typed: st.typed[i] })
      }
      // stack each column so names don't overlap
      const gap = fs * 1.5
      for (const side of [-1, 1]) {
        const col = items.filter((it) => it.side === side).sort((a, b) => a.y - b.y)
        let lastY = -Infinity
        for (const it of col) { it.ly = Math.max(it.y, lastY + gap, fs); lastY = it.ly }
        // push back up if the column ran off the bottom
        let limit = H - fs * (o.legend ? 5 : 1.5)
        for (let k = col.length - 1; k >= 0; k--) { if (col[k].ly > limit) col[k].ly = limit; limit = col[k].ly - gap }
      }
      for (const it of items) {
        const vis = Math.min(1, it.vis)
        const hot = it.vis > 1 ? it.vis - 1 : 0
        const text = it.typed >= 1 ? it.text : it.text.slice(0, Math.ceil(it.text.length * it.typed))
        const tw = ctx.measureText(it.text).width
        const lx = it.side < 0 ? margin : W - margin
        const ex = it.side < 0 ? margin + tw + 6 : W - margin - tw - 6
        ctx.beginPath()
        ctx.moveTo(ex, it.ly)
        ctx.lineTo(it.x, it.y)
        ctx.strokeStyle = rgba(pal.leader, 0.45 * vis)
        ctx.lineWidth = Math.max(0.5, 0.8 * Math.max(0.6, px))
        ctx.stroke()
        ctx.textAlign = it.side < 0 ? 'left' : 'right'
        ctx.fillStyle = rgba(hot > 0 || it.goal ? [255, 255, 255] : pal.text, vis * (it.goal ? 1 : 0.9))
        ctx.fillText(text, lx, it.ly)
      }
      if (o.legend) {
        const lines = Array.isArray(o.legend) ? o.legend : legendLines
        const ls = fs * 0.8
        ctx.font = `${ls}px ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`
        ctx.textAlign = 'left'
        ctx.fillStyle = rgba(pal.text, 0.55)
        lines.forEach((line, k) => ctx.fillText(String(line), margin, H - margin - (lines.length - 1 - k) * ls * 1.3))
      }
      void S
    }

    // faint short strokes, drawn once into their own canvas
    drawDust (o, pal, W, H, seed) {
      const pd = typeof this.p.pixelDensity === 'function' ? this.p.pixelDensity() : 1
      const key = [W, H, pd, seed, o.dust, pal.dust.map((v) => v | 0).join(',')].join('|')
      if (this.dustCache && this.dustCache.key === key) return
      const c = (this.dustCache && this.dustCache.canvas) || document.createElement('canvas')
      c.width = Math.round(W * pd)
      c.height = Math.round(H * pd)
      const g = c.getContext('2d')
      g.setTransform(pd, 0, 0, pd, 0, 0)
      g.clearRect(0, 0, W, H)
      const r = rng(seed, 77)
      const m = Math.min(W, H)
      const n = Math.round(520 * o.dust * (W * H) / (900 * 1100))
      g.lineCap = 'round'
      g.lineWidth = Math.max(0.6, m / 900)
      for (let i = 0; i < n; i++) {
        let x = r() * W
        let y = r() * H
        let a = r() * TAU
        const steps = 2 + Math.floor(r() * 4)
        const len = (0.006 + r() * 0.03) * m
        g.beginPath()
        g.moveTo(x, y)
        for (let k = 0; k < steps; k++) {
          a += (r() - 0.5) * 1.2
          x += Math.cos(a) * len / steps; y += Math.sin(a) * len / steps
          g.lineTo(x, y)
        }
        g.strokeStyle = rgba(pal.dust, 0.12 + r() * 0.3)
        g.stroke()
      }
      this.dustCache = { key, canvas: c }
    }
  }

  function proofSpine (p, options) {
    if (!isP5(p) && p && typeof p === 'object' && options === undefined) { options = p; p = undefined }
    return new Spine(resolveP5(p), options)
  }

  // draw one tree and set p5.draw
  proofSpine.show = (p, options) => {
    if (!isP5(p) && p && typeof p === 'object' && options === undefined) { options = p; p = undefined }
    const tree = proofSpine(p, options)
    tree.p.draw = () => tree.draw()
    return tree
  }

  proofSpine.modes = Object.keys(MODES)
  proofSpine.shapes = Object.keys(SHAPES)
  proofSpine.lemmas = lemmas
  proofSpine.defaults = (mode = 'grow') => ({ ...common, ...(MODES[mode] ? { duration: MODES[mode].duration, hold: MODES[mode].hold, vary: MODES[mode].vary, sway: MODES[mode].sway } : {}), mode })
  proofSpine.Spine = Spine

  window.proofSpine = proofSpine
}
