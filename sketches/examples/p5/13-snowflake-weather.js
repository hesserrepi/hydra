// One snow crystal living through changing weather: it grows, sublimes from the edges and grows again, never twice the same.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

flake = snowflake(p5, {
  // 'bentley' writes a new life story from the seed every cycle: a plate or a star
  // that changes habit two or three times on its way down
  habit: 'bentley',
  life: 'cycle', // 'grow' once, 'cycle' forever, or 'still' (fully grown)
  grow: 16,
  cycle: 30,
  size: 0.45,
  spin: 0.03,
  rings: 0.8, // engraved lines left by the growth front
  resolution: 140 // finer crystal, a little slower to compute
})

// or tell its story yourself: habits in the order the crystal meets them,
// at: where the next one starts, as a fraction of the radius
// flake.set({ climate: ['plate', { habit: 'fern', at: 0.3 }, { habit: 'stellar', at: 0.75 }] })

p5.draw = () => {
  snowflake.backdrop(p5)
  flake.draw()
}

src(s0)
  .modulate(noise(1.2, 0.04), 0.004)
  .out()
