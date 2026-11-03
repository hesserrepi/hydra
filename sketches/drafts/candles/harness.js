// Runs the candle drafts side by side outside hydra (used by preview.html).
// Each draft is plain editor code, so this gives it a sandbox with its own
// globals, a P5 class that draws into a grid cell, and do-nothing hydra functions.
export function mountCandles (p5lib, files, grid, { width = 480, height = 270, burn = 30, backdrop = true } = {}) {
  const hydraStub = new Proxy(function () {}, { get: () => hydraStub, apply: () => hydraStub })
  const hydraNames = ['src', 'osc', 'noise', 'shape', 'gradient', 'solid', 'voronoi', 'render', 'speed', 'setFunction', 'a', 'o0', 'o1', 'o2', 'o3']
  // hydra adds these to arrays; here they just return the array
  ;['smooth', 'fast', 'ease', 'offset', 'fit'].forEach((m) => {
    if (!Array.prototype[m]) Object.defineProperty(Array.prototype, m, { value () { return this }, configurable: true })
  })
  const scopes = []

  Object.keys(files).sort().forEach((name) => {
    const code = files[name]
    const title = (code.match(/^\/\/ Candle draft (\d+)\/10: ([^.]+)/) || [, '', name])
    const cell = document.createElement('figure')
    cell.className = 'cell'
    const holder = document.createElement('div')
    holder.className = 'stage'
    const caption = document.createElement('figcaption')
    caption.innerHTML = `<b>${title[1]}</b> ${title[2]}`
    cell.append(holder, caption)
    grid.append(cell)

    class P5 extends p5lib {
      constructor () {
        super((p) => { p.setup = () => { p.createCanvas(width, height) }; p.draw = () => {} }, holder)
      }

      hide () {}
      show () {}
    }

    const vars = { P5, s0: { init () {} } }
    hydraNames.forEach((n) => { vars[n] = hydraStub })
    const scope = new Proxy(vars, {
      has: () => true,
      get: (t, k) => (k in t ? t[k] : k === Symbol.unscopables ? undefined : window[k]),
      set: (t, k, v) => { t[k] = k === 'candleBurn' ? burn : k === 'candleBackground' ? backdrop : v; return true }
    })
    // eslint-disable-next-line no-new-func
    new Function('scope', `with (scope) {\n${code}\n}`)(scope)
    scopes.push(vars)
  })

  return {
    // jump every draft to a point of its burn: 0 = just lit, 1 = burnt down, >1 = out
    setProgress (frac) {
      scopes.forEach((v) => { v.candleT0 = v.p5.millis() - frac * v.candleBurn * 1000 })
    },
    // true: each draft paints its own backdrop; false: transparent, as it is over hydra
    setBackdrop (on) {
      backdrop = on
      scopes.forEach((v) => { v.candleBackground = on })
    },
    setBurn (seconds) {
      scopes.forEach((v) => {
        const frac = ((v.p5.millis() - v.candleT0) / 1000) / v.candleBurn
        v.candleBurn = seconds
        v.candleT0 = v.p5.millis() - frac * seconds * 1000
      })
    }
  }
}
