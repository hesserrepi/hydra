// Picture shaders: lissajous
// After a printed table of Lissajous figures: one row per frequency ratio
// (1:1, 1:2, 1:3, 2:3, 3:4, 3:5, 4:5, 5:6), one column per phase shift, each a
// pale trace on a dark square like an oscilloscope photograph.
//
// lissajous(a, b, phase, thick, speed)    one figure x = sin(a t + phase), y = sin(b t), white on black;
//                                         fractional a / b morph between the neighbouring closed figures
// lissajousTable(cols, rows, thick, speed) the table, in the print's colours
//
// Modelled on extra-shaders' lib-pattern lissa() (a parametric curve drawn with
// smoothstep edges); the curve is walked as segments like lib-moebius.
(() => {
  const TAU = '6.283185307179586'

  // distance dmin from q to the curve (sin(a t + d), sin(b t)), t in [0, TAU),
  // walked as N straight segments.
  // The curve only closes for whole a and b, so a fractional frequency is drawn
  // as a blend of the figures at the whole numbers either side of it: a = 2.3 is
  // 0.7 * sin(2t) + 0.3 * sin(3t). Every in-between shape is then a closed loop,
  // and a and b can glide between figures (arrays with .smooth(), functions)
  // without the trace breaking open.
  const trace = (N) => `
  float a0 = floor(a);
  float fa = a - a0;
  float b0 = floor(b);
  float fb = b - b0;
  float dmin = 10.0;
  vec2 prev = vec2(sin(d), 0.0);
  for (int i = 1; i <= ${N}; i++) {
    float t = float(i) / ${N}.0 * ${TAU};
    vec2 cur = vec2(mix(sin(a0 * t + d), sin((a0 + 1.0) * t + d), fa),
                    mix(sin(b0 * t), sin((b0 + 1.0) * t), fb));
    vec2 ab = cur - prev;
    vec2 ap = q - prev;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    dmin = min(dmin, length(ap - ab * h));
    prev = cur;
  }
  `

  // a crisp trace with a faint phosphor glow; px is the size of a pixel in curve units
  const shade = `
  float trace = 1.0 - smoothstep(thick, thick + 1.5 * px, dmin);
  trace = max(trace, 0.3 * exp(-dmin / (4.0 * thick + 2.0 * px)));
  `

  setFunction({
    name: 'lissajous',
    type: 'src',
    inputs: [
      {name: 'a',     type: 'float', default: 3.0},   // horizontal frequency
      {name: 'b',     type: 'float', default: 2.0},   // vertical frequency
      {name: 'phase', type: 'float', default: 0.0},
      {name: 'thick', type: 'float', default: 0.006}, // line half width, 1 = half the canvas height
      {name: 'speed', type: 'float', default: 0.1},   // how fast the phase drifts
    ],
    glsl: `
  vec2 q = (_st - 0.5) * vec2(2.0, -2.0); // _st.y runs down the screen; flip it so y = sin(b t) points up
  q.x *= resolution.x / resolution.y;
  q /= 0.9; // leave a margin around the figure
  float px = 2.0 / (0.9 * resolution.y);
  float d = phase + speed * time;
  ${trace(240)}
  ${shade}
  return vec4(vec3(trace), 1.0);
`})

  setFunction({
    name: 'lissajousTable',
    type: 'src',
    inputs: [
      {name: 'cols',  type: 'float', default: 5.0},   // phase shifts, from one flat figure to its mirror
      {name: 'rows',  type: 'float', default: 4.0},   // frequency ratios, up to the table's 8
      {name: 'thick', type: 'float', default: 0.012}, // relative to a figure
      {name: 'speed', type: 'float', default: 0.05},
    ],
    glsl: `
  vec3 paper = vec3(0.90, 0.88, 0.82);
  vec3 plate = vec3(0.21, 0.20, 0.20);
  vec3 ink = vec3(0.93, 0.91, 0.84);
  float aspect = resolution.x / resolution.y;
  float cell = min(aspect / cols, 1.0 / rows) * 0.96;
  // _st.y runs down the screen: flip it so figures point up and rows count from the top
  vec2 g = (_st - 0.5) * vec2(aspect, -1.0) / cell + 0.5 * vec2(cols, rows);
  vec2 id = floor(g);
  vec2 q = (fract(g) - 0.5) * 2.0;
  const float PLATE = 0.84;  // dark square inside its cell
  const float FIG = 0.8;     // figure inside the cell
  if (id.x < 0.0 || id.y < 0.0 || id.x >= cols || id.y >= rows ||
      abs(q.x) > PLATE || abs(q.y) > PLATE) {
    return vec4(paper, 1.0);
  }
  q /= FIG;
  // rows from the top, each a ratio vertical b : horizontal a
  float row = mod(rows - 1.0 - id.y, 8.0);
  float b = 1.0;
  float a = 1.0;
  if (row > 6.5) { b = 5.0; a = 6.0; }
  else if (row > 5.5) { b = 4.0; a = 5.0; }
  else if (row > 4.5) { b = 3.0; a = 5.0; }
  else if (row > 3.5) { b = 3.0; a = 4.0; }
  else if (row > 2.5) { b = 2.0; a = 3.0; }
  else if (row > 1.5) { b = 1.0; a = 3.0; }
  else if (row > 0.5) { b = 1.0; a = 2.0; }
  // the first column is the flat figure traced back and forth, the last its
  // mirror image; the phases between are spread evenly
  const float PI = 3.141592653589793;
  float d = PI * (b - a) / (2.0 * b) + id.x / max(cols - 1.0, 1.0) * PI / b + speed * time;
  float px = 2.0 / (cell * FIG * resolution.y);
  ${trace(240)}
  ${shade}
  return vec4(mix(plate, ink, trace), 1.0);
`})
})()
