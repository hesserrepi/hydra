// Audio-reactive growth: loud passages bring more vapour and the crystal branches out, quiet ones let it fill in.
// The browser asks for microphone access the first time.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

a.setBins(4)
a.setSmooth(0.9)

flake = snowflake(p5, {
  habit: 'stellar',
  life: 'cycle',
  grow: 18,
  cycle: 26,
  rho: () => 0.38 + a.fft[0] * 0.35,
  glow: () => 0.6 + a.fft[2] * 2,
  palette: 'neon',
  twin: 0.6 // a second crystal turned 30 degrees: twelve branches
})

p5.draw = () => {
  snowflake.backdrop(p5, { palette: 'neon', grain: 0.4 })
  flake.draw()
}

src(s0)
  .blend(src(o0).scale(1.015), 0.5)
  .out()
