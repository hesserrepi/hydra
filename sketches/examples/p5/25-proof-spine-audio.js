// The tree listens: it grows with the music and almost stops in silence, sways
// and glows with the loudness, and every beat sends a pulse along the trunk.
// Allow the microphone when the browser asks.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

a.setBins(4)
a.setSmooth(0.6)
// a.show() // shows the bins and the cutoff; raise a.setCutoff(2) if quiet sounds trigger it

tree = proofSpine.show(p5, {
  mode: 'grow',
  audio: true, // hydra's microphone, all bins averaged; or 0 for a.fft[0], or () => a.fft[0] * 2
  audioTo: ['speed', 'sway', 'glow', 'strike'], // also 'progress': loud = fully grown, quiet = shrinks back
  audioGain: 1.5,
  audioFloor: 0.1, // speed in silence
  audioPeak: 0.5 // how loud a beat must be
})

src(s0)
  .modulate(noise(2, 0.1), () => 0.002 + a.fft[0] * 0.01)
  .out()

// try: tree.set({ mode: 'lightning' })  every beat is a strike
//      tree.set({ audioTo: 'progress', mode: 'search' })
//      tree.set({ audio: 0, audioTo: ['strike', 'glow'] })  the bass only
