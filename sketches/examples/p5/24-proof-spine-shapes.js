// Every shape in turn, like the figures of a harmonograph: the tree grows, holds,
// fades, and grows again in the next shape. The 'harmonograph' shape follows a
// decaying Lissajous figure set by f1, f2 and damp.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

shapeRun = 14 + 4 + 1.5 // duration + hold + the fade between runs, in seconds
tree = proofSpine.show(p5, {
  mode: 'grow',
  shape: (t) => proofSpine.shapes[Math.floor(t / shapeRun) % proofSpine.shapes.length],
  f1: 3, // harmonograph frequencies
  f2: 4,
  color: '#d24dff',
  labels: 14
})

// or draw your own trunk: s runs from the root (0) to the tip (1)
// tree.set({ path: (s) => [0.3 * Math.sin(s * 9), s - 0.5] })

src(s0).out()
