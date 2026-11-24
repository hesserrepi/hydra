// A harmonograph that never settles: it spirals in, then the pendulums drift a little and swing again.
// harmonograph() loads automatically; its options are documented in
// public/extensions/curves/harmonograph.js. Run again to start over.
h = harmonograph(s0, {
  f1: 2, f2: 3,     // pendulum frequencies; whole-number ratios close the figure
  detune: 0.012,    // a slight mistuning makes the figure turn as it decays
  mix: 0.35,        // the third, rotary pendulum
  damp: 0.003,      // friction: higher spirals in faster
  drift: 0.02       // how far the frequencies wander at each new swing
})

// tinted, with a slow rotating echo of the previous frames
src(s0)
  .color(1, 0.75, 0.45)
  .blend(src(o0).scale(1.006).rotate(0.003), 0.6)
  .modulate(osc(4, 0.02).rotate(1.2), 0.002)
  .out()

// try: h.next(), h.set({ f1: 3, f2: 4 }), h.set({ mix: () => 0.5 + 0.5 * Math.sin(time * 0.1) })
