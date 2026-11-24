# Candle drafts

Drafts for the "two candles burning down at the screen edges" effect, to pick a
direction before the real `candles()` p5 form (with a timed extinguish) gets built.

## Drafts 1 to 10: candles that work through hydra

p5 draws the candles in fine pencil (`s0`) and also paints a low-resolution map
(`s1`): light, heat, masks, wisps. Hydra uses that map on the background in `o1`
to light, bend, burn, melt or smoke it, so the effect follows whatever the
background is doing. Each sketch ends with a short hydra block that can be
changed like any hydra code (the `candleWax`, `candleBehind`, `candleSmoke` ...
functions are the parts meant to be swapped).

| # | File | What happens | What hydra does with p5's map |
|---|------|--------------|-------------------------------|
| 1 | `01-candlelight.js` | the picture drains to grey; colour only in pools of light round the flames, shrinking as they burn | grey copy of `o1`, coloured `o1` keyed by a light map |
| 2 | `02-heat-haze.js` | engraved candlesticks; a column of heat over each flame warps the picture | `modulate` by rising heat blobs, warm `add` |
| 3 | `03-made-of-signal.js` | the candles are cut out of the picture: inverted wax, colorama fire | three masks in one map (red, green, blue) via `keyBy` |
| 4 | `04-long-exposure.js` | moths circle the flames and leave light trails like a long exposure | feedback in `o2` fades the moths' paths |
| 5 | `05-burn-through.js` | each flame burns a hole in the picture with a glowing rim, growing all night | hole, rim and scorch masks; `candleBehind` shows through |
| 6 | `06-melting-picture.js` | wax runs off a shelf and drags the picture's colours down with it | `modulateScrollY` by "how far it has fallen" |
| 7 | `07-smoke-loop.js` | the smoke is a hydra feedback loop: lifted, curled, faded | `o2` feedback seeded by wisps at the flame tips |
| 8 | `08-sound-flame.js` | flames drawn by `a.fft`, wax as seismograph lines of what it heard | loud moments push and warm the picture |
| 9 | `09-word-candle.js` | each candle is a phrase up its side, eaten letter by letter from the top | letters filled with the inverted picture, ash keyed in grey |
| 10 | `10-roots.js` | roots grow from the candles into the picture while they burn | the picture cracks along the roots, inverted inside them |

Two small helpers are defined with `setFunction` in every sketch:

- `layerP5(tex)` lays a texture with straight alpha (like p5's canvas) over the
  picture. hyper-hydra's `layer()` expects premultiplied colour, which turns
  soft glows into white discs.
- `keyBy(map, r, g, b)` gives a texture the alpha of a channel mix of a map, so
  one p5 map can carry three masks (red, green, blue).

## Drafts 11 to 20: plain p5

Drawn entirely in p5 on `s0`; hydra only lays the drawing over the picture
(`src(o1).layerP5(src(s0)).out(o0)`). The looks borrow from hydra's world
(oscillators, interference, scanlines, mirrors, noise fields, live code) without
using hydra to make them.

| # | File | Look |
|---|------|------|
| 11 | `11-phosphor.js` | an oscilloscope beam traces the candle with a fading phosphor trail; the flame is a Lissajous knot; switches off to a dot |
| 12 | `12-moire.js` | hair-fine line sets turning against each other, so interference bands sweep the wax; the flame is two ring sets |
| 13 | `13-scanlines.js` | video scanlines split into red, green and blue, slipping, tearing and rolling; falls apart when it goes out |
| 14 | `14-kaleidoscope.js` | pencil candle with a turning ring of mirrored flames, curls and dots round the flame, shrinking as it burns |
| 15 | `15-chronophotograph.js` | after Marey: earlier "exposures" of the candle stay on the plate in white, stepping out with their times |
| 16 | `16-halftone.js` | two-colour riso halftone, screens drifting out of register, dots peeling off the rim and flame and swirling away |
| 17 | `17-embroidery.js` | running stitch, satin-stitch wax and flame; stitches pulled out as it burns, needle holes, loose ends, a needle |
| 18 | `18-live-code.js` | the candle typed out of your hydra code, scrolling and coloured like the editor; a flame of flickering glyphs |
| 19 | `19-brushstrokes.js` | short thick strokes on a moving flow field, a turning swirl of strokes round each flame |
| 20 | `20-patent-drawing.js` | patent figure: hatching, centre line, numbered parts, a height dimension in mm and "out in mm:ss" |

## Shared bits

All drafts share a hand-drawn line kit (`hdStroke` and friends, the same block in
every file): lines wander off their path, change pressure, lift off and pick up
paper grain, and "boil" a few times a second. `hdInto(map, fn)` draws with the
same kit into one of the low-resolution maps. `candleHalo` draws a thin
contrasting edge under the lines so they stay readable over a busy picture.

Each file is a complete editor sketch: paste it into the editor and run it.
`candleBurn` is the burn time in seconds (120 by default). For the drafts the
candles burn down, go out, wait `candleOut` seconds and relight. The sketches
never assign `a`, `time`, `mouse`, `osc`, `o0`-`o3` or `s0`-`s3`.

## Preview

Run `npm run dev` and open
http://localhost:5173/sketches/drafts/candles/preview.html. It runs one draft at
a time on real hydra with the background in `o1` (keys 1 to 0 pick drafts 1 to
10, with Shift for 11 to 20), with buttons for "just lit", "half", "nearly out"
and "blown out", a burn time slider, the draft's hydra block (or its drawing
code, for the plain p5 ones) and a button that copies the whole sketch. The code
for it is in `lab.js`.
