# Candle style drafts

Ten looks for the "two candles burning down at the screen edges" effect, to pick a
style before the real `candles()` p5 form (with a timed extinguish) gets built.

| # | File | Style |
|---|------|-------|
| 1 | `01-graphite.js` | fine shaky graphite line, outlines that never quite meet |
| 2 | `02-botanical.js` | sepia ink, candles growing from a tuft of leaves with roots |
| 3 | `03-charcoal-goth.js` | heavy charcoal, iron stands, red pencil wax, endless smoke thread |
| 4 | `04-ink-and-wash.js` | pen line with off-register watercolour washes |
| 5 | `05-riso.js` | two-ink risograph, drifting misregistration, dot grain |
| 6 | `06-neon-pastel.js` | fluorescent oil-pastel scribbles with a soft glow |
| 7 | `07-linocut.js` | hand-cut lino: uneven black shapes, white gouges, cut rays |
| 8 | `08-gold-line.js` | single gold line, halo rings, whiplash flame |
| 9 | `09-paper-cutout.js` | torn paper in Bauhaus colours, stop-motion jitter |
| 10 | `10-chalk.js` | heavy broken chalk on a slate smudge |

All ten share a small hand-drawn line kit (`hdStroke` and friends, the same
block in every file): lines wander off their path, change pressure, lift
off and pick up paper grain, and "boil" a few times a second. Hydra also
wobbles the finished candles slightly (`candleLayer`). `candlePaper` sets the
soft patch of paper (or slate) behind each candle that keeps fine lines
readable over a busy hydra picture; set it to 0 to drop it.

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
