// p5 text as a mask over hydra colors, with feedback trails.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

p5.draw = () => {
  p5.background(0)
  p5.fill(255)
  p5.textAlign(p5.CENTER, p5.CENTER)
  p5.textStyle(p5.BOLD)
  p5.textSize(p5.height / 4)
  p5.text('HYDRA', p5.width / 2, p5.height / 2 + Math.sin(p5.frameCount / 20) * 60)
}

// the previous frame, slightly zoomed and darkened, under the masked text
src(o0)
  .scale(1.015)
  .hue(0.01)
  .color(0.96, 0.96, 0.96)
  .layer(osc(30, 0.05, 1.4).mask(src(s0)))
  .out()
