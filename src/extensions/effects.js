// Effects written for this editor (interactive ones like ink, and filters like grain). Like the picture shaders these
// are our own, not vendored: each lives in public/extensions/effects/hydra-<name>.js
// (its header comment documents it) and is listed here so the autoloader and
// the extensions window know about it.
//
// The url points at the fork on jsDelivr so a `+`-added loadScript line also
// works in other hydra editors; here extensionsForURL maps it to the local copy.

const DIR = 'effects'
export const EFFECTS_CDN = `https://cdn.jsdelivr.net/gh/hesserrepi/hydra@main/public/extensions/${DIR}/`

const effect = (name, rest) => ({
  id: `${DIR}/${name}`,
  collection: DIR,
  name: `hydra-${name}`,
  author: 'hesserrepi',
  file: `${DIR}/hydra-${name}.js`,
  url: `${EFFECTS_CDN}hydra-${name}.js`,
  documentation: `extensions/${DIR}/hydra-${name}.js`,
  autoload: true,
  ...rest
})

export const effects = [
  effect('ink', {
    description: 'Click and drag to push the colours around like ink on water. Modes: push (smear), fluid (stirred fluid) and comb (marbling, hold still to drop ink).',
    provides: { globals: ['ink'], methods: ['ink'] },
    examples: [`osc(6, 0.3, 0.8)
  .color(1, 0.5, 0.4)
  .ink('comb')
  .out()`, `noise(3, 0.1)
  .color(1, 0.4, 0.8)
  .out(o1)
ink(o1, 'fluid', { radius: 0.1 })
  .out(o0)`, `osc(30, 0.02, 1.4)
  .kaleid(4)
  .ink('push', { relax: 0.3 })
  .out()`]
  }),
  effect('grain', {
    description: 'Grain and paper textures after p5.grain, as shaders: monochromatic, chromatic and film grain, paper, canvas weave and film dust, and textureOverlay() to blend any texture or image over a source.',
    provides: { globals: ['paper', 'weave', 'dust'], methods: ['grain', 'chromaGrain', 'filmGrain', 'textureOverlay', 'textureBlend', 'textureTile'] },
    examples: [`osc(8, 0.05, 1.2)
  .kaleid(5)
  .grain(0.12)
  .out()`, `gradient(0.5)
  .color(1, 0.7, 0.4)
  .textureOverlay(paper(), 'multiply')
  .filmGrain(0.1, 24, 1.5)
  .out()`, `shape(4, 0.5, 0.01)
  .color(0.2, 0.3, 0.8)
  .textureOverlay(weave(), { mode: 'softLight' })
  .textureOverlay(dust(0.4))
  .chromaGrain(0.05)
  .out()`]
  })
]
