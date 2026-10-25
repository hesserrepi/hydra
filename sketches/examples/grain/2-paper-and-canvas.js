// Procedural textures to lay over a picture: paper(), weave() (canvas, linen) and dust().
// They are greyscale around white, so the default 'multiply' mode darkens the
// picture only where the texture has detail.
osc(4, 0.03, 0.9)
  .kaleid(3)
  .color(0.9, 0.6, 0.4)
  .textureOverlay(paper(1, 0.5, 0.8)) // scale, fibers, roughness, tone
  .textureOverlay(weave(140, 0.6, 0.6), { mode: 'softLight', amount: 0.7 })
  .textureOverlay(dust(0.3, 12, 0.4))
  .filmGrain(0.08)
  .out()
