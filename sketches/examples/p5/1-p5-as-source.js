// p5 as a hydra source: p5 draws, hydra transforms.
// new P5() makes a p5 canvas in instance mode, so every p5 call starts with `p5.`
// Running the sketch again replaces the previous canvas.
p5 = new P5()
p5.hide() // hydra shows it through s0, not directly
s0.init({ src: p5.canvas })

// p5.draw runs every frame and can be redefined while live coding
p5.draw = () => {
  p5.background(0)
  p5.noStroke()
  p5.fill(255)
  p5.circle(p5.mouseX, p5.mouseY, 160)
  p5.rect(p5.width / 2 - 20, 0, 40, p5.height)
}

src(s0)
  .kaleid(4)
  .modulate(osc(6, 0.1), 0.1)
  .colorama(0.3)
  .out()
