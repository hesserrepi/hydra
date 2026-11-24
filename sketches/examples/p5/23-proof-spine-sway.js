// Fully grown and alive: the branches sway like weed in a current, the halos
// breathe, and pulses of light run from the branch tips into the trunk. The
// colour can be a function of time; here its hue drifts slowly.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

tree = proofSpine.show(p5, {
  mode: 'sway',
  shape: 'fan',
  color: (t) => (0.8 + t * 0.01) % 1, // a hue 0-1
  sway: 1.2 // how far they sway (also works in the other modes)
})

// a slow feedback trail; the tree's background is opaque so it doesn't build up
src(s0)
  .blend(src(o0).scale(1.002).rotate(0.0005), 0.6)
  .out()

// try: tree.set({ shape: 'ring' }), tree.set({ sway: 3 }), tree.set({ halo: 2 })
