// Candle draft 1/10: classic. Ivory wax candles on brass saucers, a soft warm
// glow, a flickering flame and wax drips that slide down as the candle melts.
// Paste into the editor and run it (Ctrl+Shift+Enter).
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

classicCandle = (x, base, side, c) => {
  const ctx = p5.drawingContext
  const s = Math.min(p5.width, p5.height)
  const w = s * 0.075
  const h = p5.height * 0.55 * (0.1 + 0.9 * c.left)
  const top = base - h
  const flick = p5.noise(c.t * 6 + side * 40)

  // warm glow on the wall behind
  if (c.lit) {
    const r = s * (0.42 + 0.05 * flick)
    const g = ctx.createRadialGradient(x, top - w * 0.6, 0, x, top - w * 0.6, r)
    g.addColorStop(0, 'rgba(255,190,110,0.38)')
    g.addColorStop(0.35, 'rgba(255,140,60,0.12)')
    g.addColorStop(1, 'rgba(255,120,40,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, top - w * 0.6 - r, r * 2, r * 2)
  }

  // body, shaded across its width
  const body = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  body.addColorStop(0, '#b9a582')
  body.addColorStop(0.35, '#f6ecd6')
  body.addColorStop(0.6, '#efe2c4')
  body.addColorStop(1, '#8f7c5c')
  ctx.fillStyle = body
  p5.noStroke()
  ctx.fillRect(x - w / 2, top, w, h)

  // drips hang from the rim; their length depends on how long the candle has burned
  p5.fill(250, 242, 222)
  p5.stroke(170, 150, 115, 120)
  p5.strokeWeight(1)
  for (let i = 0; i < 4; i++) {
    const dx = (p5.noise(i * 3.1 + side * 9) - 0.5) * w * 0.9
    const len = Math.min(h - w * 0.1, w * (0.4 + 1.6 * p5.noise(i * 1.7 + side * 5, c.t * 0.02)))
    p5.rect(x + dx - w * 0.07, top, w * 0.14, len, w * 0.07)
    p5.circle(x + dx, top + len, w * 0.17)
  }

  // melted top and wick
  p5.noStroke()
  p5.fill(c.lit ? p5.color(255, 236, 200) : p5.color(232, 220, 196))
  p5.ellipse(x, top, w, w * 0.28)
  p5.fill(c.lit ? p5.color(255, 214, 150, 160) : p5.color(210, 196, 170))
  p5.ellipse(x, top, w * 0.7, w * 0.17)
  p5.stroke(30)
  p5.strokeWeight(Math.max(1, w * 0.05))
  p5.noFill()
  const sway = c.lit ? (flick - 0.5) * w * 0.3 : 0
  p5.bezier(x, top, x, top - w * 0.15, x + sway * 0.3, top - w * 0.2, x + sway * 0.4, top - w * 0.3)

  // brass saucer
  p5.noStroke()
  p5.fill(120, 84, 36)
  p5.ellipse(x, base + w * 0.12, w * 2.4, w * 0.5)
  p5.fill(196, 150, 72)
  p5.ellipse(x, base, w * 2.2, w * 0.4)

  if (c.lit) classicFlame(x + sway * 0.4, top - w * 0.25, w, flick, c.t + side)
  else classicSmoke(x, top - w * 0.3, w, c)
}

classicFlame = (x, y, w, flick, t) => {
  const ctx = p5.drawingContext
  const fh = w * (1.5 + 0.35 * flick)
  const lean = (p5.noise(t * 3) - 0.5) * w * 0.6
  const tear = (sx, sy, col) => {
    p5.fill(col)
    p5.beginShape()
    p5.vertex(x + lean * sy, y - fh * sy)
    p5.bezierVertex(x + w * 0.45 * sx, y - fh * 0.35 * sy, x + w * 0.4 * sx, y + w * 0.12, x, y + w * 0.12)
    p5.bezierVertex(x - w * 0.4 * sx, y + w * 0.12, x - w * 0.45 * sx, y - fh * 0.35 * sy, x + lean * sy, y - fh * sy)
    p5.endShape(p5.CLOSE)
  }
  p5.noStroke()
  ctx.shadowColor = 'rgba(255,170,60,0.9)'
  ctx.shadowBlur = w * 0.8
  tear(1, 1, p5.color(255, 150, 40, 200))
  ctx.shadowBlur = 0
  tear(0.7, 0.8, p5.color(255, 214, 110))
  tear(0.42, 0.55, p5.color(255, 250, 225))
  p5.fill(80, 120, 255, 90)
  p5.ellipse(x, y + w * 0.06, w * 0.22, w * 0.12)
}

classicSmoke = (x, y, w, c) => {
  if (c.outFor > candleOut) return
  const fade = 1 - c.outFor / candleOut
  p5.noFill()
  p5.strokeWeight(Math.max(1, w * 0.07))
  p5.stroke(210, 205, 200, 160 * fade)
  p5.beginShape()
  for (let i = 0; i < 30; i++) {
    const k = i / 30
    p5.curveVertex(x + (p5.noise(k * 3 - c.t * 0.8, x) - 0.5) * w * 3 * k, y - k * w * 6 - c.outFor * w * 0.4)
  }
  p5.endShape()
}

p5.draw = () => {
  const c = candleClock()
  if (candleBackground) p5.background(34, 24, 20)
  else p5.clear()
  const base = p5.height * 0.92
  classicCandle(p5.width * 0.09, base, 0, c)
  classicCandle(p5.width * 0.91, base, 1, c)
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
