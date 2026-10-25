// textureOverlay() with your own texture image, like p5.grain's textureOverlay():
// the image is tiled at its own size. Put the file in public/ (or use any URL)
// and change the name below. Without an image this shows the shape untextured.
s0.initImage('my-texture.jpg')

shape(4, 0.6, 0.01)
  .color(0.2, 0.35, 0.8)
  .textureOverlay(s0, {
    mode: 'multiply',   // or p5's names: MULTIPLY, 'soft-light', DODGE, ...
    reflect: true,      // mirror every other tile so the edges meet
    animate: { fps: 12 } // jump to a random place 12 times a second (p5.grain: { atFrame: 5 })
  })
  .grain(0.06)
  .out()
