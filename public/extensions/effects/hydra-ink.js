// hydra-ink: click and drag on the canvas to push the colours of a hydra
// source around like ink on water.
//
//   osc(30, 0.05, 1.4).kaleid(5).ink('comb').out()
//   noise(3).color(1, 0.4, 0.3).out(o1)
//   ink(o1, 'fluid', { radius: 0.12 }).out(o0)
//
// ink(source, mode, options) or source.ink(mode, options). source is an
// output (o0..o3), an external source (s0..s3) or any hydra chain. The result
// is a normal hydra chain, so it can be modulated, blended or sent to .out().
//
// Every mode moves a map of where each pixel takes its colour from, not the
// colours themselves, so the picture stays sharp however much it is folded and
// an animated source keeps moving inside the marbled shapes.
//
// modes
//   'push'   drag smears the picture along with the mouse; the push fades out
//            behind it (feedback displacement driven by mouse velocity).
//   'fluid'  the mouse stirs an incompressible fluid (stable fluids) that keeps
//            swirling after you let go.
//   'comb'   marbling: dragging pulls a stylus or a comb through the picture
//            and folds it into bands; holding the mouse still drops ink of the
//            colour under it, which spreads in rings.
//
// options (numbers, or functions returning a number, e.g. () => time % 2)
//   radius      brush size, as a fraction of the canvas height      0.08
//   force       how strongly the mouse pushes                       1
//   relax       how fast the picture returns to normal, per second  push 0.15, fluid 0.05, comb 0
//   decay       push: share of the push that remains each frame     0.9
//   dissipation fluid: share of the motion kept each frame          0.99
//   curl        fluid: how much the fluid curls into vortices       0.3
//   iterations  fluid: pressure solver steps, more = smoother       20
//   resolution  fluid/push: simulation cells across the height      128
//   tines       comb: number of comb teeth                          1
//   spacing     comb: distance between teeth                        0.06
//   sharpness   comb: how quickly the pull fades away from a tooth  2
//   drop        comb: how fast held ink drops grow (0 = no drops)   0.02
//   button      mouse button that stirs: 0 left, 1 middle, 2 right  0
//   key         only stir while this key is held: 'shift', 'alt', 'ctrl' or 'meta'
//   id          name of the ink layer; use different ids for independent layers
//
// ink.reset() undoes every deformation (ink.reset('name') for one layer).

{
  const getHydra = () => [window.hydraSynth, window._hydra, window.hydra, window.h, window.H, window.hy].find((h) => h?.regl)
  const H = getHydra()
  if (!H) throw new Error('hydra-ink: could not find hydra')
  const scope = H.sandbox?.makeGlobal ? window : H.synth
  const regl = H.regl

  // loading the script again (an explicit loadScript) replaces the old instance
  if (window.__hydraInk) window.__hydraInk.destroy()

  const VEL_RANGE = 4.0
  const CURL_RANGE = 256.0
  const PRESSURE_RANGE = 2.0
  // ink drops: the map points into a strip of colours recorded while a drop
  // grows, so a drop held over a changing source spreads in rings
  const HISTORY = 4096
  const INK_X = -0.8 // map x of ink; source coordinates stay above -0.5

  const header = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;

// values are stored as 16 bit fixed point in two 8 bit channels, so that the
// simulation works without float textures (hydra's regl has none enabled)
float unpack16(vec2 c) { c = floor(c * 255.0 + 0.5); return (c.x * 256.0 + c.y) / 65535.0; }
vec2 pack16(float t) {
  t = floor(clamp(t, 0.0, 1.0) * 65535.0 + 0.5);
  float hi = floor(t / 256.0);
  return vec2(hi, t - hi * 256.0) / 255.0;
}
vec2 getVec(sampler2D t, vec2 p, float range) {
  vec4 c = texture2D(t, p);
  return (vec2(unpack16(c.rg), unpack16(c.ba)) * 2.0 - 1.0) * range;
}
vec4 putVec(vec2 v, float range) {
  vec2 t = v / range * 0.5 + 0.5;
  return vec4(pack16(t.x), pack16(t.y));
}
float getScalar(sampler2D t, vec2 p, float range) { return (unpack16(texture2D(t, p).rg) * 2.0 - 1.0) * range; }
vec4 putScalar(float v, float range) { return vec4(pack16(v / range * 0.5 + 0.5), 0.0, 1.0); }
// packed values can't use linear filtering, so interpolate by hand
vec2 smoothVec(sampler2D t, vec2 p, vec2 size, float range) {
  vec2 f = p * size - 0.5;
  vec2 i = floor(f);
  f -= i;
  vec2 a = getVec(t, (i + vec2(0.5, 0.5)) / size, range);
  vec2 b = getVec(t, (i + vec2(1.5, 0.5)) / size, range);
  vec2 c = getVec(t, (i + vec2(0.5, 1.5)) / size, range);
  vec2 d = getVec(t, (i + vec2(1.5, 1.5)) / size, range);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// the map holds source coordinates in [-1, 2]
vec2 getMap(sampler2D t, vec2 p) { return getVec(t, p, 1.5) + 0.5; }
vec4 putMap(vec2 m) { return putVec(m - 0.5, 1.5); }
vec2 smoothMap(sampler2D t, vec2 p, vec2 size) {
  vec2 c = clamp(p, 0.0, 1.0);
  return smoothVec(t, c, size, 1.5) + 0.5 + (p - c);
}
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-10), 0.0, 1.0);
  return length(p - a - ab * h);
}
`

  const shaders = {
    initMap: `void main() { gl_FragColor = putMap(uv); }`,

    zero: `void main() { gl_FragColor = putVec(vec2(0.0), 1.0); }`,

    // advect the velocity by itself and drag it towards the mouse velocity under the brush
    velocity: `
uniform sampler2D vel;
uniform vec2 size;
uniform float aspect, dt, keep, radius, force, active;
uniform vec2 a, b, mouseVel;
void main() {
  vec2 v0 = getVec(vel, uv, ${VEL_RANGE.toFixed(1)});
  vec2 back = uv - v0 * dt / vec2(aspect, 1.0);
  // a little viscosity: blend with the neighbours to damp grid-sized ripples
  vec2 texel = 1.0 / size;
  vec2 v = (smoothVec(vel, back, size, ${VEL_RANGE.toFixed(1)}) * 4.0 +
            smoothVec(vel, back + vec2(texel.x, 0.0), size, ${VEL_RANGE.toFixed(1)}) +
            smoothVec(vel, back - vec2(texel.x, 0.0), size, ${VEL_RANGE.toFixed(1)}) +
            smoothVec(vel, back + vec2(0.0, texel.y), size, ${VEL_RANGE.toFixed(1)}) +
            smoothVec(vel, back - vec2(0.0, texel.y), size, ${VEL_RANGE.toFixed(1)})) / 8.0 * keep;
  float d = segDist(uv * vec2(aspect, 1.0), a, b);
  float w = active * exp(-d * d / (radius * radius));
  v = mix(v, mouseVel * force, w);
  gl_FragColor = putVec(v, ${VEL_RANGE.toFixed(1)});
}`,

    curl: `
uniform sampler2D vel;
uniform vec2 texel;
uniform float h;
void main() {
  float r = getVec(vel, uv + vec2(texel.x, 0.0), ${VEL_RANGE.toFixed(1)}).y;
  float l = getVec(vel, uv - vec2(texel.x, 0.0), ${VEL_RANGE.toFixed(1)}).y;
  float t = getVec(vel, uv + vec2(0.0, texel.y), ${VEL_RANGE.toFixed(1)}).x;
  float b = getVec(vel, uv - vec2(0.0, texel.y), ${VEL_RANGE.toFixed(1)}).x;
  gl_FragColor = putScalar((r - l - t + b) / (2.0 * h), ${CURL_RANGE.toFixed(1)});
}`,

    // vorticity confinement: push the velocity around spots of high curl
    vorticity: `
uniform sampler2D vel, curl;
uniform vec2 texel;
uniform float h, dt, strength;
void main() {
  float l = getScalar(curl, uv - vec2(texel.x, 0.0), ${CURL_RANGE.toFixed(1)});
  float r = getScalar(curl, uv + vec2(texel.x, 0.0), ${CURL_RANGE.toFixed(1)});
  float b = getScalar(curl, uv - vec2(0.0, texel.y), ${CURL_RANGE.toFixed(1)});
  float t = getScalar(curl, uv + vec2(0.0, texel.y), ${CURL_RANGE.toFixed(1)});
  float c = getScalar(curl, uv, ${CURL_RANGE.toFixed(1)});
  vec2 f = vec2(abs(t) - abs(b), abs(r) - abs(l));
  f /= length(f) + 1e-5;
  f *= strength * c * h * 16.0;
  f.y *= -1.0;
  vec2 v = getVec(vel, uv, ${VEL_RANGE.toFixed(1)}) + f * dt;
  gl_FragColor = putVec(v, ${VEL_RANGE.toFixed(1)});
}`,

    // one Jacobi step of the pressure Poisson equation; walls reflect the velocity
    pressure: `
uniform sampler2D vel, pressure;
uniform vec2 texel;
uniform float h, warm;
vec2 velAt(vec2 p, vec2 c) {
  vec2 v = getVec(vel, p, ${VEL_RANGE.toFixed(1)});
  if (p.x < 0.0 || p.x > 1.0) v.x = -c.x;
  if (p.y < 0.0 || p.y > 1.0) v.y = -c.y;
  return v;
}
void main() {
  vec2 c = getVec(vel, uv, ${VEL_RANGE.toFixed(1)});
  float div = (velAt(uv + vec2(texel.x, 0.0), c).x - velAt(uv - vec2(texel.x, 0.0), c).x +
               velAt(uv + vec2(0.0, texel.y), c).y - velAt(uv - vec2(0.0, texel.y), c).y) / (2.0 * h);
  float p = getScalar(pressure, uv - vec2(texel.x, 0.0), ${PRESSURE_RANGE.toFixed(1)}) +
            getScalar(pressure, uv + vec2(texel.x, 0.0), ${PRESSURE_RANGE.toFixed(1)}) +
            getScalar(pressure, uv - vec2(0.0, texel.y), ${PRESSURE_RANGE.toFixed(1)}) +
            getScalar(pressure, uv + vec2(0.0, texel.y), ${PRESSURE_RANGE.toFixed(1)});
  gl_FragColor = putScalar((p * warm - h * h * div) * 0.25, ${PRESSURE_RANGE.toFixed(1)});
}`,

    // make the velocity divergence free
    gradient: `
uniform sampler2D vel, pressure;
uniform vec2 texel;
uniform float h;
void main() {
  float l = getScalar(pressure, uv - vec2(texel.x, 0.0), ${PRESSURE_RANGE.toFixed(1)});
  float r = getScalar(pressure, uv + vec2(texel.x, 0.0), ${PRESSURE_RANGE.toFixed(1)});
  float b = getScalar(pressure, uv - vec2(0.0, texel.y), ${PRESSURE_RANGE.toFixed(1)});
  float t = getScalar(pressure, uv + vec2(0.0, texel.y), ${PRESSURE_RANGE.toFixed(1)});
  vec2 v = getVec(vel, uv, ${VEL_RANGE.toFixed(1)}) - vec2(r - l, t - b) / (2.0 * h);
  gl_FragColor = putVec(v, ${VEL_RANGE.toFixed(1)});
}`,

    // carry the map along the velocity field
    advectMap: `
uniform sampler2D map, vel;
uniform vec2 mapSize, velSize;
uniform float aspect, dt, relax;
void main() {
  vec2 v = smoothVec(vel, uv, velSize, ${VEL_RANGE.toFixed(1)});
  vec2 m = smoothMap(map, uv - v * dt / vec2(aspect, 1.0), mapSize);
  gl_FragColor = putMap(mix(m, uv, relax));
}`,

    // marbling transforms (after Jaffer & Lu, "Mathematical Marbling"): a tine
    // line shears the picture along the stroke, an ink drop pushes it outwards
    comb: `
uniform sampler2D map;
uniform vec2 mapSize;
uniform float aspect, radius, force, sharpness, tines, spacing, dropR2, dropSlot, relax;
uniform vec2 a, b, dropC;
void main() {
  vec2 q = uv * vec2(aspect, 1.0);
  vec2 src = q;
  if (dropR2 > 0.0) {
    vec2 dq = q - dropC;
    float l2 = dot(dq, dq);
    if (l2 <= dropR2) {
      gl_FragColor = putMap(vec2(${INK_X.toFixed(1)}, (dropSlot + 0.5) / ${HISTORY.toFixed(1)} * 3.0 - 1.0));
      return;
    }
    src = dropC + dq * sqrt(1.0 - dropR2 / l2);
  }
  vec2 D = b - a;
  float len = length(D);
  if (len > 0.0) {
    vec2 perp = vec2(-D.y, D.x) / len;
    float d = 1e9;
    for (int k = 0; k < 32; k++) {
      if (float(k) >= tines) break;
      vec2 off = perp * (float(k) - (tines - 1.0) * 0.5) * spacing;
      d = min(d, segDist(q, a + off, b + off));
    }
    src -= D * force * pow(radius / (d + radius), sharpness);
  }
  vec2 m = smoothMap(map, src / vec2(aspect, 1.0), mapSize);
  gl_FragColor = putMap(mix(m, uv, relax));
}`,

    // write the colour under the pointer into one slot of the ink history
    record: `
uniform sampler2D source;
uniform vec2 at;
void main() { gl_FragColor = vec4(texture2D(source, at).rgb, 1.0); }`,

    // look the colours up in the source, mirrored at the edges, bilinear
    final: `
uniform sampler2D map, source, history;
uniform vec2 srcSize;
vec4 px(vec2 i) { return texture2D(source, (clamp(i, vec2(0.0), srcSize - 1.0) + 0.5) / srcSize); }
void main() {
  vec2 m = getMap(map, uv);
  if (m.x < -0.5) {
    gl_FragColor = texture2D(history, vec2((m.y + 1.0) / 3.0, 0.5));
    return;
  }
  m = 1.0 - abs(1.0 - mod(m, 2.0));
  vec2 f = m * srcSize - 0.5;
  vec2 i = floor(f);
  f -= i;
  gl_FragColor = mix(mix(px(i), px(i + vec2(1.0, 0.0)), f.x), mix(px(i + vec2(0.0, 1.0)), px(i + vec2(1.0, 1.0)), f.x), f.y);
}`
  }

  const vert = `
precision highp float;
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position;
  gl_Position = vec4(2.0 * position - 1.0, 0.0, 1.0);
}`
  const triangle = regl.buffer([[-2, 0], [0, -2], [2, 2]])

  const uniformNames = (frag) => [...frag.matchAll(/uniform\s+\w+\s+([^;]+);/g)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim()))
  const passes = Object.fromEntries(Object.entries(shaders).map(([name, frag]) => [name, regl({
    vert,
    frag: header + frag,
    attributes: { position: triangle },
    uniforms: Object.fromEntries(uniformNames(frag).map((u) => [u, regl.prop(u)])),
    framebuffer: regl.prop('fbo'),
    scissor: { enable: (ctx, props) => !!props.box, box: (ctx, props) => props.box || { x: 0, y: 0, width: 1, height: 1 } },
    depth: { enable: false },
    blend: { enable: false },
    count: 3
  })]))

  const target = (w, h, filter = 'nearest') => regl.framebuffer({
    color: regl.texture({ width: w, height: h, min: filter, mag: filter, wrapS: 'clamp', wrapT: 'clamp' }),
    depthStencil: false
  })
  const placeholder = regl.texture({ width: 1, height: 1 })
  const pingPong = (w, h) => {
    const fbos = [target(w, h), target(w, h)]
    return {
      get read () { return fbos[0] },
      get write () { return fbos[1] },
      swap () { fbos.reverse() },
      destroy () { fbos.forEach((f) => f.destroy()) }
    }
  }

  // ---- pointer, shared by every ink layer -------------------------------------
  const pointer = { x: 0, y: 0, down: false }
  const settings = { button: 0, key: null }
  const ignore = 'button, a, input, select, textarea, summary, [role="button"]'
  // hydra's outputs keep row 0 at the top of the screen (its final blit flips
  // y), so texture coordinates follow the page: no y flip here
  const toCanvas = (e) => {
    const rect = H.canvas.getBoundingClientRect()
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]
  }
  const keyHeld = (e) => !settings.key || e[`${settings.key}Key`]
  const onDown = (e) => {
    if (e.button !== settings.button || !keyHeld(e) || e.target?.closest?.(ignore)) return
    const [x, y] = toCanvas(e)
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    Object.assign(pointer, { x, y, down: true })
  }
  const onMove = (e) => {
    [pointer.x, pointer.y] = toCanvas(e)
    if (pointer.down && (!(e.buttons & [1, 4, 2][settings.button]) || !keyHeld(e))) pointer.down = false
  }
  const onUp = (e) => { if (e.button === settings.button) pointer.down = false }
  const onMenu = (e) => { if (pointer.down && settings.button === 2) e.preventDefault() }
  window.addEventListener('pointerdown', onDown, true)
  window.addEventListener('pointermove', onMove, true)
  window.addEventListener('pointerup', onUp, true)
  window.addEventListener('pointercancel', onUp, true)
  window.addEventListener('contextmenu', onMenu, true)

  // ---- one ink layer ------------------------------------------------------------
  const modes = ['push', 'fluid', 'comb']
  const defaults = {
    radius: 0.08, force: 1, decay: 0.9, dissipation: 0.99, curl: 0.3, iterations: 20,
    resolution: 128, tines: 1, spacing: 0.06, sharpness: 2, drop: 0.02, button: 0, key: null
  }
  const defaultRelax = { push: 0.15, fluid: 0.05, comb: 0 }
  const value = (v, fallback) => {
    const x = typeof v === 'function' ? v() : v
    return typeof x === 'number' && isFinite(x) ? x : fallback
  }

  class InkLayer {
    constructor (id) {
      this.id = id
      this.mode = 'fluid'
      this.options = {}
      this.lastUsed = 0
      this.last = null // pointer position in the previous frame, in canvas units
      this.still = 0 // seconds the pointer has been held without moving
    }

    configure (source, mode, options) {
      if (mode !== this.mode && this.vel) this.clearVelocity()
      this.mode = mode
      this.options = options
      this.lastUsed = performance.now()
      if (source && source.transforms) {
        // a chain: render it into a private output every frame
        if (!this.chainOutput) {
          const Output = H.o[0].constructor
          this.chainOutput = new Output({ regl, precision: H.precision, label: `ink-${this.id}`, width: H.canvas.width, height: H.canvas.height })
        }
        this.chainOutput.render(source.glsl())
        this.source = this.chainOutput
        this.isChain = true
      } else {
        this.source = source
        this.isChain = false
      }
    }

    get (name) {
      if (name === 'relax') return value(this.options.relax, defaultRelax[this.mode])
      return value(this.options[name], defaults[name])
    }

    allocate () {
      const w = H.canvas.width
      const h = H.canvas.height
      const res = Math.max(16, Math.round(this.get('resolution')))
      const aspect = w / h
      const sw = aspect >= 1 ? Math.round(res * aspect) : res
      const sh = aspect >= 1 ? res : Math.round(res / aspect)
      if (this.w === w && this.h === h && this.sw === sw && this.sh === sh) return
      if (this.w !== w || this.h !== h) {
        if (this.map) this.map.destroy()
        if (this.out) this.out.destroy()
        this.map = pingPong(w, h)
        this.out = target(w, h, 'linear')
        if (!this.history) {
          this.history = target(HISTORY, 1, 'linear')
          this.slot = 0
        }
        this.w = w
        this.h = h
        this.resetMap()
        if (this.chainOutput) this.chainOutput.resize(w, h)
      }
      if (this.vel) [this.vel, this.pressure, this.curlBuffer].forEach((b) => b.destroy())
      this.vel = pingPong(sw, sh)
      this.pressure = pingPong(sw, sh)
      this.curlBuffer = target(sw, sh)
      this.sw = sw
      this.sh = sh
      this.clearVelocity()
    }

    resetMap () {
      if (!this.map) return
      passes.initMap({ fbo: this.map.read })
      passes.initMap({ fbo: this.map.write })
    }

    clearVelocity () {
      for (const fbo of [this.vel.read, this.vel.write, this.pressure.read, this.pressure.write]) passes.zero({ fbo })
    }

    reset () {
      this.resetMap()
      if (this.vel) this.clearVelocity()
    }

    // called by hydra while it draws, so this must not draw anything itself
    getTexture () {
      this.lastUsed = performance.now()
      return this.out || placeholder
    }

    step (dt) {
      if (!this.source || performance.now() - this.lastUsed > 1000) return
      this.allocate()
      settings.button = this.get('button')
      settings.key = typeof this.options.key === 'string' ? this.options.key.toLowerCase().replace('control', 'ctrl') : null

      if (this.isChain) {
        this.chainOutput.tick({ time: H.synth.time, mouse: H.synth.mouse, bpm: H.synth.bpm, resolution: [this.w, this.h] })
      }
      const sourceTex = this.isChain ? this.chainOutput.getCurrent() : this.source.getTexture?.()
      if (!sourceTex) return
      this.sourceTex = sourceTex

      const aspect = this.w / this.h
      const now = [pointer.x * aspect, pointer.y]
      const active = pointer.down && this.last !== null
      const a = active ? this.last : now
      const b = now
      this.last = pointer.down ? now : null
      const relax = 1 - Math.exp(-Math.max(0, this.get('relax')) * dt)
      const radius = Math.max(1e-3, this.get('radius'))
      const force = this.get('force')

      if (this.mode === 'comb') {
        this.comb(a, b, active, dt, aspect, radius, force, relax)
      } else {
        this.flow(a, b, active, dt, aspect, radius, force, relax)
      }

      passes.final({ fbo: this.out, map: this.map.read, source: sourceTex, history: this.history, srcSize: [sourceTex.width, sourceTex.height] })
    }

    flow (a, b, active, dt, aspect, radius, force, relax) {
      const size = [this.sw, this.sh]
      const texel = [1 / this.sw, 1 / this.sh]
      const h = 1 / this.sh
      const keep = Math.pow(Math.min(1, Math.max(0, this.get(this.mode === 'fluid' ? 'dissipation' : 'decay'))), dt * 60)
      const mouseVel = [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt]
      passes.velocity({ fbo: this.vel.write, vel: this.vel.read, size, aspect, dt, keep, radius, force, active: active ? 1 : 0, a, b, mouseVel })
      this.vel.swap()

      if (this.mode === 'fluid') {
        passes.curl({ fbo: this.curlBuffer, vel: this.vel.read, texel, h })
        passes.vorticity({ fbo: this.vel.write, vel: this.vel.read, curl: this.curlBuffer, texel, h, dt, strength: this.get('curl') })
        this.vel.swap()
        const iterations = Math.max(1, Math.min(100, Math.round(this.get('iterations'))))
        for (let i = 0; i < iterations; i++) {
          passes.pressure({ fbo: this.pressure.write, vel: this.vel.read, pressure: this.pressure.read, texel, h, warm: i === 0 ? 0.8 : 1 })
          this.pressure.swap()
        }
        passes.gradient({ fbo: this.vel.write, vel: this.vel.read, pressure: this.pressure.read, texel, h })
        this.vel.swap()
      }

      passes.advectMap({ fbo: this.map.write, map: this.map.read, vel: this.vel.read, mapSize: [this.w, this.h], velSize: size, aspect, dt, relax })
      this.map.swap()
    }

    comb (a, b, active, dt, aspect, radius, force, relax) {
      const common = {
        map: this.map.read, mapSize: [this.w, this.h], aspect, radius, force,
        sharpness: Math.max(0.1, this.get('sharpness')),
        tines: Math.max(1, Math.min(32, Math.round(this.get('tines')))),
        spacing: this.get('spacing'),
        dropR2: 0, dropC: [0, 0], dropSlot: 0, relax: 0
      }
      const run = (props) => {
        passes.comb({ ...common, ...props, map: this.map.read, fbo: this.map.write })
        this.map.swap()
      }
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const len = Math.hypot(dx, dy)
      this.still = active && len < 1e-4 ? this.still + dt : 0

      if (active && len >= 1e-4) {
        // split long moves so each step stays a small, invertible shear
        const steps = Math.min(16, Math.ceil(len / (radius * 0.25)))
        for (let i = 0; i < steps; i++) {
          const p = [a[0] + dx * i / steps, a[1] + dy * i / steps]
          const q = [a[0] + dx * (i + 1) / steps, a[1] + dy * (i + 1) / steps]
          run({ a: p, b: q, relax: i === 0 ? relax : 0 })
        }
      } else if (this.still > 0.15 && this.get('drop') > 0) {
        const slot = this.slot
        this.slot = (this.slot + 1) % HISTORY
        passes.record({ fbo: this.history, source: this.sourceTex, at: [b[0] / aspect, b[1]], box: { x: slot, y: 0, width: 1, height: 1 } })
        run({ a: b, b, dropC: b, dropR2: this.get('drop') * dt, dropSlot: slot, relax })
      } else if (relax > 0) {
        run({ a: b, b, relax })
      }
    }

    destroy () {
      for (const b of [this.map, this.out, this.history, this.vel, this.pressure, this.curlBuffer]) b?.destroy()
      this.chainOutput?.fbos.forEach((f) => f.destroy())
    }
  }

  // ---- loop and public functions ------------------------------------------------
  const layers = new Map()
  let frame = null
  let lastTime = null
  const tick = (t) => {
    frame = requestAnimationFrame(tick)
    const dt = lastTime === null ? 1 / 60 : Math.min(0.05, Math.max(0.001, (t - lastTime) / 1000))
    lastTime = t
    layers.forEach((layer) => {
      try { layer.step(dt) } catch (e) { console.warn('hydra-ink:', e) }
    })
  }
  frame = requestAnimationFrame(tick)

  const isSource = (x) => x && (typeof x.getTexture === 'function' || Array.isArray(x.transforms))

  const ink = function (source, mode = 'fluid', options = {}) {
    if (!isSource(source)) {
      throw new Error('ink(source, mode): give it something to marble, e.g. osc().out(o1); ink(o1, "comb").out(o0), or osc().ink("comb").out()')
    }
    if (mode && typeof mode === 'object') {
      options = mode
      mode = options.mode || 'fluid'
    }
    if (!modes.includes(mode)) throw new Error(`ink: unknown mode "${mode}", use one of ${modes.join(', ')}`)
    const id = String(options.id ?? 'ink')
    if (!layers.has(id)) layers.set(id, new InkLayer(id))
    const layer = layers.get(id)
    layer.configure(source, mode, options)
    return scope.src(layer)
  }
  ink.modes = modes
  ink.reset = (id) => layers.forEach((layer) => { if (id === undefined || layer.id === String(id)) layer.reset() })
  ink.layers = layers
  scope.ink = ink

  // chain method: osc().ink('comb').out()
  const chainPrototype = Object.getPrototypeOf(H.generator.sourceClass.prototype)
  chainPrototype.ink = function (mode, options) { return ink(this, mode, options) }

  window.__hydraInk = {
    destroy () {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
      window.removeEventListener('contextmenu', onMenu, true)
      layers.forEach((layer) => layer.destroy())
      layers.clear()
      placeholder.destroy()
    }
  }
}
