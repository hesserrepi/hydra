// p5.js drawing functions written for this editor: generators that draw on a
// p5 canvas (new P5()), which hydra then uses as a source with
// s0.init({ src: p5.canvas }). Each lives in public/extensions/p5-forms/<name>.js
// (its header comment documents it) and is listed here so the autoloader and the
// extensions window know about it.
//
// The url points at the fork on jsDelivr so a `+`-added loadScript line also
// works in other hydra editors; here extensionsForURL maps it to the local copy.

const DIR = 'p5-forms'
export const P5_FORMS_CDN = `https://cdn.jsdelivr.net/gh/hesserrepi/hydra@main/public/extensions/${DIR}/`

const p5Form = (name, rest) => ({
  id: `${DIR}/${name}`,
  collection: DIR,
  name,
  author: 'hesserrepi',
  file: `${DIR}/${name}.js`,
  url: `${P5_FORMS_CDN}${name}.js`,
  documentation: `https://github.com/hesserrepi/hydra/blob/main/public/extensions/${DIR}/${name}.js`,
  thumbnail: `extensions/${DIR}/thumbnails/${name}.png`,
  autoload: true,
  ...rest
})

export const p5Forms = [
  p5Form('radiolaria', {
    description: 'Growing radiolarian skeletons after Haeckel\'s Stephoidea plate, drawn with p5: spiny rings, lattice spheres, cages, thorny arms, symbionts around a red capsule. Six forms, every option can change over time.',
    provides: { globals: ['radiolaria'] },
    examples: [`p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })
radiolaria.plate(p5)
src(s0).out()`, `p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })
r = radiolaria(p5, { form: 'bush', life: 'cycle', size: 0.45 })
p5.draw = () => { radiolaria.backdrop(p5); r.draw() }
src(s0).modulate(noise(2, 0.1), 0.01).out()`]
  }),
  p5Form('snowflake', {
    description: 'Snow crystals that grow like real ones, after Wilson Bentley\'s photomicrographs: a vapour-diffusion simulation on a hexagonal lattice grows plates, sectored plates, stellar and fern-like dendrites, with engraved relief. The weather can change while it grows; also a whole page and snowfall.',
    provides: { globals: ['snowflake'] },
    examples: [`p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })
snowflake.plate(p5)
src(s0).out()`, `p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })
f = snowflake(p5, { habit: 'bentley', life: 'cycle', size: 0.45 })
p5.draw = () => { snowflake.backdrop(p5); f.draw() }
src(s0).modulate(noise(1.2, 0.04), 0.004).out()`, `p5 = new P5()
p5.hide()
s0.init({ src: p5.canvas })
snowflake.snowfall(p5, { background: false })
gradient(0.02).r().color(0.06, 0.1, 0.22).layer(src(s0)).out()`]
  })
]
