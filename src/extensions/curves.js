// Simple geometric curves that keep evolving, written for this editor. Each
// lives in public/extensions/curves/ (its header comment documents it) and is
// listed here so the autoloader and the extensions window know about it.
// lib-*.js files are plain setFunction() shaders; the others draw on a canvas
// that hydra uses as a source.
//
// The url points at the fork on jsDelivr so a `+`-added loadScript line also
// works in other hydra editors; here extensionsForURL maps it to the local copy.

const DIR = 'curves'
export const CURVES_CDN = `https://cdn.jsdelivr.net/gh/hesserrepi/hydra@main/public/extensions/${DIR}/`

const curve = (name, file, rest) => ({
  id: `${DIR}/${name}`,
  collection: DIR,
  name,
  author: 'hesserrepi',
  file: `${DIR}/${file}`,
  url: `${CURVES_CDN}${file}`,
  documentation: `https://github.com/hesserrepi/hydra/blob/main/public/extensions/${DIR}/${file}`,
  thumbnail: `extensions/${DIR}/thumbnails/${name}.png`,
  autoload: true,
  ...rest
})

export const curves = [
  curve('harmonograph', 'harmonograph.js', {
    description: 'A pen swung by damped pendulums, like a Lissajous figure that spirals inward. When the swing dies down it restarts with frequencies that have drifted a little, so the drawing keeps evolving. Draws on a canvas used as s0.',
    provides: { globals: ['harmonograph'] },
    examples: [`harmonograph(s0)
src(s0).out()`, `harmonograph(s0, { f1: 3, f2: 4, detune: 0.02, mix: 0.6 })
src(s0)
  .color(1, 0.75, 0.45)
  .blend(src(o0).scale(1.006).rotate(0.003), 0.6)
  .out()`, `harmonograph(s0, { f1: 2, f2: 5, damp: 0.002, mix: () => 0.5 + 0.5 * Math.sin(time * 0.05) })
src(s0)
  .modulate(osc(4, 0.02).rotate(1.2), 0.003)
  .diff(src(s0).rotate(Math.PI / 2))
  .out()`]
  }),
  curve('superformula', 'lib-superformula.js', {
    description: "Gielis' superformula: one outline whose numbers m, n1, n2, n3 turn it into stars, flowers, polygons and blobs. superbloom() lets it morph on its own, with echo layers lagging behind.",
    provides: { globals: ['superformula', 'superbloom'] },
    examples: [`superbloom()
  .color(0.55, 0.75, 1)
  .blend(src(o0).scale(0.985).rotate(0.01).color(1, 0.85, 0.6), 0.6)
  .out()`, `superformula(() => 6 + 3 * Math.sin(time * 0.2), 0.4, [1, 4, 8].smooth(), 3)
  .out()`, `superbloom(5, 3, 0.6, 2, 1.2, 0.4, 6, 0.004, -0.1)
  .mult(osc(8, 0.05, 1.4).kaleid(5))
  .add(src(o0).scale(1.01), 0.7)
  .out()`]
  })
]
