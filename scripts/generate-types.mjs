// npm run types
// Writes TypeScript declarations for hydra, hyper-hydra and extra shaders so that
// editors with a JavaScript language server (VS Code, Zed, Sublime LSP, neovim...)
// offer autocomplete, hover docs and parameter hints in sketch files:
//   editors/vscode/types/hydra.d.ts        (used by sketches/jsconfig.json and the VS Code extension)
//   editors/vscode/data/extensions.json    (extension list and examples for the VS Code extension)
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
// as a data: URL so Node doesn't need "type": "module"; relative imports are inlined the same way
const dataURL = (p) => 'data:text/javascript;base64,' + Buffer.from(read(p).replace(
  /(\bfrom\s+['"])(\.\.?\/[^'"]+)(['"])/g,
  (m, before, rel, after) => before + dataURL(path.join(path.dirname(p), rel)) + after
)).toString('base64')
const importSource = (p) => import(dataURL(p))

const glslFunctions = (await importSource('node_modules/hydra-synth/src/glsl/glsl-functions.js')).default()
const { extensions, collections } = await importSource('src/extensions/registry.js')

// extra shaders are plain setFunction() calls: run them against a stub to read their definitions
const shaderDefs = new Map() // name -> { def, ext }
for (const ext of extensions.filter((e) => e.collection === 'extra-shaders')) {
  const defs = []
  vm.runInNewContext(read(`public/extensions/${ext.file}`), { setFunction: (def) => defs.push(def), window: {}, console })
  defs.forEach((def) => { if (!shaderDefs.has(def.name)) shaderDefs.set(def.name, { def, ext }) })
}

const isTexture = (input) => input.type === 'sampler2D' || input.type === 'vec4'
const paramType = (input) => (isTexture(input) ? 'HydraTexture' : input.type === 'float' ? 'HydraParam' : 'any')
const fmt = (v) => (typeof v === 'number' ? String(+v.toFixed(6)) : JSON.stringify(v))

function params(def) {
  const inputs = [...def.inputs]
  const list = []
  if (def.type === 'combine' || def.type === 'combineCoord') list.push({ name: 'texture', type: 'HydraTexture', optional: false })
  inputs.forEach((input) => list.push({
    name: input.name.replace(/^_/, ''),
    type: paramType(input),
    optional: !isTexture(input) || input.default != null,
    default: input.default
  }))
  return list
}

function doc(lines) {
  const body = lines.filter((l) => l !== undefined && l !== null)
  if (body.length === 0) return ''
  return `  /**\n${body.map((l) => `   * ${l}`).join('\n')}\n   */\n`
}

function shaderDoc(def, origin) {
  const kind = {
    src: 'source', coord: 'coordinate transform', color: 'color transform',
    combine: 'blends in another texture', combineCoord: 'modulates coordinates with another texture'
  }[def.type] || def.type
  return [
    `${def.name}: ${kind}${origin ? ` (${origin})` : ''}`,
    ...params(def).filter((p) => p.default !== undefined && p.default !== null).map((p) => `@param ${p.name} default ${fmt(p.default)}`)
  ]
}

const signature = (def) => params(def).map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')

const extOrigin = (ext) => {
  const collection = collections.find((c) => c.id === ext.collection)
  return `${collection.name}/${ext.id.split('/')[1]}, loaded automatically`
}
const extDoc = (ext) => [ext.description, `From ${extOrigin(ext)}.`, `@see ${ext.documentation}`]

// sources (osc(), noise()...) and chained methods
const globalsOut = []
const methodsOut = []
const seenGlobals = new Set()
const seenMethods = new Set(['out'])

for (const def of glslFunctions) {
  if (def.type === 'src') {
    seenGlobals.add(def.name)
    globalsOut.push(doc(shaderDoc(def)).replace(/^ {2}/gm, '') + `declare function ${def.name}(${signature(def)}): HydraSource`)
  } else {
    seenMethods.add(def.name)
    methodsOut.push(doc(shaderDoc(def)) + `  ${def.name}(${signature(def)}): HydraSource`)
  }
}

for (const [name, { def, ext }] of shaderDefs) {
  const lines = [...shaderDoc(def, extOrigin(ext)), `@see ${ext.documentation}`]
  if (def.type === 'src') {
    if (seenGlobals.has(name)) continue
    seenGlobals.add(name)
    globalsOut.push(doc(lines).replace(/^ {2}/gm, '') + `declare function ${name}(${signature(def)}): HydraSource`)
  } else {
    if (seenMethods.has(name)) continue
    seenMethods.add(name)
    methodsOut.push(doc(lines) + `  ${name}(${signature(def)}): HydraSource`)
  }
}

// hyper-hydra: names come from the registry, signatures are kept loose
const sourceGlobals = new Set(['arithmetics', 'convolutions', 'src', 'vec4', 'text'])
const propertyMethods = new Set(['rgb', 'cmyk', 'hsv', 'hsl', 'yuv', 'yiq']) // colorspaces: s.hsv.hOffsetFrom(...)
const arraysOut = []
const arrayStaticsOut = []
const outputMembers = []
const sourceMembers = []
const mouseMembers = []
const seenArrays = new Set(['fast', 'smooth', 'ease', 'offset', 'fit'])
const seenMembers = new Set()
const noSignature = new Set(['canvas', 'hydraText', 'hydraTap', 'hydraWrap', 'hydraPip', 'hydraPictureInPicture', 'hydraColorspaces', 'oS'])

for (const ext of extensions.filter((e) => e.collection === 'hyper-hydra' && e.autoload)) {
  const { globals = [], methods = [], arrays = [], members = {} } = ext.provides
  const lines = extDoc(ext)
  const short = ext.id.split('/')[1]
  for (const name of globals) {
    if (seenGlobals.has(name)) continue
    seenGlobals.add(name)
    if (propertyMethods.has(name) || noSignature.has(name)) {
      globalsOut.push(doc(lines).replace(/^ {2}/gm, '') + `declare var ${name}: any`)
    } else {
      const returns = sourceGlobals.has(short) ? 'HydraSource' : 'any'
      globalsOut.push(doc(lines).replace(/^ {2}/gm, '') + `declare function ${name}(...args: HydraArg[]): ${returns}`)
    }
  }
  for (const name of methods) {
    if (seenMethods.has(name)) continue
    seenMethods.add(name)
    if (propertyMethods.has(name)) methodsOut.push(doc(lines) + `  ${name}: any`)
    else if (short === 'blend') methodsOut.push(doc(lines) + `  ${name}(texture?: HydraTexture, amount?: HydraParam): HydraSource`)
    else if (short === 'swizzle') methodsOut.push(`  /** Swizzle channels, from hyper-hydra/swizzle. @see ${ext.documentation} */\n  ${name}(): HydraSource`)
    else methodsOut.push(doc(lines) + `  ${name}(...args: HydraArg[]): HydraSource`)
  }
  for (const name of arrays) {
    if (seenArrays.has(name)) continue
    seenArrays.add(name)
    arraysOut.push(doc(lines) + `  ${name}(...args: any[]): T[]`)
  }
  for (const [obj, props] of Object.entries(members)) {
    const target = { output: outputMembers, source: sourceMembers, mouse: mouseMembers, Array: arrayStaticsOut }[obj]
    for (const prop of props) {
      if (!target || seenMembers.has(`${obj}.${prop}`)) continue
      seenMembers.add(`${obj}.${prop}`)
      target.push(doc(lines) + (obj === 'mouse' ? `  ${prop}: number` : `  ${prop}(...args: any[]): any`))
    }
  }
}

// effects written for this editor: signatures by hand
const effectTypes = {
  ink: `type InkMode = 'push' | 'fluid' | 'comb'
/** Options of ink(); numbers may also be functions, e.g. () => time % 2. See public/extensions/effects/hydra-ink.js. */
interface InkOptions {
  mode?: InkMode
  radius?: HydraParam
  force?: HydraParam
  relax?: HydraParam
  decay?: HydraParam
  dissipation?: HydraParam
  curl?: HydraParam
  iterations?: number
  resolution?: number
  tines?: HydraParam
  spacing?: HydraParam
  sharpness?: HydraParam
  drop?: HydraParam
  button?: 0 | 1 | 2
  key?: 'shift' | 'alt' | 'ctrl' | 'meta'
  id?: string
}`
}
const effectSignatures = {
  ink: {
    global: `declare const ink: {\n  (source: HydraTexture, mode?: InkMode | InkOptions, options?: InkOptions): HydraSource\n  /** Undo every deformation, or only the layer with this id. */\n  reset(id?: string): void\n}`,
    method: `  ink(mode?: InkMode | InkOptions, options?: InkOptions): HydraSource`
  }
}
for (const ext of extensions.filter((e) => e.collection === 'effects')) {
  const lines = extDoc(ext)
  const { globals = [], methods = [] } = ext.provides
  const short = ext.id.split('/')[1]
  if (effectTypes[short]) globalsOut.push(effectTypes[short])
  for (const name of globals) {
    if (seenGlobals.has(name)) continue
    seenGlobals.add(name)
    globalsOut.push(doc(lines).replace(/^ {2}/gm, '') + (effectSignatures[name]?.global || `declare function ${name}(...args: HydraArg[]): HydraSource`))
  }
  for (const name of methods) {
    if (seenMethods.has(name)) continue
    seenMethods.add(name)
    methodsOut.push(doc(lines) + (effectSignatures[name]?.method || `  ${name}(...args: HydraArg[]): HydraSource`))
  }
}

const dts = `// Generated by scripts/generate-types.mjs (npm run types) - do not edit.
// Autocomplete for hydra (hydra-synth ${JSON.parse(read('node_modules/hydra-synth/package.json')).version}),
// hyper-hydra and extra shaders. Extensions are loaded automatically by the editor
// the first time a sketch uses one of their functions.

/** A number, an array of numbers (cycled by bpm) or a function of time. */
type HydraParam = number | number[] | ((args: { time: number; bpm: number }) => number)
/** Anything that can be sampled: a chain, an output (o0-o3) or an external source (s0-s3). */
type HydraTexture = HydraSource | HydraOutput | HydraExternalSource
type HydraArg = HydraParam | HydraTexture

interface HydraSource {
  /** Render this chain to an output (default o0). */
  out(output?: HydraOutput): void
${methodsOut.join('\n')}
}

/** An output buffer: o0, o1, o2, o3. */
interface HydraOutput {
${outputMembers.join('\n')}
}

interface HydraSourceParams { [key: string]: any }

/** An external source: s0, s1, s2, s3. Use with src(s0). */
interface HydraExternalSource {
  /** Webcam. index picks the camera. */
  initCam(index?: number, params?: HydraSourceParams): void
  /** Video file or url. */
  initVideo(url: string, params?: HydraSourceParams): void
  /** Image file or url. */
  initImage(url: string, params?: HydraSourceParams): void
  /** Screen or window capture. */
  initScreen(index?: number, params?: HydraSourceParams): void
  /** Stream from another hydra instance on the patch bay. */
  initStream(streamName: string, params?: HydraSourceParams): void
  /** Any canvas, image or video element: s0.init({ src: el }). */
  init(opts: { src: any; dynamic?: boolean }, params?: HydraSourceParams): void
  clear(): void
${sourceMembers.join('\n')}
}

declare const o0: HydraOutput
declare const o1: HydraOutput
declare const o2: HydraOutput
declare const o3: HydraOutput
declare const s0: HydraExternalSource
declare const s1: HydraExternalSource
declare const s2: HydraExternalSource
declare const s3: HydraExternalSource

/** Show one output, or all four in a grid when called without an argument. */
declare function render(output?: HydraOutput): void
/** Clear all outputs and stop the current sketch. */
declare function hush(): void
declare function setResolution(width: number, height: number): void
/** Load a script, e.g. another hydra extension. Bundled extensions don't need it. */
declare function loadScript(url: string): Promise<void>
/** Define a new glsl function. */
declare function setFunction(definition: {
  name: string
  type: 'src' | 'coord' | 'color' | 'combine' | 'combineCoord'
  inputs: { name: string; type: 'float' | 'sampler2D' | 'vec4'; default?: any }[]
  glsl: string
}): void
/** Called every frame with the milliseconds since the last frame. */
declare var update: (dt: number) => void
/** Seconds since the sketch started. */
declare var time: number
/** Speed of time (default 1). */
declare var speed: number
/** Beats per minute; arrays in parameters step on each beat. */
declare var bpm: number
/** Limit the frame rate. */
declare var fps: number | undefined
declare var width: number
declare var height: number
declare var mouse: {
  x: number
  y: number
${mouseMembers.join('\n')}
}
/** Microphone input. */
declare var a: {
  /** Volume per frequency bin, 0-1. Use as () => a.fft[0] */
  fft: number[]
  setBins(numBins: number): void
  setSmooth(smooth: number): void
  setCutoff(cutoff: number): void
  setScale(scale: number): void
  setMax(max: number): void
  show(): void
  hide(): void
  onBeat: () => void
}
/** The hydra-synth instance. */
declare var hydraSynth: any

// browser globals sketches commonly use (the DOM types are left out so they
// don't clash with hydra names like blur or screen)
declare var window: any
declare var document: any
declare var console: any
declare var navigator: any
declare function fetch(input: any, init?: any): Promise<any>
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number
declare function clearTimeout(id?: number): void
declare function clearInterval(id?: number): void
declare function requestAnimationFrame(callback: (time: number) => void): number

// p5.js. Its full types come from @types/p5 when it can be found (npm install in
// this repository); elsewhere p5 calls are untyped but still allowed.
declare const _P5Library: typeof import('p5')
/**
 * p5.js in instance mode, drawn on a canvas behind hydra: p5 = new P5().
 * Every p5 call starts with p5. (p5.rect(...), p5.mouseX); redefine p5.draw to animate.
 * Use it in hydra with s0.init({ src: p5.canvas }). Running new P5() again replaces
 * the previous canvas unless keep is true.
 * @see https://p5js.org/reference/
 */
declare class P5 extends _P5Library {
  constructor(options?: { width?: number; height?: number; mode?: 'P2D' | 'WEBGL'; keep?: boolean })
  /** The p5 canvas, to use as a hydra source: s0.init({ src: p5.canvas }) */
  canvas: any
  width: number
  height: number
  mode: 'P2D' | 'WEBGL'
  /** Show the p5 canvas behind hydra. */
  show(): void
  /** Hide the p5 canvas (it still works as a source). */
  hide(): void
  /** Clear the canvas to transparent. */
  clear(): void
}
/** Conventionally the P5 instance: p5 = new P5() */
declare var p5: P5

${globalsOut.join('\n')}

interface Array<T> {
  /** Speed at which the array is cycled through. */
  fast(speed?: number): T[]
  /** Smooth between values (0-1). */
  smooth(smooth?: number): T[]
  /** Easing between values, e.g. 'easeInOutCubic', 'sin', or a function. */
  ease(ease?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic' | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart' | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint' | 'sin' | ((t: number) => number)): T[]
  /** Shift the timing of the array (0-1). */
  offset(offset?: number): T[]
  /** Map the values to a new range. */
  fit(low?: number, high?: number): T[]
${arraysOut.join('\n')}
}

interface ArrayConstructor {
${arrayStaticsOut.join('\n')}
}
`

// example sketches under sketches/examples/<topic>/, for the 'Insert example' command
const examplesDir = path.join(root, 'sketches/examples')
const sketchExamples = fs.existsSync(examplesDir) ? fs.readdirSync(examplesDir).flatMap((topic) =>
  fs.readdirSync(path.join(examplesDir, topic)).filter((f) => f.endsWith('.js')).sort().map((file) => {
    const code = fs.readFileSync(path.join(examplesDir, topic, file), 'utf8')
    return { topic, name: file.replace(/^\d+-/, '').replace(/\.js$/, ''), description: code.match(/^\/\/ (.*)/)?.[1] || '', code }
  })) : []

const data = {
  collections,
  sketches: sketchExamples,
  extensions: extensions.map(({ id, collection, name, author, documentation, description, examples, autoload, provides }) =>
    ({ id, collection, name: name || id.split('/')[1], author, documentation, description, examples, autoload, provides }))
}

const outDir = path.join(root, 'editors/vscode')
fs.mkdirSync(path.join(outDir, 'types'), { recursive: true })
fs.mkdirSync(path.join(outDir, 'data'), { recursive: true })
fs.writeFileSync(path.join(outDir, 'types/hydra.d.ts'), dts)
fs.writeFileSync(path.join(outDir, 'data/extensions.json'), JSON.stringify(data, null, 2) + '\n')
console.log(`wrote editors/vscode/types/hydra.d.ts (${seenGlobals.size} functions, ${seenMethods.size} methods) and editors/vscode/data/extensions.json`)
