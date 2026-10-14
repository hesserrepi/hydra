// The microphone drives both p5 and hydra (allow microphone access in the browser).
a.setBins(4)

p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

p5.draw = () => {
  p5.background(0, 40) // translucent background leaves trails
  p5.noFill()
  p5.stroke(255)
  p5.strokeWeight(6)
  p5.circle(p5.width / 2, p5.height / 2, 100 + a.fft[0] * 600)
  p5.line(0, p5.height / 2, p5.width, p5.height / 2 + (a.fft[3] - 0.5) * 400)
}

src(s0)
  .modulateScale(noise(3, 0.2), () => a.fft[1] * 0.5)
  .kaleid(6)
  .color(1, 0.5, () => 0.3 + a.fft[2])
  .out()
