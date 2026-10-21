// One radiolarian living through its cycles: it grows, sways, dissolves and regrows as a new variation.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

r = radiolaria(p5, {
  form: 'bush',
  size: 0.46,
  life: 'cycle', // 'grow' once, 'cycle' forever, or 'still' (fully grown)
  grow: 15,
  cycle: 45,
  arms: 11,
  branching: 3, // levels of side branches
  thorns: 5,
  droop: 0.8, // longer arms hanging down
  symbionts: 60
})

p5.draw = () => {
  radiolaria.backdrop(p5)
  r.draw()
}

// hydra adds a slow watery wobble
src(s0)
  .modulate(noise(1.5, 0.05), 0.008)
  .out()
