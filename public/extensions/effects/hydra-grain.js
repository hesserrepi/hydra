// hydra-grain: grain and paper textures for any hydra source, after p5.grain
// (https://github.com/meezwhite/p5.grain by meezwhite), rewritten as shaders so
// it works without a p5 instance and stays fast at full resolution.
//
//   osc(10, 0.1, 1.2).grain(0.1).out()
//   noise(3).color(1, 0.6, 0.3).chromaGrain(0.08).out()
//   gradient().filmGrain(0.15, 24, 1.5).out()
//   osc(6, 0.05, 0.8).textureOverlay(paper(), 'multiply').out()
//   s0.initImage('my-texture.jpg')
//   shape(4, 0.5).textureOverlay(s0, { mode: 'softLight', animate: true }).out()
//
// grain                                          p5.grain
//   .grain(amount, fps, size, seed)             applyMonochromaticGrain(amount)
//       one random value per pixel, from -amount to +amount, added to r, g and b
//   .chromaGrain(amount, fps, size, seed)       applyChromaticGrain(amount)
//       one random value per pixel and channel
//   .filmGrain(amount, fps, size, seed)         (new)
//       photographic grain: soft clumps, strongest in the mid tones
//
//   amount  0..1 of the colour range. Numbers above 1 are read on p5.grain's
//           0..255 scale, so .grain(42) is the same as applyMonochromaticGrain(42)
//   fps     new grain this many times per second; 0 keeps it still     30
//   size    grain size in pixels                                       1
//   seed    another pattern, for layering several grains               0
//
// textures (sources, greyscale around white, made to be multiplied over a picture)
//   paper(scale, fibers, roughness, tone)       laid paper: clouds and fibres
//   weave(threads, irregular, depth, tone)      woven canvas or linen
//   dust(amount, fps, scratches, seed)          film dust specks and scratches
//
// texture overlay                               p5.grain
//   .textureOverlay(texture, mode or options)   textureOverlay(textureImage, config)
//       texture is s0..s3 (an image, video, camera...), o0..o3 or any hydra chain
//       such as paper(). Images are tiled at their own size, like in p5.grain.
//   options
//     mode     how to blend, default 'multiply': blend, darkest, lightest,
//              difference, multiply, exclusion, screen, replace, overlay,
//              hardLight, softLight, dodge, burn, add. p5's names also work
//              (SOFT_LIGHT, 'soft-light', DODGE, ...)
//     amount   opacity of the texture, 0..1                              1
//     width    width of one tile in pixels (default the image's width)
//     height   height of one tile in pixels (default the image's height)
//     scale    multiplies the tile size                                  1
//     reflect  mirror every other tile so the edges meet                 false
//     animate  true, or { fps, amount }: jump the texture to a random
//              place fps times a second, by up to amount pixels.
//              p5.grain's { atFrame: n } also works (fps = 60 / n)
//   Images and videos are tiled. A chain or an output covers the canvas once,
//   unless width, height, scale, reflect or animate ask for tiles; then the
//   chain is changed in place, so pass a fresh one (paper(), not a variable).
//   Every option except mode may be a function, e.g. { amount: () => a.fft[0] }.
//
// lower level, also usable on their own
//   .textureBlend(texture, mode, amount)        mode is a number: 0 blend, 1 darkest,
//       2 lightest, 3 difference, 4 multiply, 5 exclusion, 6 screen, 7 replace,
//       8 overlay, 9 hardLight, 10 softLight, 11 dodge, 12 burn, 13 add
//   .textureTile(repeatX, repeatY, mirror, fps, shift, seed)
//       a coordinate transform that tiles a source repeatX by repeatY times
(() => {
  // random numbers without sin(), which shows patterns on some GPUs (Dave Hoskins)
  // hash13: float out of vec3 p, hash33: vec3 out of vec3 p
  const hash13 = (out, p) => `
  vec3 ${out}3 = fract((${p}) * 0.1031);
  ${out}3 += dot(${out}3, ${out}3.zyx + 31.32);
  float ${out} = fract((${out}3.x + ${out}3.y) * ${out}3.z);`
  const hash33 = (out, p) => `
  vec3 ${out} = fract((${p}) * vec3(0.1031, 0.1030, 0.0973));
  ${out} += dot(${out}, ${out}.yxz + 33.33);
  ${out} = fract((${out}.xxy + ${out}.yxx) * ${out}.zyx);`

  // the grain cell of this pixel and the frame number, kept small for mediump
  const cell = `
  float amt = amount > 1.0 ? amount / 255.0 : amount;
  float frame = fps > 0.0 ? mod(floor(time * fps), 251.0) : 0.0;
  vec2 cell = floor(gl_FragCoord.xy / max(size, 1.0));
  vec3 p = vec3(mod(cell, 1024.0), frame + seed * 7.0);`

  const grainInputs = (amount) => [
    {name: 'amount', type: 'float', default: amount},
    {name: 'fps',    type: 'float', default: 30.0},
    {name: 'size',   type: 'float', default: 1.0},
    {name: 'seed',   type: 'float', default: 0.0},
  ]

  setFunction({
    name: 'grain',
    type: 'color',
    inputs: grainInputs(0.1),
    glsl: `${cell}${hash13('r', 'p')}
  return vec4(_c0.rgb + (r * 2.0 - 1.0) * amt, _c0.a);
`})

  setFunction({
    name: 'chromaGrain',
    type: 'color',
    inputs: grainInputs(0.1),
    glsl: `${cell}${hash33('r', 'p')}
  return vec4(_c0.rgb + (r * 2.0 - 1.0) * amt, _c0.a);
`})

  // film grain: roughly gaussian noise, smoothly interpolated between cells so
  // big grains are soft, and scaled by how much a tone shows it
  setFunction({
    name: 'filmGrain',
    type: 'color',
    inputs: grainInputs(0.12),
    glsl: `
  float amt = amount > 1.0 ? amount / 255.0 : amount;
  float frame = fps > 0.0 ? mod(floor(time * fps), 251.0) : 0.0;
  vec2 g = gl_FragCoord.xy / max(size, 1.0);
  vec2 c = floor(g);
  vec2 f = fract(g);
  f = f * f * (3.0 - 2.0 * f);
  float z = frame + seed * 7.0;
  ${hash33('h00', 'vec3(mod(c, 1024.0), z)')}
  ${hash33('h10', 'vec3(mod(c + vec2(1.0, 0.0), 1024.0), z)')}
  ${hash33('h01', 'vec3(mod(c + vec2(0.0, 1.0), 1024.0), z)')}
  ${hash33('h11', 'vec3(mod(c + vec2(1.0, 1.0), 1024.0), z)')}
  // three uniform numbers summed are close to a normal distribution
  vec4 n = (vec4(dot(h00, vec3(1.0)), dot(h10, vec3(1.0)), dot(h01, vec3(1.0)), dot(h11, vec3(1.0))) - 1.5) * 2.0;
  float v = mix(mix(n.x, n.y, f.x), mix(n.z, n.w, f.x), f.y);
  float luma = dot(_c0.rgb, vec3(0.299, 0.587, 0.114));
  // silver grain shows most in the mid tones and least in deep blacks and highlights
  float response = 0.25 + 0.75 * (1.0 - pow(abs(luma * 2.0 - 1.0), 2.0));
  return vec4(_c0.rgb + v * amt * response, _c0.a);
`})

  // canvas height units, so textures keep their look on any aspect ratio
  const aspectSt = `vec2 q = (_st - 0.5) * vec2(resolution.x / resolution.y, 1.0);`

  setFunction({
    name: 'paper',
    type: 'src',
    inputs: [
      {name: 'scale',     type: 'float', default: 1.0},   // bigger = larger clouds and fibres
      {name: 'fibers',    type: 'float', default: 0.35},   // share of grid cells with fibres, 0..1
      {name: 'roughness', type: 'float', default: 0.5},   // depth of the clouds and the tooth
      {name: 'tone',      type: 'float', default: 0.94},  // brightness of the paper
    ],
    glsl: `
  ${aspectSt}
  q /= max(scale, 0.01);
  // clouds: a few octaves of hydra's simplex noise
  float cloud = 0.0;
  float amp = 0.5;
  vec2 o = q * 3.0;
  for (int i = 0; i < 5; i++) {
    cloud += amp * _noise(vec3(o, 1.7 * float(i)));
    o = o * 2.03 + 11.3;
    amp *= 0.5;
  }
  // tooth: fine noise at pixel scale
  float tooth = _noise(vec3(gl_FragCoord.xy * 0.6, 3.1));
  // fibres: short, slightly bent strands scattered on a grid, two per cell;
  // the 3x3 neighbouring cells are checked so strands cross cell borders
  float fib = 0.0;
  vec2 fq = q * 9.0;
  vec2 fc = floor(fq);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      for (int k = 0; k < 2; k++) {
        vec2 c = fc + vec2(float(i), float(j));
        ${hash33('h', 'vec3(mod(c, 1024.0), 3.0 + float(k) * 5.0)')}
        if (h.z > fibers) continue;
        vec2 centre = c + h.xy;
        float ang = h.x * 6.2832 + h.y * 3.0;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 rel = fq - centre;
        float along = dot(rel, dir);
        float len = 0.25 + 0.45 * fract(h.z * 7.13);
        // bend: the strand drifts sideways along a parabola
        float across = dot(rel, vec2(-dir.y, dir.x)) - (h.y - 0.5) * 0.6 * along * along;
        float width = (0.012 + 0.012 * fract(h.x * 5.3)) * (1.0 - smoothstep(len * 0.6, len, abs(along)));
        float line = 1.0 - smoothstep(width * 0.4, width, abs(across));
        fib = max(fib, line * step(abs(along), len) * (0.5 + 0.5 * fract(h.y * 9.1)));
      }
    }
  }
  float v = tone + roughness * (0.06 * cloud + 0.05 * tooth) - 0.12 * fib;
  return vec4(vec3(clamp(v, 0.0, 1.0)), 1.0);
`})

  setFunction({
    name: 'weave',
    type: 'src',
    inputs: [
      {name: 'threads',   type: 'float', default: 120.0}, // threads across the canvas height
      {name: 'irregular', type: 'float', default: 0.5},   // slubs and uneven threads
      {name: 'depth',     type: 'float', default: 0.5},   // how dark the gaps between threads are
      {name: 'tone',      type: 'float', default: 0.95},
    ],
    glsl: `
  ${aspectSt}
  vec2 g = q * threads;
  // threads wander a little and vary in thickness
  g += irregular * 0.25 * vec2(_noise(vec3(q * 7.0, 1.0)), _noise(vec3(q * 7.0, 4.0)));
  vec2 id = floor(g);
  vec2 f = fract(g);
  float over = mod(id.x + id.y, 2.0); // plain weave: warp over weft, then under
  float warp = sin(3.14159 * f.x);    // a vertical thread, round across its width
  float weft = sin(3.14159 * f.y);
  float along = over > 0.5 ? sin(3.14159 * f.y) : sin(3.14159 * f.x);
  float thread = (over > 0.5 ? warp : weft) * (0.75 + 0.25 * along);
  ${hash13('slubX', 'vec3(id.x, 0.0, 3.0)')}
  ${hash13('slubY', 'vec3(0.0, id.y, 5.0)')}
  float slub = over > 0.5 ? slubX : slubY;
  float v = tone - depth * 0.35 * (1.0 - thread) - irregular * 0.06 * slub;
  v += irregular * 0.03 * _noise(vec3(q * 40.0, 7.0));
  return vec4(vec3(clamp(v, 0.0, 1.0)), 1.0);
`})

  setFunction({
    name: 'dust',
    type: 'src',
    inputs: [
      {name: 'amount',    type: 'float', default: 0.3},   // how many specks
      {name: 'fps',       type: 'float', default: 12.0},  // the dust changes this often; 0 = still
      {name: 'scratches', type: 'float', default: 0.5},   // how many vertical scratches
      {name: 'seed',      type: 'float', default: 0.0},
    ],
    glsl: `
  float frame = fps > 0.0 ? mod(floor(time * fps), 251.0) : 0.0;
  float z = frame + seed * 7.0;
  vec2 px = gl_FragCoord.xy;
  float v = 1.0;
  // specks: a few random round blots on a coarse grid, at two sizes
  for (int i = 0; i < 2; i++) {
    float cellSize = i == 0 ? 90.0 : 28.0;
    vec2 c = floor(px / cellSize);
    ${hash33('h', 'vec3(mod(c, 1024.0), z + float(i) * 31.0)')}
    float on = step(1.0 - amount * (i == 0 ? 0.25 : 0.12), h.z);
    vec2 centre = (c + 0.15 + 0.7 * h.xy) * cellSize;
    float radius = (i == 0 ? 1.5 + 3.5 * h.x : 0.6 + 1.2 * h.y);
    // ragged edge
    float d = length(px - centre) + 1.2 * _noise(vec3(px * 0.35, z));
    v *= 1.0 - on * (1.0 - smoothstep(radius - 0.7, radius + 0.7, d)) * (0.5 + 0.5 * h.y);
  }
  // scratches: thin vertical lines that wobble and come and go
  float columns = 1.0 + floor(scratches * 6.0);
  for (int i = 0; i < 6; i++) {
    if (float(i) >= columns) break;
    ${hash33('s', 'vec3(float(i), z, 11.0)')}
    float x = s.x * resolution.x + 6.0 * _noise(vec3(px.y * 0.004, float(i), z * 0.1));
    float line = 1.0 - smoothstep(0.3, 1.1, abs(px.x - x));
    float stretch = smoothstep(0.2, 0.6, _noise(vec3(px.y * 0.003, float(i) * 3.0, z * 0.2)) + 0.5 * s.z);
    v *= 1.0 - line * stretch * step(0.35, s.y) * 0.6 * min(scratches * 2.0, 1.0);
  }
  return vec4(vec3(v), 1.0);
`})

  setFunction({
    name: 'textureTile',
    type: 'coord',
    inputs: [
      {name: 'repeatX', type: 'float', default: 1.0},
      {name: 'repeatY', type: 'float', default: 1.0},
      {name: 'mirror',  type: 'float', default: 0.0},  // 1 mirrors every other tile
      {name: 'fps',     type: 'float', default: 0.0},  // random jumps per second
      {name: 'shift',   type: 'float', default: 0.0},  // largest jump, in pixels
      {name: 'seed',    type: 'float', default: 0.0},
    ],
    glsl: `
  vec2 st = _st;
  if (fps > 0.0 && shift > 0.0) {
    float frame = mod(floor(time * fps), 251.0) + seed * 7.0;
    ${hash33('j', 'vec3(frame, 17.0, 3.0)')}
    st += j.xy * shift / resolution;
  }
  vec2 t = st * vec2(repeatX, repeatY);
  return mirror > 0.5 ? 1.0 - abs(mod(t, 2.0) - 1.0) : fract(t);
`})

  // blend modes, numbered as in the header and in `modes` below; b is the texture over the base a
  setFunction({
    name: 'textureBlend',
    type: 'combine',
    inputs: [
      {name: 'mode',   type: 'float', default: 4.0},  // multiply
      {name: 'amount', type: 'float', default: 1.0},
    ],
    glsl: `
  vec3 a = _c0.rgb;
  vec3 b = clamp(_c1.rgb, 0.0, 1.0);
  vec3 r = b;
  float m = floor(mode + 0.5);
  if (m < 0.5) r = b;                                                        // blend
  else if (m < 1.5) r = min(a, b);                                           // darkest
  else if (m < 2.5) r = max(a, b);                                           // lightest
  else if (m < 3.5) r = abs(a - b);                                          // difference
  else if (m < 4.5) r = a * b;                                               // multiply
  else if (m < 5.5) r = a + b - 2.0 * a * b;                                 // exclusion
  else if (m < 6.5) r = 1.0 - (1.0 - a) * (1.0 - b);                         // screen
  else if (m < 7.5) r = b;                                                   // replace
  else if (m < 8.5) r = mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), step(0.5, a)); // overlay
  else if (m < 9.5) r = mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), step(0.5, b)); // hard light
  else if (m < 10.5) {                                                       // soft light (W3C)
    vec3 d = mix(((16.0 * a - 12.0) * a + 4.0) * a, sqrt(max(a, 0.0)), step(0.25, a));
    r = mix(a - (1.0 - 2.0 * b) * a * (1.0 - a), a + (2.0 * b - 1.0) * (d - a), step(0.5, b));
  }
  else if (m < 11.5) r = mix(min(vec3(1.0), a / max(1.0 - b, 1e-4)), vec3(1.0), step(1.0, b)); // dodge
  else if (m < 12.5) r = mix(1.0 - min(vec3(1.0), (1.0 - a) / max(b, 1e-4)), vec3(0.0), step(b, vec3(0.0))); // burn
  else r = min(a + b, 1.0);                                                  // add
  // replace ignores the texture's alpha, every other mode lets it through
  float k = clamp(amount, 0.0, 1.0) * (m > 6.5 && m < 7.5 ? 1.0 : _c1.a);
  return vec4(mix(a, r, k), _c0.a);
`})

  // the JavaScript part needs a running hydra; npm run types reads only the shaders above
  const H = [window.hydraSynth, window._hydra, window.hydra, window.h, window.H, window.hy].find((h) => h?.regl)
  if (!H) return
  const scope = H.sandbox?.makeGlobal ? window : H.synth

  const modes = ['blend', 'darkest', 'lightest', 'difference', 'multiply', 'exclusion', 'screen',
    'replace', 'overlay', 'hardLight', 'softLight', 'dodge', 'burn', 'add']
  const key = (s) => s.toLowerCase().replace(/[-_\s]/g, '')
  const modeIndex = new Map(modes.map((m, i) => [key(m), i]))
  // p5's blend mode constants are canvas composite operation names
  Object.entries({
    normal: 'blend', sourceover: 'blend', darken: 'darkest', lighten: 'lightest', lighter: 'add',
    copy: 'replace', colordodge: 'dodge', colorburn: 'burn'
  }).forEach(([alias, mode]) => modeIndex.set(alias, modeIndex.get(key(mode))))

  const toMode = (mode) => {
    if (typeof mode === 'number') return mode
    const i = modeIndex.get(key(String(mode)))
    if (i === undefined) throw new Error(`textureOverlay: unknown mode "${mode}", use one of ${modes.join(', ')}`)
    return i
  }

  const isChain = (t) => t && Array.isArray(t.transforms)
  // the size of an image, video or canvas behind s0..s3, once it has loaded
  const mediaSize = (t) => {
    const el = t?.src
    if (!el) return null
    const w = el.naturalWidth || el.videoWidth || el.width
    const h = el.naturalHeight || el.videoHeight || el.height
    return w > 0 && h > 0 ? [w, h] : null
  }
  const value = (v) => (typeof v === 'function' ? v() : v)
  const canvasSize = () => [H.width || H.synth?.width || 1, H.height || H.synth?.height || 1]

  function textureOverlay (base, texture, options = {}) {
    if (texture === undefined) {
      throw new Error('textureOverlay(texture, mode): give it a texture, e.g. .textureOverlay(paper()) or s0.initImage(url); .textureOverlay(s0)')
    }
    if (typeof options === 'string' || typeof options === 'number') options = { mode: options }
    const mode = toMode(options.mode ?? 'multiply')
    const { amount = 1, width, height, scale = 1 } = options
    const reflect = options.reflect ? 1 : 0
    let animate = options.animate
    if (animate === true) animate = {}
    const fps = animate ? (animate.fps ?? (animate.atFrame ? 60 / animate.atFrame : 30)) : 0
    const shift = animate ? (animate.amount ?? (() => Math.min(...canvasSize()))) : 0

    // s0..s3 (external sources) have dynamic, outputs o0..o3 don't
    const media = !isChain(texture) && typeof texture === 'object' && 'dynamic' in texture
    const tiled = media || width !== undefined || height !== undefined || scale !== 1 || reflect || animate
    let tex = isChain(texture) ? texture : scope.src(texture)
    if (tiled) {
      // tiles across the canvas = canvas size / tile size, worked out every frame
      // so an image that is still loading (or a resized window) is picked up
      const tile = (axis) => () => {
        const size = mediaSize(texture)
        const own = axis === 0 ? value(width) : value(height)
        const other = axis === 0 ? value(height) : value(width)
        let px = own
        if (px === undefined && other !== undefined && size) px = other * size[axis] / size[1 - axis]
        if (px === undefined) px = size ? size[axis] : canvasSize()[axis]
        return canvasSize()[axis] / Math.max(1, px * value(scale))
      }
      tex = tex.textureTile(tile(0), tile(1), reflect, fps, shift)
    }
    return base.textureBlend(tex, mode, amount)
  }

  const chainPrototype = Object.getPrototypeOf(H.generator.sourceClass.prototype)
  chainPrototype.textureOverlay = function (texture, options) { return textureOverlay(this, texture, options) }
})()
