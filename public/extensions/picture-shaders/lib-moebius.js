// Picture shaders: moebius
// After an engraved Möbius band print (a band split into three strands that knot
// into each other, hatched with fine lines, red on one face and grey on the other).
//
// moebius(size, width, lines, twist, flow, fold, eyes)       the band, in grey
// moebiusColor(size, width, lines, twist, flow, fold, eyes)  in the print's colours
// engrave(lines, angle, soft, keep)                          hatch any source like the print
//
// Modelled on extra-shaders' lib-pattern (smoothstep edges, polar curves) and
// lib-screen (screen-space line patterns).
(() => {
  const knotInputs = [
    {name: 'size',  type: 'float', default: 0.8},  // outer radius, 1 touches the canvas edge
    {name: 'width', type: 'float', default: 0.13}, // half width of the band
    {name: 'lines', type: 'float', default: 12.0}, // engraved lines across the band
    {name: 'twist', type: 'float', default: 3.0},  // half turns along the knot; odd = Möbius
    {name: 'flow',  type: 'float', default: 0.1},  // speed the twists and eyes travel along it
    {name: 'fold',  type: 'float', default: 1.0},  // depth of the three folds; < 1 loosens the knot
    {name: 'eyes',  type: 'float', default: 3.0},  // pairs of oval holes along the band, 0 for none
  ]

  // A (2,3) torus knot (a trefoil with a hole in the middle) projected on the
  // canvas, walked as N segments. For each pixel keep the band piece nearest the
  // viewer: hit.x is the position across the band (-1..1), hit.y the cosine of
  // the twist (its sign is the face, its size how much the band faces us) and
  // hit.z the distance to the nearest eye (1 on its rim).
  const knot = `
  const float TAU = 6.283185307179586;
  const int N = 160;
  // an odd twist flips the face where the loop closes; start the loop under a
  // crossing (phi = TAU/4 is the lower strand) so the seam is hidden
  const float SEAM = TAU / 4.0;
  vec2 p = (_st - 0.5) * 2.0;
  p.x *= resolution.x / resolution.y; // keep the knot round on wide canvases
  float bestZ = -10.0;
  vec4 hit = vec4(0.0);
  vec2 a = vec2(0.0);
  for (int i = 0; i <= N; i++) {
    float phi = SEAM + float(i) / float(N) * TAU;
    float r = size * (2.0 + fold * cos(3.0 * phi)) / (2.0 + abs(fold));
    vec2 b = r * vec2(cos(2.0 * phi), sin(2.0 * phi));
    if (i > 0) {
      vec2 ab = b - a;
      vec2 ap = p - a;
      // no round caps, or the segments show through as stacked discs
      float h = dot(ap, ab) / dot(ab, ab);
      float t = SEAM + (float(i - 1) + h) / float(N) * TAU;
      float d = length(ap - ab * h) * sign(ab.x * ap.y - ab.y * ap.x);
      float phase = t - flow * time;
      float c = cos(0.5 * twist * phase);
      float hw = width * max(abs(c), 0.06);
      float z = fold * sin(3.0 * t);
      if (h > -0.2 && h < 1.2 && abs(d) < hw && z > bestZ) {
        float s = d / hw;
        float e = 10.0;
        if (eyes >= 0.5) {
          float cell = TAU / floor(eyes);
          // centred on phase 0, where the band lies flat for the default twist
          float along = (mod(phase + 0.5 * cell, cell) - 0.5 * cell) / 0.07;
          e = length(vec2(along, (abs(s) - 0.45) / 0.28));
        }
        if (e > 1.0) {
          bestZ = z;
          hit = vec4(s, c, e, 1.0);
        }
      }
    }
    a = b;
  }
  float s = hit.x;
  // bright where the band faces us, dark in the folds
  float tone = 0.12 + 0.7 * abs(hit.y);
  float u = abs(fract((0.5 * s + 0.5) * lines) - 0.5) * 2.0;
  float g = 1.0 - smoothstep(tone - 0.12, tone + 0.12, u);
  g *= 1.0 - smoothstep(0.86, 0.97, abs(s));
  g *= smoothstep(1.0, 1.25, hit.z);
  `

  setFunction({
    name: 'moebius',
    type: 'src',
    inputs: knotInputs,
    glsl: knot + `
  return vec4(vec3(g * hit.w), 1.0);
`})

  setFunction({
    name: 'moebiusColor',
    type: 'src',
    inputs: knotInputs,
    glsl: knot + `
  vec3 paper = vec3(0.93, 0.88, 0.80);
  vec3 ink = vec3(0.10, 0.07, 0.07);
  vec3 face = hit.y > 0.0 ? vec3(0.86, 0.45, 0.42) : vec3(0.80, 0.82, 0.84);
  vec3 col = mix(ink, face, g);
  return vec4(mix(paper, col, hit.w), 1.0);
`})

  // Turns any source into parallel engraved lines whose width follows its
  // brightness. keep = 1 keeps the source's colours on the lines.
  setFunction({
    name: 'engrave',
    type: 'color',
    inputs: [
      {name: 'lines', type: 'float', default: 80.0}, // lines per canvas height
      {name: 'angle', type: 'float', default: 0.5},  // in radians
      {name: 'soft',  type: 'float', default: 0.15},
      {name: 'keep',  type: 'float', default: 0.0},
    ],
    glsl: `
  vec2 fc = gl_FragCoord.xy / resolution.y;
  vec2 n = vec2(-sin(angle), cos(angle));
  float u = abs(fract(dot(fc, n) * lines) - 0.5) * 2.0;
  float l = clamp(dot(_c0.rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
  float g = 1.0 - smoothstep(l - soft, l + soft, u);
  return vec4(mix(vec3(g), _c0.rgb * g, keep), _c0.a);
`})
})()
