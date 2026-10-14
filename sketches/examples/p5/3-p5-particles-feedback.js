// p5 particles fed into a hydra feedback loop.
// Uses screen() from hyper-hydra's blend modes, which loads automatically.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

const dots = Array.from({ length: 120 }, () => ({
  x: p5.random(p5.width),
  y: p5.random(p5.height),
  angle: p5.random(p5.TWO_PI)
}))

p5.draw = () => {
  p5.clear() // transparent, so only the dots reach hydra
  p5.noStroke()
  dots.forEach((d, i) => {
    d.angle += (p5.noise(d.x * 0.002, d.y * 0.002, p5.frameCount * 0.005) - 0.5) * 0.3
    d.x = (d.x + Math.cos(d.angle) * 3 + p5.width) % p5.width
    d.y = (d.y + Math.sin(d.angle) * 3 + p5.height) % p5.height
    p5.fill(255, 150 + 100 * Math.sin(i))
    p5.circle(d.x, d.y, 6)
  })
}

src(o0)
  .scale(0.995)
  .rotate(0.002)
  .hue(0.004)
  .color(0.97, 0.97, 0.97)
  .screen(src(s0).colorama(0.2))
  .out()
