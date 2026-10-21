// Audio-reactive lattice: the bass pushes the spines out, the mids make it swell and the highs make it glow.
// The browser asks for microphone access the first time.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

a.setBins(4)
a.setSmooth(0.85)

sphere = radiolaria(p5, {
  form: 'lattice',
  life: 'still',
  spines: 40,
  spineLength: () => 0.3 + a.fft[0] * 1.5,
  size: () => 0.36 + a.fft[1] * 0.08,
  glow: () => 0.5 + a.fft[2] * 2,
  spin: 0.25,
  palette: 'neon'
})

p5.draw = () => {
  radiolaria.backdrop(p5, { palette: 'neon', grain: 0.4 })
  sphere.draw()
}

src(s0)
  .blend(src(o0).scale(1.02), 0.5)
  .out()
