# Candle style drafts

Ten looks for the "two candles burning down at the screen edges" effect, to pick a
style before the real `candles()` p5 form (with a timed extinguish) gets built.

| # | File | Style |
|---|------|-------|
| 1 | `01-classic.js` | ivory wax, brass saucer, warm glow, realistic flame |
| 2 | `02-ink.js` | pen sketch on paper, boiling lines, cross-hatching |
| 3 | `03-goth.js` | black candles bleeding red wax on wrought-iron stands |
| 4 | `04-watercolor.js` | translucent washes with pooled edges |
| 5 | `05-pixel.js` | 8-bit, 4-frame flame, dithered glow |
| 6 | `06-neon.js` | neon tubes on a synthwave floor, stuttering flame |
| 7 | `07-woodcut.js` | black-and-cream block print, carved rays |
| 8 | `08-nouveau.js` | Mucha-style gold halos and curling holders |
| 9 | `09-bauhaus.js` | flat primary shapes, pulsing rings |
| 10 | `10-chalk.js` | chalk on a smudged slate |

Each file is a complete editor sketch: paste it into the editor and run it. The
candles are drawn with p5 on a transparent canvas (`s0`) and layered over a hydra
background (Hesse's glow / voronoi feedback, rendered in `o1`). Set
`candleBackground = true` to see the draft's own backdrop instead. `candleBurn`
is the burn time in seconds (120 by default). For the drafts the candles burn
down, go out with a puff of smoke, wait `candleOut` seconds and relight.

The sketches combine p5 and hydra with `layerP5`, defined in each sketch with
`setFunction`: p5's canvas has straight alpha, while hyper-hydra's `layer()`
expects premultiplied colour, which turns soft glows into white discs.

To see all ten side by side, run `npm run dev` and open
http://localhost:5173/sketches/drafts/candles/preview.html. The buttons jump
every draft to "just lit", "half", "nearly out" and "blown out", and the slider
sets the burn time (30 s there, so a full cycle is quick). The preview runs
without hydra, so untick "Draft backdrops" to see the transparent version on a
chequerboard.
