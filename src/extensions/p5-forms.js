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
  })
]
