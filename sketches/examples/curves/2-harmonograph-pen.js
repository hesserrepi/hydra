// A harmonograph with your own pen path: the X swing wobbles and a slow fourth pendulum beats the Y swing.
h = harmonograph(s0, {
  f1: 3, f2: 2, damp: 0.0025, speed: 160, line: 1,
  color: 'rgba(170, 220, 255, 0.7)',
  pen: (t, P) => {
    const d = Math.exp(-P.damp * t)
    const wobble = 1 + 0.15 * Math.sin(P.f3 * 0.1 * t)
    const x = Math.sin(P.f1 * t + P.p1) * wobble + P.mix * Math.sin(P.f3 * t + P.p3)
    const y = Math.sin(P.f2 * t + P.p2) * Math.cos(P.f4 * 0.5 * t)
    return [d * x / (1 + P.mix), d * y]
  }
})

src(s0)
  .diff(src(s0).scale(1, -1, 1))   // mirrored copy, so it reads like a moth
  .add(src(o0).scale(1.004), 0.5)
  .out()
