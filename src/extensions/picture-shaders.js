// Shaders made for this editor from reference pictures. Unlike the vendored
// collections these are our own: each lives in
// public/extensions/picture-shaders/lib-<name>.js (one file per picture) and is
// listed here so the autoloader and the extensions window know about it.
//
// Entry fields, besides the ones every extension has (see ./registry.js):
//   picture   - what the shader was made from, for readers
//
// Add a file with pictureShader('<name>', { ... }) below. Its url points at the
// fork on jsDelivr so a `+`-added loadScript line also works in other hydra
// editors; here extensionsForURL maps it back to the local copy.

const DIR = 'picture-shaders'
export const PICTURE_SHADERS_CDN = `https://cdn.jsdelivr.net/gh/hesserrepi/hydra@main/public/extensions/${DIR}/`

export const pictureShader = (name, { thumbnail = true, ...rest }) => ({
  id: `${DIR}/${name}`,
  collection: DIR,
  name,
  author: 'hesserrepi',
  file: `${DIR}/lib-${name}.js`,
  url: `${PICTURE_SHADERS_CDN}lib-${name}.js`,
  // the file's header comment lists its functions and inputs
  documentation: `https://github.com/hesserrepi/hydra/blob/main/public/extensions/${DIR}/lib-${name}.js`,
  thumbnail: thumbnail ? `extensions/${DIR}/thumbnails/${name}.png` : undefined,
  autoload: true,
  ...rest
})

export const pictureShaders = [
  pictureShader('moebius', {
    picture: "photo of M.C. Escher's Möbius Strip I (1961)",
    description: 'A twisting Möbius band knotted into a trefoil, engraved with fine lines, with oval eyes cut through it. engrave() hatches any source the same way.',
    provides: { globals: ['moebius', 'moebiusColor'], methods: ['engrave'] },
    examples: [`moebiusColor()
  .out()`, `moebius(0.8, 0.13, 12, 3, 0.1)
  .modulate(noise(2, 0.2), 0.05)
  .mult(osc(20, 0.05, 1.2).kaleid(3))
  .out()`, `moebiusColor(0.8, 0.14, 16, 5, 0.2, 1, 0)
  .rotate(() => time * 0.05)
  .engrave(90, 0.6, 0.15, 1)
  .out()`]
  }),
  pictureShader('lissajous', {
    picture: 'photo of a printed table of Lissajous figures, ratios 1:1 to 5:6 against phase',
    description: 'Lissajous figures as oscilloscope traces: one figure with any frequencies, or the whole table of ratios and phase shifts.',
    provides: { globals: ['lissajous', 'lissajousTable'] },
    examples: [`lissajousTable(5, 8)
  .out()`, `lissajous(3, 4, 0, 0.006, 0.2)
  .color(0.6, 1, 0.7)
  .blend(src(o0).scale(1.01), 0.85)
  .out()`, `lissajous(5, 6, 0, 0.01, 0.1)
  .diff(lissajous(4, 5, 1, 0.01, -0.1).rotate(Math.PI / 2))
  .kaleid(4)
  .out()`]
  }),
  pictureShader('chladni', {
    picture: "photo of Chladni's sound figures, Entdeckungen über die Theorie des Klanges (1787), Tab. IX and X",
    description: "The nodal lines of a vibrating square plate, as on Chladni's sound figures: one plate that morphs between grids, crosses and rings, or a table of engraved plates.",
    provides: { globals: ['chladni', 'chladniTable'] },
    examples: [`chladniTable(4, 3)
  .out()`, `chladni(3, 5, -0.6, 0.004, 0.2, 1)
  .color(0.95, 0.85, 0.6)
  .out()`, `chladni(2, 7, 1, 0.006, 0.3)
  .modulate(lissajous(3, 4, 0, 0.01, 0.2), 0.05)
  .mult(osc(10, 0.1, 1.4))
  .out()`]
  })
]
