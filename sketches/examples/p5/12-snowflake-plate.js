// A page of growing snow crystals after Wilson Bentley's photomicrographs, drawn by p5 and lit by hydra.
// snowflake() loads automatically; its options are documented in
// public/extensions/p5-forms/snowflake.js. Run again to regrow.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

page = snowflake.plate(p5, {
  // nine crystals, each grown through its own weather; an entry can also be a
  // habit name: 'plate', 'sectored', 'broad', 'stellar', 'dendrite', 'fern', ...
  seed: 2,
  grow: 12, // seconds to grow up
  stagger: 1.5 // seconds between one crystal and the next starting to grow
})

// a cold sheen: the page over a softly blurred, bluish copy of itself
src(s0)
  .add(src(s0).scale(1.01).blend(o0, 0.6).color(0.8, 0.9, 1).brightness(-0.2), 0.4)
  .out()

// try: page.reseed(), page.set({ palette: 'frost' }), page.set({ life: 'cycle', cycle: 30 })
