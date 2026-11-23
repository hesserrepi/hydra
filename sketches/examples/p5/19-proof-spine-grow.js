// A proof tree growing from its root: the trunk creeps down, branches unfurl as it
// passes them and the lemma names fade in. proofSpine() loads automatically; every
// option is documented in public/extensions/p5-forms/proof-spine.js.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

tree = proofSpine(p5, {
  mode: 'grow', // 'grow', 'lightning', 'search', 'assemble', 'sway' or 'still'
  shape: 'spine', // 'spine', 'fan', 'river', 'spiral', 'ring', 'star', 'harmonograph'
  color: '#d24dff', // any CSS colour, [r, g, b] or a hue 0-1
  duration: 14, // seconds to grow
  hold: 4 // seconds it stays grown, then it fades and grows again
})
p5.draw = () => tree.draw()

src(s0)
  .modulate(noise(1.5, 0.05), 0.004)
  .out()

// try: tree.reseed(), tree.set({ color: '#ffb347' }), tree.set({ vary: true })
