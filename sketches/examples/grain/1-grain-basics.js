// Grain on any hydra source, after p5.grain, without p5.
// grain() is applyMonochromaticGrain, chromaGrain() is applyChromaticGrain.
// The amount is 0..1, or p5.grain's 0..255 scale when above 1: grain(42).
// All grain functions load automatically; see public/extensions/effects/hydra-grain.js.
osc(8, 0.05, 1.2)
  .kaleid(5)
  .grain(0.12) // amount, fps (new grain per second, 0 = still), size in pixels, seed
  .out(o0)

noise(3, 0.1)
  .color(1, 0.6, 0.3)
  .chromaGrain(42, 0) // p5.grain's applyChromaticGrain(42), standing still
  .out(o1)

gradient(0.3)
  .filmGrain(0.15, 24, 1.5) // softer grain that shows most in the mid tones
  .out(o2)

shape(5, 0.4, 0.02)
  .color(0.9, 0.4, 0.3)
  .textureOverlay(paper())
  .grain(() => 0.05 + 0.05 * Math.sin(time))
  .out(o3)

render()
