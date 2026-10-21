// A turning cage leaving ghostly trails in a hydra feedback loop.
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
  p5.background(0)
  cage.draw()
}

// the cage plus a slowly zooming, cooling copy of the last frame
src(s0)
  .add(src(o0)
    .scale(1.006)
    .rotate(0.001)
    .modulate(noise(2, 0.05), 0.003)
    .color(0.8, 0.88, 0.97), 0.85)
  .out()
