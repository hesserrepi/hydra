// Picture shaders: chladni
// After E. F. F. Chladni's sound figures (Entdeckungen über die Theorie des
// Klanges, 1787, Tab. IX and X): the lines where sand gathers on a vibrating
// square plate, engraved as small numbered squares.
//
// chladni(n, m, sym, thick, speed, grain)  the nodal lines of one plate, white on black
// chladniTable(cols, rows, seed, speed)    a table of plates in the engraving's ink and paper
//
// A square plate vibrating in modes n and m is still where
//   cos(n pi x) cos(m pi y) + k cos(m pi x) cos(n pi y) = 0
// k = 0 gives a straight grid, k = -1 diagonals and crosses, k = 1 rings,
// values in between the wavy lines of the engraving.
(() => {
  // nodal-line distance dist at plate coordinates p (0..1), for n, m, k.
  // |f| / |grad f| is the distance to the nearest line, near enough to draw it.
  const nodal = `
  const float PI = 3.141592653589793;
  vec2 an = n * PI * p;
  vec2 am = m * PI * p;
  float f = cos(an.x) * cos(am.y) + k * cos(am.x) * cos(an.y);
  vec2 grad = -PI * vec2(
    n * sin(an.x) * cos(am.y) + k * m * sin(am.x) * cos(an.y),
    m * cos(an.x) * sin(am.y) + k * n * cos(am.x) * sin(an.y));
  float dist = abs(f) / max(length(grad), 1e-4);
  `

  const hash = (v) => `fract(sin(dot(${v}, vec2(12.9898, 78.233))) * 43758.5453)`

  setFunction({
    name: 'chladni',
    type: 'src',
    inputs: [
      {name: 'n',     type: 'float', default: 2.0},    // the two vibration modes
      {name: 'm',     type: 'float', default: 5.0},
      {name: 'sym',   type: 'float', default: 1.0},    // k above; animated by speed
      {name: 'thick', type: 'float', default: 0.004},  // line half width, 1 = canvas height
      {name: 'speed', type: 'float', default: 0.2},    // k swings between sym and -sym
      {name: 'grain', type: 'float', default: 0.0},    // 1 draws the lines as heaps of sand
    ],
    glsl: `
  // the plate is the centred square of the canvas; the pattern repeats beyond it
  vec2 p = (_st - 0.5) * vec2(resolution.x / resolution.y, 1.0) + 0.5;
  float k = sym * cos(speed * time);
  ${nodal}
  float px = 1.0 / resolution.y;
  float line = 1.0 - smoothstep(thick, thick + 1.5 * px, dist);
  if (grain > 0.0) {
    float h = ${hash('floor(gl_FragCoord.xy)')};
    float heap = exp(-pow(dist / (3.0 * thick + px), 2.0));
    line = mix(line, step(h, 0.9 * heap), clamp(grain, 0.0, 1.0));
  }
  return vec4(vec3(line), 1.0);
`})

  setFunction({
    name: 'chladniTable',
    type: 'src',
    inputs: [
      {name: 'cols',  type: 'float', default: 4.0},
      {name: 'rows',  type: 'float', default: 3.0},
      {name: 'seed',  type: 'float', default: 0.0},  // picks another set of figures
      {name: 'speed', type: 'float', default: 0.0},  // > 0 makes every figure slowly change
    ],
    glsl: `
  vec3 paper = vec3(0.91, 0.88, 0.80);
  vec3 ink = vec3(0.27, 0.21, 0.15);
  float aspect = resolution.x / resolution.y;
  float cell = min(aspect / cols, 1.0 / rows) * 0.94;
  vec2 g = (_st - 0.5) * vec2(aspect, 1.0) / cell + 0.5 * vec2(cols, rows);
  vec2 id = floor(g);
  vec2 q = (fract(g) - 0.5) * 2.0;
  const float PLATE = 0.8; // plate square inside its cell
  float px = 2.0 / (cell * resolution.y); // a pixel in cell units (q)
  float edge = max(abs(q.x), abs(q.y));
  if (id.x < 0.0 || id.y < 0.0 || id.x >= cols || id.y >= rows || edge > PLATE + 2.0 * px) {
    return vec4(paper, 1.0);
  }
  // each plate gets its own modes and mix
  float h1 = ${hash('id + seed * 17.0')};
  float h2 = ${hash('id.yx + seed * 31.0 + 5.0')};
  float h3 = ${hash('id + seed * 7.0 + 11.0')};
  float n = 1.0 + floor(h1 * 4.0);
  float m = n + 1.0 + floor(h2 * 3.0);
  float pick = floor(h3 * 5.0);
  float k = pick < 0.5 ? -1.0 : pick < 1.5 ? -0.35 : pick < 2.5 ? 0.0 : pick < 3.5 ? 0.35 : 1.0;
  k *= cos(speed * time + h1 * 6.283);
  vec2 p = q / PLATE * 0.5 + 0.5;
  ${nodal}
  float w = 0.6 * px / PLATE; // engraved lines about 1.2 px wide
  float line = 1.0 - smoothstep(w, w + px / PLATE, dist);
  // the plate's ruled border
  line = max(line, 1.0 - smoothstep(0.6 * px, 1.6 * px, abs(edge - PLATE)));
  return vec4(mix(paper, ink, line), 1.0);
`})
})()
