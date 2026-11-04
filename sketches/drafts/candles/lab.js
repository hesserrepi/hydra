// Candle lab: runs one candle draft at a time on a real hydra canvas, so you see
// what hydra does with the maps that p5 paints. Used by preview.html (npm run dev)
// and by the published preview page.
//
// candleLab({ p5, Hydra, drafts, loadExtensions }) where drafts is [{ file, code }]
// and loadExtensions() loads hyper-hydra's blend and outputs once hydra exists.
export async function candleLab ({ p5: P5Lib, Hydra, drafts, loadExtensions }) {
  const W = 960
  const H = 540
  const $ = (id) => document.getElementById(id)
  const canvas = $('stage')

  const hydra = new Hydra({ canvas, detectAudio: false, makeGlobal: true, width: W, height: H })
  window.hydraSynth = hydra
  // hydra's audio is off here, so drafts that read a.fft get silence and use their stand-in
  window.a = { fft: [0, 0, 0, 0], show () {}, hide () {}, setBins () {}, setCutoff () {}, setSmooth () {}, setScale () {} }
  await loadExtensions()

  // the editor's P5 class, sized to the hydra canvas and kept out of sight
  const holder = document.createElement('div')
  holder.hidden = true
  document.body.appendChild(holder)
  const instances = new Set()
  window.P5 = class extends P5Lib {
    constructor ({ width = W, height = H, mode = 'P2D' } = {}) {
      instances.forEach((p) => p.remove())
      instances.clear()
      super((p) => {
        p.setup = () => { p.pixelDensity(1); p.createCanvas(width, height, p[mode]) }
        p.draw = () => {}
      }, holder)
      instances.add(this)
    }

    show () {}
    hide () {}
    clear () { this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height) }
  }

  // what each draft says about itself in its opening comment
  const parse = ({ file, code }) => {
    const head = []
    for (const line of code.split('\n')) {
      if (!line.startsWith('//')) break
      head.push(line.replace(/^\/\/ ?/, ''))
    }
    const text = head.join(' ').replace(/\s+/g, ' ').trim()
    const [about, plug = ''] = text.split('How it plugs into hydra:')
    const m = about.match(/^Candle draft (\d+)\/\d+: ([^.]+)\. (.*)$/)
    const k = code.indexOf("name: 'keyBy'")
    const end = code.indexOf('\n})', k)
    const kitEnd = code.indexOf('\n}\n', code.indexOf('hdInto = ')) + 3
    return {
      file,
      code,
      n: m ? +m[1] : 0,
      name: m ? m[2] : file,
      about: m ? m[3].trim() : about.trim(),
      plug: plug.trim(),
      hydraPart: code.slice(end + 3).trim(),
      p5Part: code.slice(kitEnd, code.indexOf('// --- hydra ---')).trim()
    }
  }
  const list = drafts.map(parse).sort((x, y) => x.n - y.n)

  const nav = $('drafts')
  const groups = { 1: 'Through hydra: p5 paints maps, hydra does the effect', 11: 'Plain p5: hydra only shows the drawing' }
  list.forEach((d, i) => {
    if (groups[d.n]) {
      const h = document.createElement('p')
      h.className = 'group-label'
      h.textContent = groups[d.n]
      nav.appendChild(h)
    }
    const b = document.createElement('button')
    b.type = 'button'
    b.id = 'draft-btn-' + d.n
    b.innerHTML = `<span class="num">${d.n}</span><span class="nm"></span>`
    b.querySelector('.nm').textContent = d.name
    b.onclick = () => show(i)
    nav.appendChild(b)
  })

  let current = -1
  const burn = $('burn')

  const setProgress = (frac) => {
    if (!window.p5 || !window.p5.millis) return
    window.candleT0 = window.p5.millis() - frac * window.candleBurn * 1000
  }

  const show = (i) => {
    current = i
    const d = list[i]
    nav.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)))
    $('name').textContent = d.name
    $('num').textContent = `Draft ${d.n} of ${list.length}`
    $('about').textContent = d.about
    $('plug').textContent = d.plug
    // plain p5 drafts have nothing to see in hydra, so show their drawing code instead
    const plain = d.hydraPart.length < 80
    $('codeLabel').textContent = plain ? 'The p5 part (the drawing)' : 'The hydra part (change it in the editor)'
    $('code').textContent = plain ? d.p5Part : d.hydraPart
    $('copyNote').textContent = ''
    $('err').hidden = true
    try {
      window.hush()
      window.solid(0, 0, 0, 0).out(window.o2)
      window.solid(0, 0, 0, 0).out(window.o3)
      ;(0, eval)(d.code)
      window.candleBurn = +burn.value
      setProgress(0.25)
    } catch (e) {
      $('err').textContent = `This draft stopped with an error: ${e.message}`
      $('err').hidden = false
    }
    try { history.replaceState(null, '', '#draft-' + d.n) } catch (e) {}
  }

  document.querySelectorAll('button[data-p]').forEach((b) => { b.onclick = () => setProgress(+b.dataset.p) })

  const burnLabel = $('burnLabel')
  burn.oninput = () => {
    // keep the candle at the same height while the burn time changes
    const c = window.candleClock && window.candleClock()
    const frac = c ? c.cycle / window.candleBurn : 0
    window.candleBurn = +burn.value
    burnLabel.textContent = burn.value + ' s'
    setProgress(frac)
  }

  $('copy').onclick = async () => {
    const code = list[current].code
    const note = $('copyNote')
    try {
      await navigator.clipboard.writeText(code)
      note.textContent = 'Copied. Paste it into the editor and run it with Ctrl+Shift+Enter.'
    } catch (e) {
      const pre = $('code')
      pre.textContent = code
      const r = document.createRange()
      r.selectNodeContents(pre)
      const sel = getSelection()
      sel.removeAllRanges()
      sel.addRange(r)
      note.textContent = 'The whole sketch is selected below; copy it with Ctrl+C.'
    }
  }

  setInterval(() => {
    const c = window.candleClock && window.candleClock()
    if (!c) return
    $('wax').textContent = c.lit ? `${Math.round(c.left * 100)}% wax left` : 'out, relights soon'
    $('state').dataset.lit = String(c.lit)
  }, 200)

  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return
    const m = (e.code || '').match(/^Digit(\d)$/)
    if (!m) return
    const k = (+m[1] || 10) + (e.shiftKey ? 10 : 0) // 1 to 0 for drafts 1 to 10, with shift for 11 to 20
    if (k <= list.length) show(k - 1)
  })

  const start = +(location.hash.match(/^#draft-(\d+)$/) || [])[1] || 1
  show(Math.min(list.length, Math.max(1, start)) - 1)
}
