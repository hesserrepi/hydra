// Candle draft 3/10: goth. Black pillar candles bleeding red wax on tall
// wrought-iron stands, a cold violet room and a red-hearted flame.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

candleBurn = 120 // seconds from full height to a stub
candleOut = 6 // draft only: seconds it stays out (smoking) before it relights
candleBackground = false // true paints this draft's own backdrop; false keeps it transparent so hydra shows behind
candleT0 = p5.millis()
candleClock = () => {
  const t = (p5.millis() - candleT0) / 1000
  const cycle = t % (candleBurn + candleOut)
  return { t, left: Math.max(0, 1 - cycle / candleBurn), lit: cycle < candleBurn, outFor: cycle - candleBurn }
}

gothStand = (x, base, w) => {
  // wrought-iron stand: a spiked dish on a twisted stem with claw feet
  const ctx = p5.drawingContext
  p5.fill(14, 10, 16)
  p5.stroke(96, 70, 108)
  p5.strokeWeight(1)
  p5.beginShape()
  p5.vertex(x - w * 1.3, base)
  p5.vertex(x + w * 1.3, base)
  p5.vertex(x + w * 0.5, base + w * 0.35)
  p5.vertex(x - w * 0.5, base + w * 0.35)
  p5.endShape(p5.CLOSE)
  for (const sx of [-1.3, -0.65, 0.65, 1.3]) p5.triangle(x + sx * w - w * 0.08, base, x + sx * w + w * 0.08, base, x + sx * w * 1.05, base - w * 0.35)
  const footY = p5.height * 0.98
  p5.rect(x - w * 0.12, base + w * 0.35, w * 0.24, footY - base - w * 0.35)
  for (let y = base + w * 0.6; y < footY - w * 0.6; y += w * 0.5) p5.ellipse(x, y, w * 0.45, w * 0.22)
  p5.noFill()
  p5.strokeWeight(w * 0.12)
  p5.stroke(60, 44, 70)
  p5.bezier(x, footY - w * 0.8, x - w * 0.4, footY - w * 0.4, x - w * 1.0, footY - w * 0.6, x - w * 1.1, footY)
  p5.bezier(x, footY - w * 0.8, x + w * 0.4, footY - w * 0.4, x + w * 1.0, footY - w * 0.6, x + w * 1.1, footY)
  ctx.lineCap = 'round'
}

gothCandle = (x, base, side, c) => {
  const ctx = p5.drawingContext
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.085
  const h = p5.height * 0.42 * (0.1 + 0.9 * c.left)
  const top = base - h
  const flick = p5.noise(c.t * 7 + side * 30)

  if (c.lit) {
    const r = s * (0.5 + 0.06 * flick)
    const g = ctx.createRadialGradient(x, top - w, 0, x, top - w, r)
    g.addColorStop(0, 'rgba(200,40,40,0.35)')
    g.addColorStop(0.4, 'rgba(110,20,60,0.12)')
    g.addColorStop(1, 'rgba(60,0,60,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, top - w - r, r * 2, r * 2)
  }

  gothStand(x, base, w)

  const body = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  body.addColorStop(0, '#050406')
  body.addColorStop(0.3, '#2b2630')
  body.addColorStop(0.45, '#151217')
  body.addColorStop(1, '#030203')
  ctx.fillStyle = body
  p5.noStroke()
  ctx.fillRect(x - w / 2, top, w, h)

  // red wax runs down the black candle and gathers on the dish
  const melted = 1 - c.left
  p5.fill(120, 6, 14)
  p5.ellipse(x, base - w * 0.02, w * (1.2 + 0.9 * melted), w * 0.22)
  for (let i = 0; i < 5; i++) {
    const dx = (i / 4 - 0.5) * w * 0.9
    const len = Math.min(h * 0.85, w * (0.2 + 1.8 * p5.noise(i * 2.3 + side * 7)) * (0.3 + melted * 1.4))
    const dw = w * (0.08 + 0.06 * p5.noise(i + side))
    p5.fill(130 + 30 * p5.noise(i), 8, 16)
    p5.rect(x + dx - dw / 2, top, dw, len, 0, 0, dw, dw)
    p5.circle(x + dx, top + len, dw * 1.35)
  }
  p5.fill(150, 10, 20)
  p5.ellipse(x, top, w, w * 0.26)
  p5.fill(c.lit ? p5.color(200, 30, 30) : p5.color(90, 10, 16))
  p5.ellipse(x, top, w * 0.75, w * 0.17)
  p5.stroke(10)
  p5.strokeWeight(Math.max(1, w * 0.05))
  p5.line(x, top, x, top - w * 0.25)

  const fy = top - w * 0.25
  if (c.lit) {
    const fh = w * (1.6 + 0.4 * flick)
    const lean = (p5.noise(c.t * 2.4 + side * 3) - 0.5) * w * 0.7
    const tear = (sx, sy, col) => {
      p5.fill(col)
      p5.beginShape()
      p5.vertex(x + lean * sy, fy - fh * sy)
      p5.bezierVertex(x + w * 0.4 * sx, fy - fh * 0.3 * sy, x + w * 0.32 * sx, fy + w * 0.1, x, fy + w * 0.1)
      p5.bezierVertex(x - w * 0.32 * sx, fy + w * 0.1, x - w * 0.4 * sx, fy - fh * 0.3 * sy, x + lean * sy, fy - fh * sy)
      p5.endShape(p5.CLOSE)
    }
    p5.noStroke()
    ctx.shadowColor = 'rgba(255,40,40,0.9)'
    ctx.shadowBlur = w
    tear(1, 1, p5.color(210, 40, 50, 220))
    ctx.shadowBlur = 0
    tear(0.7, 0.75, p5.color(255, 150, 120))
    tear(0.4, 0.5, p5.color(255, 235, 225))
  }
  // a thin thread of smoke always rises; when the flame dies it billows
  const smoke = c.lit ? 0.25 : Math.max(0, 1 - c.outFor / candleOut)
  p5.noFill()
  p5.strokeWeight(w * (c.lit ? 0.04 : 0.09))
  p5.beginShape()
  for (let i = 0; i < 40; i++) {
    const k = i / 40
    p5.stroke(160, 150, 170, 140 * smoke * (1 - k))
    p5.curveVertex(x + (p5.noise(k * 2 - c.t * 0.4, side * 9) - 0.5) * w * 4 * k, fy - w * 2 - k * s * 0.5)
  }
  p5.endShape()
}

p5.draw = () => {
  const ctx = p5.drawingContext
  const c = candleClock()
  const g = ctx.createRadialGradient(p5.width / 2, p5.height * 0.45, 0, p5.width / 2, p5.height * 0.45, p5.width * 0.7)
  g.addColorStop(0, '#1d1124')
  g.addColorStop(1, '#050307')
  ctx.fillStyle = g
  if (candleBackground) ctx.fillRect(0, 0, p5.width, p5.height)
  else p5.clear()
  const base = p5.height * 0.62
  gothCandle(p5.width * 0.1, base, 0, c)
  gothCandle(p5.width * 0.9, base, 1, c)
}

// hydra background (Hesse's), drawn into o1 so the candles stay crisp on top of the feedback
o1.setLinear()
a.show()

_factor = 1
a_factor = [0.5, 0.87, 0.2, 0.75, 0.55, 0.92, -0.3, 0.5].smooth().fast(0.1)
osc(16, -0.1, 1)
  .glow(src(o1).invert().modulateRotate(o1), a_factor)
  .modulate(voronoi(64, 1, 2))
  .blend(o1)
  .out(o1)

// p5's canvas arrives with straight (not premultiplied) alpha, but hyper-hydra's layer()
// expects premultiplied colour, which turns soft glows into white discs. This blends it right.
setFunction({
  name: 'layerP5',
  type: 'combine',
  inputs: [],
  glsl: 'return vec4(mix(_c0.rgb, _c1.rgb, _c1.a), max(_c0.a, _c1.a));'
})
src(o1).layerP5(src(s0)).out(o0)
render(o0)
// to let the candles melt into the feedback instead, use o0 in place of o1 above,
// end that chain with .layerP5(src(s0)).out() and drop the last two lines
