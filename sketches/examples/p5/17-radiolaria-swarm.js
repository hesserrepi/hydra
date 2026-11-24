// A radiolarian appears at a random free position on every bass peak, then dissolves.
// a few seconds and dissolves again. The parameters come from a JSON file in
// public/extensions/p5-forms/presets/radiolaria-swarm/.
// The browser asks for microphone access the first time.
p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })

swarm = radiolaria.swarm(p5, { preset: 'default', debug: true, draw: true })

// a.show() draws hydra's own fft meter, so the threshold can be tuned:
//   swarm.set({ threshold: 0.8, cooldown: 0.5, max: 6 })
//   swarm.load('storm')     // another parameter set
//   swarm.trigger()         // spawn one by hand

src(s0)
  .blend(src(o0).scale(1.006).rotate(0.0008), 0.45)
  .out()
