// p5 in 3D (WEBGL mode) layered over a hydra trail.
p5 = new P5({ mode: 'WEBGL' })
p5.hide()
s0.init({ src: p5.canvas })

p5.draw = () => {
  p5.clear()
  p5.normalMaterial()
  p5.rotateX(p5.frameCount * 0.01)
  p5.rotateY(p5.frameCount * 0.013)
  p5.torus(p5.height / 5, p5.height / 14, 48, 24)
}

src(o0)
  .scale(1.01)
  .rotate(0.003)
  .color(0.95, 0.95, 0.95)
  .layer(src(s0))
  .out()
