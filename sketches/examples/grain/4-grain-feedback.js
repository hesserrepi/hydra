// Grain inside feedback builds up like a mezzotint; keep the amount small.
// Grain that stands still (fps 0) turns into a fixed texture, moving grain into a shimmer.
src(o0)
  .scale(1.005)
  .rotate(0.002)
  .blend(osc(20, 0.05, 1.3).mask(shape(3, 0.3, 0.2)), 0.08)
  .grain(0.02, 30)
  .textureOverlay(paper(2), { amount: 0.05 })
  .out()
