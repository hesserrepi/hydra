// p5.js in instance mode, drawn on a canvas behind hydra. Bundled, so it works offline.
// Use it as a hydra source with s0.init({ src: p5.canvas }).
import p5 from 'p5'

// the plain library, as the CDN script used to provide it (sketches usually replace it with p5 = new P5())
window.p5 = p5

const instances = new Set()

export default class P5 extends p5 {
  constructor ({
    width = window.innerWidth,
    height = window.innerHeight,
    mode = 'P2D',
    keep = false // keep earlier P5 canvases instead of replacing them
  } = {}) {
    // re-running a sketch (e.g. saving it in live mode) would otherwise stack up canvases
    if (!keep) {
      instances.forEach((instance) => instance.remove())
      instances.clear()
    }
    super((p) => {
      p.setup = () => { p.createCanvas(width, height, p[mode]) }
      p.draw = () => { }
    }, 'hydra-ui')
    instances.add(this)
    this.width = width
    this.height = height
    this.mode = mode
    this.canvas.style.position = "absolute"
    this.canvas.style.top = "0px"
    this.canvas.style.left = "0px"
    this.canvas.style.zIndex = -1
  }

  show() {
    this.canvas.style.visibility = "visible"
  }

  hide() {
    this.canvas.style.visibility = "hidden"
  }

  // p5 clear function not covering canvas
  clear() {
    if (this.mode === 'WEBGL') return super.clear()
    this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  remove() {
    instances.delete(this)
    super.remove()
  }
}
