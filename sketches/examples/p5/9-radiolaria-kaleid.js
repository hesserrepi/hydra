// A turning cage on a transparent canvas, folded and trailed by hydra feedback.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

cage = radiolaria(p5, {
  form: 'cage',
  life: 'still',
  rings: 4,
  spines: 7,
  branching: 2,
  spin: 0.4,
  // tilt nods back and forth: any option can be a function of time (seconds)
  tilt: (t) => 0.35 + 0.3 * Math.sin(t * 0.3),
  glow: 0.6
})

p5.draw = () => {
  p5.clear() // transparent, so hydra only gets the skeleton
  cage.draw()
}

src(o0)
  .scale(1.008)
  .rotate(0.003)
  .color(0.96, 0.97, 1)
  .layer(src(s0).kaleid(6).luma(0.1))
  .out()
