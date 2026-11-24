// Compares the swarm parameter presets: press 1-9 to load one, 0 for the next, click to spawn.
// click to trigger a specimen by hand. The name and the level meter are drawn
// on the canvas, so a setting can be judged without reading the code.
// Start with 'silent-pulse' or 'silent-mouse' to test without a microphone.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

swarm = radiolaria.swarm(p5, { preset: 'silent-pulse', debug: true })
names = ['default']
radiolaria.loadPresets().then((index) => { names = index.presets.map((x) => x.name) })

show = (text) => {
  p5.push()
  p5.noStroke()
  p5.fill(255, 220)
  p5.textSize(14)
  p5.textFont('monospace')
  p5.text(text, 12, 24)
  p5.pop()
}

p5.draw = () => {
  swarm.draw()
  show(`${swarm.preset}   1-9 load   0 next   click spawn`)
}
p5.keyPressed = () => {
  const k = Number(p5.key)
  if (Number.isNaN(k)) return
  const i = k === 0 ? (names.indexOf(swarm.preset) + 1) % names.length : k - 1
  if (names[i]) swarm.clear(false).load(names[i])
}
p5.mousePressed = () => swarm.trigger()

src(s0).out()
