// The weather as a function of time: vapour pulses while the crystal grows, and every arm records it. Hydra spreads it into frost.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

swing = (t, period, lo, hi) => lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / period))

flake = snowflake(p5, {
  habit: 'stellar',
  life: 'cycle',
  grow: 20,
  cycle: 34,
  // water vapour around the crystal, in its own seconds: more vapour grows
  // branches, less grows plates. Read while it grows, so each pulse shows up as a band.
  rho: (t) => swing(t, 5, 0.36, 0.6),
  beta: (t) => swing(t, 9, 1.1, 1.6),
  palette: 'frost',
  glow: 1.5
})

p5.draw = () => {
  p5.clear() // transparent, so only the crystal reaches hydra
  flake.draw()
}

// a slowly expanding, turning, fading echo under the crystal: rime spreading outwards
src(o0)
  .scale(1.006)
  .rotate(0.0015)
  .modulate(noise(3, 0.05), 0.002)
  .color(0.8, 0.88, 0.96)
  .layer(src(s0))
  .out()
