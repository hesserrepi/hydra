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
a time on real hydra with the background in `o1` (number keys switch drafts),
with buttons for "just lit", "half", "nearly out" and "blown out", a burn time
slider, the draft's hydra block and a button that copies the whole sketch. The
code for it is in `lab.js`.
