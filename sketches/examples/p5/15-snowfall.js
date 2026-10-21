// Snowfall: small grown crystals falling, tumbling and drifting over a hydra sky.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

snow = snowflake.snowfall(p5, {
  count: 70,
  kinds: 8, // distinct crystals, grown once and reused
  size: 0.045, // of the shorter side
  depth: 1, // far flakes are smaller, dimmer and slower
  wind: (t) => 0.3 * Math.sin(t * 0.1), // any option can be a function of time
  background: false // transparent, so hydra paints the sky
})

sky = gradient(0.02)
  .r()
  .color(0.06, 0.1, 0.22)
  .add(noise(1.5, 0.03).color(0.03, 0.05, 0.1))

sky
  .layer(src(s0))
  .out()

// try: snow.set({ palette: 'gilded', count: 120 }), snow.reseed()
