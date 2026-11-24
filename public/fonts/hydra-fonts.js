// hydra-fonts: self-hosted, open-licensed (SIL OFL 1.1) fonts for
// hydra text sources. Everything is local: no Google Fonts / CDN requests.
//
//   await loadScript('/fonts/hydra-fonts.js')   // registers and loads them all
//   await hydraFonts.ready                        // fonts are now usable on canvas
//
//   // hyper-hydra's hydra-text: font = family, fontStyle = "weight [stretch]"
//   text('DRIFT', { font: 'Syne', fontStyle: '800' }).modulate(noise(3), .1).out()
//   text('SLOW', { font: 'Anybody', fontStyle: '900 ultra-condensed' }).out()
//
//   // song-sync lyrics: font + weight (weight may be a function)
//   song.lyrics.style({ font: '"Big Shoulders Display"', weight: 900 })
//
//   // your own canvas: any weight 1-1000 inside the font's range works
//   ctx.font = '650 120px "Bricolage Grotesque"'
//
//   hydraFonts.list()  -> names, weight and width ranges, in the console
//
// Canvas never waits for a font: if you draw before it has loaded you get
// the fallback (usually Arial/Times) silently. That is why this file loads
// every face eagerly and exposes hydraFonts.ready.
(() => {
  const here = document.currentScript && document.currentScript.src
  const base = here ? new URL('.', here).href : '/fonts/'

  // family, file, weight range, width range (stretch %), style, note
  const faces = [
    ['Bricolage Grotesque', 'bricolage-grotesque/BricolageGrotesque-Variable.ttf', '200 800', '75% 100%', 'normal', 'workhorse with a voice'],
    ['Syne', 'syne/Syne-Variable.ttf', '400 800', '100%', 'normal', 'gets wider as it gets bolder'],
    ['Anybody', 'anybody/Anybody-Variable.ttf', '100 900', '50% 150%', 'normal', 'width 50-150%: animate it'],
    ['Anybody', 'anybody/Anybody-Italic-Variable.ttf', '100 900', '50% 150%', 'italic', ''],
    ['Big Shoulders Display', 'big-shoulders-display/BigShouldersDisplay-Variable.ttf', '100 900', '100%', 'normal', 'condensed, for stacks'],
    ['Fraunces', 'fraunces/Fraunces-Variable.ttf', '100 900', '100%', 'normal', 'the serif: soft, heavy'],
    ['Fraunces', 'fraunces/Fraunces-Italic-Variable.ttf', '100 900', '100%', 'italic', ''],
    ['Martian Mono', 'martian-mono/MartianMono-Variable.ttf', '100 800', '75% 112.5%', 'normal', 'monospace, code-poetry'],
    ['Dela Gothic One', 'dela-gothic-one/DelaGothicOne-Regular.ttf', '400', '100%', 'normal', 'ultra heavy, best as a mask'],
    // somber set, for projected poetry
    ['Newsreader', 'newsreader/Newsreader-Variable.ttf', '200 800', '100%', 'normal', 'somber: stanzas, long lines'],
    ['Newsreader', 'newsreader/Newsreader-Italic-Variable.ttf', '200 800', '100%', 'italic', ''],
    ['Imbue', 'imbue/Imbue-Variable.ttf', '100 900', '100%', 'normal', 'somber: tall condensed Didone, titles'],
    ['Zen Old Mincho', 'zen-old-mincho/ZenOldMincho-Regular.ttf', '400', '100%', 'normal', 'somber: mincho, Latin + Japanese (400, 900)'],
    ['Zen Old Mincho', 'zen-old-mincho/ZenOldMincho-Black.ttf', '900', '100%', 'normal', ''],
  ]

  const loaded = faces.map(([family, file, weight, stretch, style]) => {
    const face = new FontFace(family, `url("${base}${file}")`, { weight, stretch, style, display: 'block' })
    document.fonts.add(face)
    return face.load().catch(e => console.warn('[hydra-fonts] could not load', family, file, e))
  })

  // only list faces that have a note (skips the italic / second-weight rows)
  const api = {
    faces,
    ready: Promise.all(loaded).then(() => api),
    list () {
      console.table(faces.filter(f => f[5]).map(([family, , weight, stretch, , note]) => ({ family, weight, stretch, note })))
      return faces.map(f => f[0]).filter((f, i, a) => a.indexOf(f) === i)
    },
    // font shorthand for a canvas: hydraFonts.css('Anybody', 120, 900, 'condensed')
    css (family, px, weight = 700, stretch = 'normal', style = 'normal') {
      return `${style} ${weight} ${stretch} ${px}px "${family}"`
    },
  }
  window.hydraFonts = api
})()
