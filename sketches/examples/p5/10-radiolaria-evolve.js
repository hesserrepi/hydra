// Evolving forms: options given as functions of time make the skeleton change shape as it lives.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

swing = (t, period, lo, hi) => lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / period))

left = radiolaria(p5, {
  form: 'ring',
  x: 0.28,
  size: 0.3,
  life: 'still',
  rings: (t) => Math.round(swing(t, 40, 1, 4)), // rings are added and taken away
  spines: (t) => Math.round(swing(t, 25, 8, 20)),
  spineLength: (t) => swing(t, 13, 0.6, 1.4),
  curl: (t) => swing(t, 17, -0.4, 1.2)
})

right = radiolaria(p5, {
  form: 'star',
  x: 0.72,
  size: 0.3,
  life: 'still',
  blades: (t) => Math.round(swing(t, 30, 10, 26)),
  bladeWidth: (t) => swing(t, 11, 0.5, 1.6),
  teeth: (t) => Math.round(swing(t, 19, 0, 8)),
  palette: 'gilded'
})

p5.draw = () => {
  radiolaria.backdrop(p5, { palette: 'gilded' })
  left.draw()
  right.draw()
}

src(s0).out()
