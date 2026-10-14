// Run `npm run live`, then edit and save this file: the hydra tab runs it.
// In VS Code with the hydra extension, ctrl+enter runs a line, alt+enter a block
// and ctrl+shift+enter the whole file. Extensions load automatically.

osc(20, 0.05, 1.2)
  .kaleid(4)
  .screen(noise(3, 0.2).pm(), 0.6)
  .mirrorX2()
  .blend(o0, 0.4)
  .out()
