# Candle style drafts

Ten looks for the "two candles burning down at the screen edges" effect, to pick a
style before the real `candles()` p5 form (with a timed extinguish) gets built.

| # | File | Style |
|---|------|-------|
| 1 | `01-graphite.js` | fine shaky graphite line, pale wax, outlines that never quite meet |
| 2 | `02-botanical.js` | sepia ink, leaves and roots, a tendril the flame eats as it burns |
| 3 | `03-charcoal-goth.js` | heavy charcoal, black wax, red pencil drips, low iron stand |
| 4 | `04-riso.js` | two-ink risograph, drifting misregistration, dots swirling off and fading |
| 5 | `05-gold-line.js` | single gold line, halo rings, rising motes, low curling holder |
| 6 | `06-moths.js` | sepia vanitas: moths circle the flame and scatter when it goes out |
| 7 | `07-cyanotype.js` | white sun print on a brushed Prussian-blue sheet, with ferns |
| 8 | `08-etching.js` | engraved baroque candlestick, contour hatching, flame of fine rays |
| 9 | `09-sumi-brush.js` | bold dry-brush ink, vermilion flame, red seal, smoke written across the sky |
| 10 | `10-constellation.js` | the candle as linked stars on a round star chart, sparks drifting off |

All ten share a small hand-drawn line kit (`hdStroke` and friends, the same
block in every file): lines wander off their path, change pressure, lift
off and pick up paper grain, and "boil" a few times a second. Hydra also
wobbles the finished candles slightly (`candleLayer`). Only the flame glows.
`candleHalo` draws a thin contrasting edge under the lines so they stay
readable over a busy hydra picture; set it to `false` for bare lines.

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
