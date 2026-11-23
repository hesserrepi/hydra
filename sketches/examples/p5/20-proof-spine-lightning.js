// Lightning: a stepped leader zigzags along the trunk, the whole tree flashes,
// flickers and dies down. Every strike is a new tree.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

tree = proofSpine.show(p5, {
  mode: 'lightning',
  color: '#8fd3ff',
  period: 3.5, // seconds between strikes
  afterglow: 0.1, // how much of the last tree stays visible
  legend: false
})

// a short echo of the last frames makes the flicker linger
src(s0)
  .blend(src(o0).scale(1.003), 0.45)
  .out()

// try: tree.set({ shape: 'star', arms: 6 }), tree.set({ afterglow: 0.3 })
