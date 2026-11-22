// harmonograph: a pen on a table swung by damped pendulums, drawn on a canvas
// that hydra uses as a source. Like a Lissajous figure, but the swing dies down,
// so the pen spirals inward. When it has nearly stopped, the paper is faded and
// the pendulums are released again with frequencies and phases that have
// drifted a little, so the drawing keeps evolving.
//
//   harmonograph(s0)                          // draw into s0 with the defaults
//   src(s0).out()
//
//   h = harmonograph(s0, { f1: 3, f2: 4, detune: 0.02, mix: 0.6 })
//   src(s0).color(1, 0.75, 0.45).blend(src(o0).scale(1.006).rotate(0.003), 0.6).out()
//   h.set({ damp: 0.006 })                    // change options while it runs
//   h.next()                                  // drift and release a new swing now
//
// Running harmonograph() again on the same source replaces the old drawing.
//
// options (defaults)
//   f1, f2     frequencies of the X and Y pendulums; whole-number ratios
//              give closed figures                                  2, 3
//   detune     the third pendulum's mistuning from f1 and f2; makes the
//              figure turn as it decays                             0.012
//   mix        strength of the third, rotary pendulum (0 = off)     0.35
//   damp       friction: higher spirals in faster                   0.003
//   drift      how far the frequencies wander at each new swing     0.02
//   phaseDrift how far the phases wander at each new swing          0.5
//   speed      pen steps per frame                                  120
//   until      start a new swing when the swing is this small       0.03
//   fade       how much of the old drawing a new swing wipes (0-1)  0.82
//   size       radius, as a fraction of the shorter side            0.44
//   line       pen width in pixels                                  1.2
//   color      pen colour (any CSS colour)                          'rgba(255,255,255,0.8)'
//   background paper colour                                         '#000'
//   seed       phases of the first swing; omit for random
//   pen        your own pen path: (t, P) => [x, y] with x, y in about -1..1.
//              P has f1 f2 f3 f4, p1 p2 p3 p4, damp and mix
//
// Every number may also be a function, read every frame, e.g.
// { mix: () => 0.5 + 0.5 * Math.sin(time * 0.1) }.
//
// The returned object has: canvas, set(options), next(), clear(), stop(),
// and swing (how many swings so far).
(() => {
  const DT = 0.03 // time per pen step

  const defaults = {
    f1: 2, f2: 3, detune: 0.012, mix: 0.35, damp: 0.003, drift: 0.02, phaseDrift: 0.5,
    speed: 120, until: 0.03, fade: 0.82, size: 0.44, line: 1.2,
    color: 'rgba(255,255,255,0.8)', background: '#000', seed: undefined, pen: undefined
  }

  // the classic lateral harmonograph: two pendulums for x and y, plus a rotary one
  const classicPen = (t, P) => {
    const d = Math.exp(-P.damp * t)
    const x = Math.sin(P.f1 * t + P.p1) + P.mix * Math.sin(P.f3 * t + P.p3)
    const y = Math.sin(P.f2 * t + P.p2) + P.mix * Math.cos(P.f4 * t + P.p4)
    return [d * x / (1 + P.mix), d * y / (1 + P.mix)]
  }

  const value = (v) => (typeof v === 'function' ? v() : v)

  // a small seeded random so `seed` gives the same first swing every time
  const random = (seed) => {
    let s = seed >>> 0 || 1
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  }

  function harmonograph(source, options = {}) {
    if (source && typeof source === 'object' && !source.init) {
      options = source
      source = undefined
    }
    source = source || window.s0
    if (source._harmonograph) source._harmonograph.stop()

    const o = { ...defaults, ...options }
    const rand = o.seed === undefined ? Math.random : random(o.seed * 7919)
    const canvas = document.createElement('canvas')
    const g = canvas.getContext('2d')

    const state = { t: 0, o1: 0, o2: 0, d3: 0, d4: 0, last: null, swing: 1, raf: 0, stopped: false }
    state.p = [rand() * 6.283, rand() * 6.283, rand() * 6.283, rand() * 6.283]

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      if (canvas.width === w && canvas.height === h) return
      canvas.width = w
      canvas.height = h
      clear()
    }
    const clear = (alpha = 1) => {
      g.save()
      g.globalAlpha = alpha
      g.fillStyle = value(o.background)
      g.fillRect(0, 0, canvas.width, canvas.height)
      g.restore()
      state.last = null
    }
    const params = () => {
      const f1 = value(o.f1) + state.o1
      const f2 = value(o.f2) + state.o2
      const detune = value(o.detune)
      return {
        f1, f2, f3: f1 + detune + state.d3, f4: f2 + detune * 0.7 + state.d4,
        p1: state.p[0], p2: state.p[1], p3: state.p[2], p4: state.p[3],
        damp: value(o.damp), mix: value(o.mix)
      }
    }
    // let the pendulums drift and release them again
    const next = () => {
      const drift = value(o.drift)
      const r = () => (Math.random() * 2 - 1) * drift
      // the drift is a random walk pulled back towards the given frequencies
      state.o1 = (state.o1 + r()) * 0.92
      state.o2 = (state.o2 + r()) * 0.92
      state.d3 += r() * 0.3
      state.d4 += r() * 0.3
      const pd = value(o.phaseDrift)
      state.p = state.p.map((p) => p + (Math.random() * 2 - 1) * pd)
      state.swing++
      clear(value(o.fade))
      state.t = 0
    }

    const step = () => {
      if (state.stopped) return
      resize()
      const pen = o.pen || classicPen
      const P = params()
      const s = Math.min(canvas.width, canvas.height) * value(o.size)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      g.strokeStyle = value(o.color)
      g.lineWidth = value(o.line)
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.beginPath()
      if (state.last) g.moveTo(state.last[0], state.last[1])
      const steps = Math.max(1, Math.round(value(o.speed)))
      for (let i = 0; i < steps; i++) {
        const [x, y] = pen(state.t, P)
        state.t += DT
        const px = cx + x * s
        const py = cy - y * s
        if (!isFinite(px) || !isFinite(py)) continue
        if (state.last) g.lineTo(px, py)
        else g.moveTo(px, py)
        state.last = [px, py]
      }
      g.stroke()
      if (Math.exp(-P.damp * state.t) < value(o.until)) next()
      state.raf = requestAnimationFrame(step)
    }

    const api = {
      canvas,
      get swing() { return state.swing },
      set(more) { Object.assign(o, more); return api },
      next() { next(); return api },
      clear() { clear(); state.t = 0; return api },
      stop() { state.stopped = true; cancelAnimationFrame(state.raf); if (source._harmonograph === api) source._harmonograph = null }
    }

    resize()
    clear()
    source.init({ src: canvas, dynamic: true })
    source._harmonograph = api
    step()
    return api
  }

  harmonograph.defaults = defaults
  harmonograph.pen = classicPen
  window.harmonograph = harmonograph
})()
