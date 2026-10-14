// p5 as a controller: its mouse and keyboard state drive hydra parameters.
// Nothing is drawn with p5 here; it only reads input.
p5 = new P5()
p5.hide()

shapeSides = 3 // global, so the blocks below can be re-run on their own
p5.keyPressed = () => {
  if (p5.key >= '1' && p5.key <= '9') shapeSides = Number(p5.key) + 2
}

shape(() => shapeSides, 0.3, 0.01)
  .repeat(3, 3)
  .rotate(() => p5.mouseX / p5.width * Math.PI * 2)
  .modulate(noise(2, 0.1), () => p5.mouseY / p5.height * 0.5)
  .color(() => p5.mouseIsPressed ? 1 : 0.2, 0.6, 1)
  .out()
