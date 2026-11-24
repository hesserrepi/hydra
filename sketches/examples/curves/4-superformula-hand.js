// The superformula with every number in your hands: functions, arrays and the mouse.
superformula(
  () => 3 + 9 * mouse.x / width,              // m: move the mouse left and right
  () => 0.3 + 4 * mouse.y / height,           // n1: up and down
  [1, 4, 0.5, 8].smooth(),                    // n2 cycles with the bpm
  () => 2 + Math.sin(time * 0.3),             // n3
  0.8, 0.005, 0.1,
  () => time * 0.1                            // turn
)
  .mult(osc(6, 0.05, 1.2).kaleid(6))
  .add(src(o0).scale(1.012), 0.75)
  .out()
