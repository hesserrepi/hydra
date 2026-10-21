// A plate of growing radiolarians after Haeckel, drawn by p5 and softly bloomed by hydra.
// radiolaria() loads automatically; its options are documented in
// public/extensions/p5-forms/radiolaria.js. Run again to regrow.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

plate = radiolaria.plate(p5, {
  // the six forms, in reading order; an entry can also be an options object
  forms: ['bush', 'lattice', 'ring', 'cage', 'star', 'basket'],
  seed: 3,
  grow: 14, // seconds to grow up
  stagger: 2 // seconds between one specimen and the next starting to grow
})

// a little bloom: the plate over a blurred, brightened copy of itself
src(s0)
  .add(src(s0).scale(1.01).blend(o0, 0.6).brightness(-0.15), 0.35)
  .out()

// try: plate.reseed(), plate.set({ palette: 'cyanotype' }), plate.set({ life: 'cycle', cycle: 30 })
