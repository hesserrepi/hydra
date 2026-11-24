// The lemmas drift in out of the dust and settle into place, from the leaves
// towards the root; then the trunks light up and the goal is proved.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

tree = proofSpine.show(p5, {
  mode: 'assemble',
  shape: 'star',
  arms: 5,
  color: [0.55, 1, 0.6], // r, g, b 0-1
  vary: true // a new tree every run
})

src(s0)
  .modulate(osc(3, 0.03).rotate(0.7), 0.003)
  .out()

// try: tree.set({ shape: 'spiral', turns: 2 }), tree.set({ arms: 8 })
