// Curves: superformula
// Johan Gielis' superformula (2003): one closed outline whose four numbers turn
// it into stars, flowers, polygons, leaves and blobs.
//
//   r(phi) = ( |cos(m phi / 4)|^n2 + |sin(m phi / 4)|^n3 )^(-1 / n1)
//
// superformula(m, n1, n2, n3, size, thick, fill, turn)
//     one outline, white on black. Give any input a function to animate it.
//     m      symmetry: how many lobes go round the outline
//     n1     low pinches into a star, high puffs out into a blob
//     n2, n3 low makes sharp petals, high makes square-ish sides
//     size   radius, 1 = half the canvas height
//     thick  line half width, in the same units
//     fill   brightness of the inside, 0 = outline only
//     turn   rotation in radians (keeps the shape round on wide canvases, unlike .rotate())
//
// superbloom(m, wander, n1, n23, nWander, speed, layers, thick, spin)
//     the same outline left to morph on its own: m, n1, n2 and n3 wander on slow
//     waves around the values given, and up to 8 echo layers lag behind in time,
//     each smaller and dimmer than the last.
//     m       centre of the symmetry
//     wander  how far m drifts from it
//     n1      centre of n1
//     n23     centre of n2 and n3
//     nWander how strongly n1, n2, n3 wander (multiplied by e^(nWander * wave))
//     speed   how fast it morphs
//     layers  1 to 8 outlines
//     thick   line half width
//     spin    turning speed, radians per second
//
// A fractional m does not close over one turn, so the outline is drawn as a
// blend of the shapes at the whole numbers either side of it (like lissajous()):
// m can glide from 5 to 6 without the outline breaking open. The radius is
// divided by its largest possible value so the shape always fits.
(() => {
  // r(phi) for symmetry M, blended between floor(M) and floor(M) + 1
  const sf = (phi, M, N1, N2, N3) => `mix(
      pow(pow(abs(cos(floor(${M}) * (${phi}) / 4.0)), ${N2}) + pow(abs(sin(floor(${M}) * (${phi}) / 4.0)), ${N3}), -1.0 / ${N1}),
      pow(pow(abs(cos((floor(${M}) + 1.0) * (${phi}) / 4.0)), ${N2}) + pow(abs(sin((floor(${M}) + 1.0) * (${phi}) / 4.0)), ${N3}), -1.0 / ${N1}),
      fract(${M}))`

  // largest radius, into rmax. r = g^(-1/n1) with g = |cos u|^n2 + |sin u|^n3,
  // so the largest r is where g is smallest. g only depends on |cos u| and
  // |sin u|, so a quarter turn of u covers every value, whatever m is.
  const fit = (N1, N2, N3) => `
    float gmin = 2.0;
    for (int j = 0; j < 16; j++) {
      float u = float(j) / 15.0 * 1.5707963;
      gmin = min(gmin, pow(abs(cos(u)), ${N2}) + pow(abs(sin(u)), ${N3}));
    }
    float rmax = pow(max(gmin, 1e-6), -1.0 / ${N1});`

  // canvas position in units of half the height, y up
  const coords = `
    vec2 q = (_st - 0.5) * vec2(2.0, -2.0);
    q.x *= resolution.x / resolution.y;
    float px = 2.0 / resolution.y;`

  setFunction({
    name: 'superformula',
    type: 'src',
    inputs: [
      {name: 'm',     type: 'float', default: 6.0},
      {name: 'n1',    type: 'float', default: 1.0},
      {name: 'n2',    type: 'float', default: 1.0},
      {name: 'n3',    type: 'float', default: 1.0},
      {name: 'size',  type: 'float', default: 0.8},
      {name: 'thick', type: 'float', default: 0.006},
      {name: 'fill',  type: 'float', default: 0.15},
      {name: 'turn',  type: 'float', default: 0.0},
    ],
    glsl: `
    ${coords}
    float M = max(m, 0.0);
    // exponents must stay positive or pow() is undefined
    float N1 = max(n1, 0.05);
    float N2 = max(n2, 0.05);
    float N3 = max(n3, 0.05);
    ${fit('N1', 'N2', 'N3')}
    float phi = atan(q.y, q.x) - turn;
    float r = ${sf('phi', 'M', 'N1', 'N2', 'N3')} / rmax * size;
    float d = length(q) - r;
    float line = 1.0 - smoothstep(thick, thick + 1.5 * px, abs(d));
    float inside = (1.0 - smoothstep(-px, px, d)) * fill;
    return vec4(vec3(max(line, inside)), 1.0);
`})

  setFunction({
    name: 'superbloom',
    type: 'src',
    inputs: [
      {name: 'm',       type: 'float', default: 6.0},
      {name: 'wander',  type: 'float', default: 2.5},
      {name: 'n1',      type: 'float', default: 1.2},
      {name: 'n23',     type: 'float', default: 1.6},
      {name: 'nWander', type: 'float', default: 0.9},
      {name: 'speed',   type: 'float', default: 0.25},
      {name: 'layers',  type: 'float', default: 4.0},
      {name: 'thick',   type: 'float', default: 0.005},
      {name: 'spin',    type: 'float', default: 0.08},
    ],
    glsl: `
    ${coords}
    float L = clamp(floor(layers), 1.0, 8.0);
    float a = atan(q.y, q.x);
    float len = length(q);
    float v = 0.0;
    for (int i = 0; i < 8; i++) {
      float l = float(i);
      if (l >= L) break;
      // each layer is the shape as it was a moment ago
      float tt = time * speed - l * 0.35;
      // slow waves in -1..1, a different one for each number
      float wm = sin(tt * 0.7 + 0.0) * 0.6 + sin(tt * 1.49 + 1.7) * 0.4;
      float w1 = sin(tt * 1.0 + 1.0) * 0.6 + sin(tt * 2.13 + 3.4) * 0.4;
      float w2 = sin(tt * 1.1 + 2.0) * 0.6 + sin(tt * 2.34 + 5.1) * 0.4;
      float w3 = sin(tt * 0.9 + 3.0) * 0.6 + sin(tt * 1.92 + 6.8) * 0.4;
      float M = max(m + wander * wm, 0.0);
      float N1 = max(n1 * exp(nWander * 1.3 * w1), 0.05);
      float N2 = max(n23 * exp(nWander * 1.3 * w2), 0.05);
      float N3 = max(n23 * exp(nWander * 1.3 * w3), 0.05);
      ${fit('N1', 'N2', 'N3')}
      float phi = a - time * spin + l * 0.12;
      float size = 0.86 * (1.0 - l / (L + 1.5));
      float r = ${sf('phi', 'M', 'N1', 'N2', 'N3')} / rmax * size;
      float d = len - r;
      float line = 1.0 - smoothstep(thick, thick + 1.5 * px, abs(d));
      float bright = l == 0.0 ? 1.0 : 0.25 + 0.5 * (1.0 - l / L);
      v = max(v, line * bright);
      if (l == 0.0) v = max(v, (1.0 - smoothstep(-px, px, d)) * 0.12);
    }
    return vec4(vec3(v), 1.0);
`})
})()
