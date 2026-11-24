// hydra-song: keep a sketch in time with a song that plays OUTSIDE hydra
// (Spotify), run a function when a song starts, and show its lyrics in sync.
//
//   song.connect('YOUR_SPOTIFY_CLIENT_ID')      // once; later song.connect()
//   song.lyrics.init(s1, { size: 0.08, position: 'bottom' })
//
//   song.on('blue monday', () => {              // runs when that song plays,
//     osc(20, 0.1, 1).layer(src(s1)).out()      // also if you are late
//     song.cue('1:12', () => voronoi(8).layer(src(s1)).out())
//   })
//
// The clock
//   song.time        seconds into the song (keeps running between updates)
//   song.progress    0-1 through the song
//   song.playing     false while paused
//   song.track       { id, name, artist, artists, album, duration, uri } or null
//   song.beat        beats since the start, after song.bpm(120) (see below)
//
// Spotify (automatic)
//   song.connect(clientId, options)  logs in to Spotify (a "connect" button
//       appears; the login opens in a popup) and then asks Spotify about once a
//       second which song is playing and how far in it is. The client id comes
//       from an app you create at https://developer.spotify.com/dashboard with
//       the redirect URI http://127.0.0.1:5173/spotify-callback . It is
//       remembered in this browser, so afterwards song.connect() is enough.
//       options: { interval: 1000 (ms between checks), redirectUri }
//   song.disconnect()   stop asking;  song.logout()  also forget the login
//
// By hand (no Spotify, works with any player)
//   song.start('artist - title', 5)  "this song is playing and is 5 s in now":
//       runs the functions registered for it and looks up its lyrics.
//       song.start(5) restarts the clock without naming a song.
//   song.sync(5)      the song is at 5 s now (corrects the clock; with Spotify
//                     connected it becomes an offset that stays for the song)
//   song.sync('0:42.5') minutes:seconds works wherever a time is expected
//   song.nudge(0.1)   shift everything 0.1 s later (negative = earlier);
//                     Ctrl+Alt+Right / Ctrl+Alt+Left do the same in 0.1 s steps,
//                     Ctrl+Alt+Down resets. song.offset holds the total.
//
// Functions per song
//   song.on(match, fn)  fn(track) runs when a matching song starts, and right
//       away if it is playing already. match is part of 'artist - title' (any
//       case), a Spotify track id / link, a RegExp or a function(track).
//       song.on('*', fn) runs for songs nothing else matches. Registering the
//       same match again replaces the old function, so a sketch can be
//       re-evaluated. song.off(match) removes one, song.off() all.
//   song.cue(time, fn)  inside such a function: run fn when the song reaches
//       that time. If you join late or seek, the last cue before the current
//       position runs, so the picture matches the part of the song.
//   song.bpm(120, firstBeat = 0)  no beat data comes from Spotify; give the
//       tempo and song.beat counts beats (use it like () => song.beat % 1).
//
// Lyrics
//   Synced lyrics are looked up for every song: first a local file
//   lyrics/<artist> - <title>.lrc (folder public/lyrics/ of this editor), then
//   https://lrclib.net (a free, open lyrics database; the song title, artist,
//   album and length are sent to it). Results are remembered in this browser.
//   song.lyrics.init(s1, style)  draws the current line on a canvas and uses
//       it as the hydra source s1: src(s1) is the text on a transparent
//       background, so osc().layer(src(s1)) puts it on top and anything else
//       (modulate, kaleid, mask, diff ...) works too.
//   song.lyrics.style(style)     change the look later
//   style (numbers and colours may be functions, e.g. size: () => 0.08 + a.fft[0] * 0.05)
//       font        'Chivo, Helvetica, Arial, sans-serif'
//       weight      700
//       size        text height as a fraction of the screen height   0.08
//       color       'white'
//       highlight   colour of the words already sung, when the lyrics have
//                   word timing (null = no highlight)                  null
//       outline     outline colour (null = none), outlineWidth 0.12 (of size)
//       shadow      soft dark glow behind the text for readability    true
//       background  colour behind everything (null = transparent)     null
//       position    'center' | 'top' | 'bottom' or [x, y] in 0-1      'bottom'
//       align       'center' | 'left' | 'right'                       'center'
//       width       widest line as a fraction of the screen width     0.86
//       uppercase   false
//       next        also show the following line, dimmed              false
//       fade        seconds a line takes to fade in and out           0.25
//       lead        show each line this many seconds early            0
//   song.lyrics.line / .next / .index / .lineProgress (0-1) / .lines
//       the current state, for your own drawing (e.g. with p5 or hydra-text)
//   song.lyrics.status  'none' | 'loading' | 'synced' | 'plain' | 'missing'
//   song.lyrics.set(lrcText)   use this LRC text for the current song
//   song.lyrics.load(url)      the same from a file
//   song.lyrics.online = false never ask lrclib.net
//   song.lyrics.forget()       empty the remembered lyrics
//
//   song.hud(true)  small status line (song, time, offset, lyrics); it is on
//                   while connecting. song.status() returns the same as text.

{
  const getHydra = () => [window.hydraSynth, window._hydra, window.hydra, window.h, window.H, window.hy].find((h) => h?.regl)
  const H = getHydra()
  const scope = H?.sandbox?.makeGlobal === false ? H.synth : window

  // loading the script again (an explicit loadScript) replaces the old instance
  if (window.__hydraSong) window.__hydraSong.destroy()

  const STORE = 'hydra-song:'
  const store = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(STORE + key); return v == null ? fallback : JSON.parse(v) } catch (e) { return fallback }
    },
    set(key, value) {
      try {
        if (value == null) localStorage.removeItem(STORE + key)
        else localStorage.setItem(STORE + key, JSON.stringify(value))
      } catch (e) { /* private window or full: carry on without remembering */ }
    }
  }
  const now = () => performance.now()
  const val = (v) => (typeof v === 'function' ? v() : v)
  const log = (...args) => console.log('%csong', 'color:#1db954', ...args)
  const warn = (...args) => console.warn('song:', ...args)

  // '1:12.5' | '72.5' | 72.5 -> seconds
  const seconds = (t) => {
    if (typeof t === 'number') return t
    const parts = String(t).trim().split(':').map(Number)
    if (parts.some(Number.isNaN)) throw new Error(`song: "${t}" is not a time (use seconds or 'm:ss')`)
    return parts.reduce((sum, p) => sum * 60 + p, 0)
  }
  const clockText = (s) => {
    const sign = s < 0 ? '-' : ''
    s = Math.abs(s)
    return `${sign}${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
  }
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

  // ---------------------------------------------------------------- clock
  // the song position is `pos` seconds at the moment `at`, and runs on from there
  const clock = { pos: 0, at: now(), playing: false, offset: 0 }
  let track = null
  let jumped = true // the position did not simply run on: cues need to catch up
  let tempo = null // { bpm, first }

  const rawTime = () => clock.pos + (clock.playing ? (now() - clock.at) / 1000 : 0)
  const setClock = (pos, playing = true) => { clock.pos = pos; clock.at = now(); clock.playing = playing; jumped = true }

  // ------------------------------------------------- functions per song
  const handlers = new Map() // key -> { match, fn }
  let cues = []
  let lastCueTime = 0
  let lastCue = null

  const keyOf = (match) => (match instanceof RegExp ? match.toString() : typeof match === 'function' ? match : norm(match))
  const trackLabel = (t) => norm(`${t.artist || ''} - ${t.name || ''}`)
  const spotifyId = (s) => (/^(?:spotify:track:|https?:\/\/open\.spotify\.com\/(?:intl-\w+\/)?track\/)?([A-Za-z0-9]{22})(?:\?.*)?$/.exec(String(s).trim()) || [])[1]
  function matches(match, t) {
    if (!t) return false
    if (match === '*') return false
    if (match instanceof RegExp) return match.test(`${t.artist || ''} - ${t.name || ''}`)
    if (typeof match === 'function') return !!match(t)
    const id = spotifyId(match)
    if (id && t.id) return id === t.id
    const m = norm(match)
    return m !== '' && trackLabel(t).includes(m)
  }
  function run(entry) {
    cues = []
    lastCue = null
    jumped = true
    try { entry.fn(track, song) } catch (err) { console.error(`song: the function for ${entry.match} failed`, err) }
  }
  function runHandlers() {
    if (!track) return
    const all = [...handlers.values()]
    const specific = all.filter((h) => matches(h.match, track))
    const list = specific.length ? specific : all.filter((h) => h.match === '*')
    cues = []
    list.forEach(run)
  }
  function runCues(t) {
    if (!cues.length) { lastCueTime = t; jumped = false; return }
    const fire = (cue) => {
      lastCue = cue
      try { cue.fn(track, song) } catch (err) { console.error(`song: the cue at ${clockText(cue.time)} failed`, err) }
    }
    if (jumped || t < lastCueTime || t - lastCueTime > 1.5) {
      // joined late or seeked: bring the picture to the right part of the song
      const past = cues.filter((c) => c.time <= t)
      const cue = past[past.length - 1]
      if (cue && cue !== lastCue) fire(cue)
      if (!cue) lastCue = null
    } else {
      cues.filter((c) => c.time > lastCueTime && c.time <= t).forEach(fire)
    }
    lastCueTime = t
    jumped = false
  }

  function setTrack(next, pos, playing = true) {
    track = next
    clock.offset = 0
    setClock(pos, playing)
    lyrics._trackChanged()
    if (track) log(`▶ ${track.artist ? track.artist + ' - ' : ''}${track.name || 'song'} at ${clockText(pos)}`)
    runHandlers()
  }

  // ------------------------------------------------------------- spotify
  const AUTH = 'https://accounts.spotify.com'
  const API = 'https://api.spotify.com/v1'
  const SCOPES = 'user-read-currently-playing user-read-playback-state'
  const spotify = { clientId: store.get('client-id'), token: store.get('token'), interval: 1000, timer: null, active: false, state: 'off', redirectUri: null, pending: null, failures: 0 }

  const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const randomText = (n = 48) => b64url(crypto.getRandomValues(new Uint8Array(n)))
  const isLoopback = (host) => host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  function defaultRedirect() {
    // Spotify accepts http only for 127.0.0.1; the callback page hops back to
    // the address the editor is open at (see public/spotify-callback.html)
    const host = isLoopback(location.hostname) ? `127.0.0.1${location.port ? ':' + location.port : ''}` : location.host
    const protocol = isLoopback(location.hostname) ? 'http:' : location.protocol
    return `${protocol}//${host}/spotify-callback`
  }

  async function login() {
    if (!crypto.subtle) throw new Error('song: the Spotify login needs https or localhost / 127.0.0.1')
    const verifier = randomText(64)
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    const nonce = randomText(16)
    const redirectUri = spotify.redirectUri || defaultRedirect()
    store.set('login', { verifier, nonce, redirectUri })
    const state = b64url(new TextEncoder().encode(JSON.stringify({ n: nonce, o: location.origin })))
    const params = new URLSearchParams({ client_id: spotify.clientId, response_type: 'code', redirect_uri: redirectUri, scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state })
    return `${AUTH}/authorize?${params}`
  }
  async function tokenRequest(body) {
    const res = await fetch(`${AUTH}/api/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: spotify.clientId, ...body }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(`Spotify login failed: ${data.error_description || data.error || res.status}`), { status: res.status })
    spotify.token = { access: data.access_token, refresh: data.refresh_token || spotify.token?.refresh, expires: Date.now() + (data.expires_in - 60) * 1000 }
    store.set('token', spotify.token)
  }
  async function finishLogin({ code, state, error }) {
    const pending = store.get('login')
    if (!pending) return
    let nonce = null
    try { nonce = JSON.parse(atob(String(state).replace(/-/g, '+').replace(/_/g, '/'))).n } catch (e) { /* not ours */ }
    if (nonce !== pending.nonce) return
    store.set('login', null)
    if (error || !code) { spotify.state = 'login'; warn(`Spotify login was not completed (${error || 'no code'})`); hud.update(); return }
    try {
      await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: pending.redirectUri, code_verifier: pending.verifier })
      log('connected to Spotify')
      startPolling()
    } catch (err) { spotify.state = 'login'; warn(err.message); hud.update() }
  }
  // the popup hands the code back through one of these (see spotify-callback.html)
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('hydra-song') : null
  if (channel) channel.onmessage = (e) => { if (e.data?.type === 'spotify-auth') finishLogin(e.data) }
  const onStorage = (e) => {
    if (e.key !== STORE + 'auth' || !e.newValue) return
    try { finishLogin(JSON.parse(e.newValue)) } catch (err) { /* ignore */ }
    store.set('auth', null)
  }
  window.addEventListener('storage', onStorage)

  async function accessToken() {
    if (!spotify.token) return null
    if (Date.now() > spotify.token.expires) {
      if (!spotify.token.refresh) { spotify.token = null; store.set('token', null); return null }
      try { await tokenRequest({ grant_type: 'refresh_token', refresh_token: spotify.token.refresh }) } catch (err) {
        if (err.status === 400 || err.status === 401) { spotify.token = null; store.set('token', null) } // the login was revoked
        throw err
      }
    }
    return spotify.token.access
  }

  function fromSpotify(item) {
    const artists = (item.artists || []).map((a) => a.name)
    return { id: item.id, uri: item.uri, name: item.name, artist: artists[0] || '', artists, album: item.album?.name || '', duration: item.duration_ms / 1000, source: 'spotify' }
  }
  async function poll() {
    let wait = spotify.interval
    try {
      const token = await accessToken()
      if (!token) { spotify.state = 'login'; hud.update(); return }
      const sent = now()
      const res = await fetch(`${API}/me/player/currently-playing`, { headers: { Authorization: `Bearer ${token}` } })
      const received = now()
      if (res.status === 401) { spotify.token.expires = 0; wait = 0 } else if (res.status === 429) {
        wait = Math.max(spotify.interval, (Number(res.headers.get('Retry-After')) || 5) * 1000)
        warn(`Spotify asks to slow down, waiting ${Math.round(wait / 1000)} s`)
      } else if (res.status === 204) {
        spotify.state = 'idle'
        if (track?.source === 'spotify') clock.playing = false
      } else if (!res.ok) {
        throw new Error(`Spotify answered ${res.status}`)
      } else {
        const data = await res.json()
        spotify.state = 'on'
        spotify.failures = 0
        if (data.item && data.currently_playing_type === 'track') {
          // the answer describes a moment between sending and receiving
          const pos = data.progress_ms / 1000 + (data.is_playing ? (now() - (sent + received) / 2) / 1000 : 0)
          const next = fromSpotify(data.item)
          if (!track || track.source !== 'spotify' || (track.id || track.uri) !== (next.id || next.uri)) {
            setTrack(next, pos, data.is_playing)
          } else {
            const drift = pos - rawTime()
            if (clock.playing !== data.is_playing || Math.abs(drift) > 0.35) setClock(pos, data.is_playing) // paused, resumed or seeked
            else { clock.pos = rawTime() + drift * 0.25; clock.at = now() } // even out the jitter between answers
          }
        } else if (track?.source === 'spotify') clock.playing = false
      }
    } catch (err) {
      if (++spotify.failures === 3) warn(`cannot reach Spotify (${err.message}); the clock keeps running, still trying`)
      wait = Math.min(15000, spotify.interval * 2 ** Math.min(spotify.failures, 4))
    } finally {
      hud.update()
      if (spotify.active && spotify.token) spotify.timer = setTimeout(poll, wait)
    }
  }
  function startPolling() {
    clearTimeout(spotify.timer)
    spotify.active = true
    spotify.state = 'connecting'
    poll()
  }

  // ------------------------------------------------------------------ hud
  const hud = {
    el: null,
    wanted: false,
    lastText: '',
    ensure() {
      if (this.el) return this.el
      const el = document.createElement('div')
      el.id = 'hydra-song-hud'
      el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:1000;font:12px/1.4 monospace;color:#fff;background:rgba(0,0,0,.7);padding:6px 10px;border-radius:4px;max-width:60vw;pointer-events:none;white-space:pre-wrap'
      const text = document.createElement('span')
      const button = document.createElement('button')
      button.textContent = 'connect Spotify'
      button.style.cssText = 'display:none;margin-left:8px;pointer-events:auto;cursor:pointer;font:inherit;color:#000;background:#1db954;border:0;border-radius:3px;padding:3px 8px'
      button.onclick = async () => {
        // opened right inside the click, or the browser blocks the popup
        const popup = window.open('', 'hydra-song-login', 'width=480,height=720')
        try {
          const url = await login()
          if (popup) popup.location = url
          else warn(`the browser blocked the login window; allow popups for this page, or open ${url}`)
        } catch (err) { popup?.close(); warn(err.message) }
      }
      el.append(text, button)
      // not in <body>: the editor redraws the body and would drop it
      document.documentElement.appendChild(el)
      this.el = el
      this.text = text
      this.button = button
      return el
    },
    update() {
      const needsLogin = spotify.active && spotify.state === 'login'
      if (!this.wanted && !needsLogin) { if (this.el) this.el.style.display = 'none'; return }
      this.ensure()
      if (!this.el.isConnected) document.documentElement.appendChild(this.el)
      this.el.style.display = ''
      this.button.style.display = needsLogin ? '' : 'none'
      const text = needsLogin ? 'song: not logged in to Spotify' : song.status()
      if (text !== this.lastText) { this.text.textContent = text; this.lastText = text }
    }
  }

  // --------------------------------------------------------------- lyrics
  // LRC: "[01:12.40]text", several time tags per line, optional word tags
  // "<01:12.80>word" (enhanced LRC) and an "[offset:+250]" header in ms
  function parseLRC(text) {
    const lines = []
    let offset = 0
    for (const row of String(text).split(/\r?\n/)) {
      const meta = /^\s*\[offset:\s*([+-]?\d+)\s*\]/i.exec(row)
      if (meta) { offset = Number(meta[1]) / 1000; continue }
      const times = []
      let rest = row
      for (;;) {
        const m = /^\s*\[(\d+):(\d+(?:[.:]\d+)?)\]/.exec(rest)
        if (!m) break
        times.push(Number(m[1]) * 60 + Number(m[2].replace(':', '.')))
        rest = rest.slice(m[0].length)
      }
      if (!times.length) continue
      let words = null
      if (/<\d+:\d+(?:\.\d+)?>/.test(rest)) {
        words = []
        const re = /<(\d+):(\d+(?:\.\d+)?)>([^<]*)/g
        let m
        while ((m = re.exec(rest))) if (m[3].trim()) words.push({ time: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() })
        rest = words.map((w) => w.text).join(' ')
      }
      for (const time of times) lines.push({ time, text: rest.trim(), words })
    }
    // LRC offset: positive = lyrics appear earlier
    lines.forEach((l) => { l.time -= offset; if (l.words) l.words = l.words.map((w) => ({ ...w, time: w.time - offset })) })
    return lines.sort((a, b) => a.time - b.time)
  }

  const LRCLIB = 'https://lrclib.net/api'
  const lyricsKey = (t) => `${norm(t.artist)}|${norm(t.name)}|${Math.round(t.duration || 0)}`
  const isLRC = (text) => /^\s*\[\d+:\d+/m.test(text) && !/^\s*</.test(text)

  async function findLocal(t) {
    const name = `${t.artist ? t.artist + ' - ' : ''}${t.name}`.replace(/[\\/:*?"<>|]/g, '_')
    try {
      const res = await fetch(new URL(`lyrics/${encodeURIComponent(name)}.lrc`, document.baseURI))
      if (!res.ok) return null
      const text = await res.text()
      return isLRC(text) ? { synced: text, source: `lyrics/${name}.lrc` } : null // a dev server answers missing files with the editor page
    } catch (e) { return null }
  }
  async function findOnline(t) {
    const cache = store.get('lyrics', {})
    const key = lyricsKey(t)
    if (cache[key]) return { ...cache[key], source: 'lrclib.net (remembered)' }
    let hit = null
    if (t.duration) {
      const q = new URLSearchParams({ track_name: t.name, artist_name: t.artist, album_name: t.album || '', duration: Math.round(t.duration) })
      const res = await fetch(`${LRCLIB}/get?${q}`)
      if (res.ok) hit = await res.json()
    }
    if (!hit?.syncedLyrics) {
      const q = new URLSearchParams(t.artist ? { track_name: t.name, artist_name: t.artist } : { q: t.name })
      const res = await fetch(`${LRCLIB}/search?${q}`)
      const list = res.ok ? await res.json() : []
      const near = (r) => (t.duration ? Math.abs(r.duration - t.duration) : 0)
      const synced = list.filter((r) => r.syncedLyrics && near(r) < 3).sort((a, b) => near(a) - near(b))[0]
      hit = synced || hit || list.find((r) => r.plainLyrics && near(r) < 3) || null
    }
    if (!hit) return null
    const found = { synced: hit.syncedLyrics || null, plain: hit.plainLyrics || null }
    if (found.synced || found.plain) {
      const keys = Object.keys(cache)
      if (keys.length > 300) delete cache[keys[0]]
      cache[key] = found
      store.set('lyrics', cache)
    }
    return { ...found, source: 'lrclib.net' }
  }

  const defaultStyle = { font: 'Chivo, Helvetica, Arial, sans-serif', weight: 700, size: 0.08, color: 'white', highlight: null, outline: null, outlineWidth: 0.12, shadow: true, background: null, position: 'bottom', align: 'center', width: 0.86, uppercase: false, next: false, fade: 0.25, lead: 0 }

  const lyrics = {
    lines: [],
    plain: null,
    status: 'none',
    source: null,
    online: true,
    canvas: null,
    _style: { ...defaultStyle },
    _manual: null, // { key, text } set by hand for one song
    _request: 0,

    get index() {
      const t = song.time + (val(this._style.lead) || 0)
      let lo = 0
      let hi = this.lines.length - 1
      let found = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (this.lines[mid].time <= t) { found = mid; lo = mid + 1 } else hi = mid - 1
      }
      return found
    },
    get current() { return this.lines[this.index] || null },
    get line() { return this.current?.text || '' },
    get next() { return this.lines[this.index + 1]?.text || '' },
    get lineProgress() {
      const i = this.index
      if (i < 0) return 0
      const start = this.lines[i].time
      const end = this.lines[i + 1]?.time ?? (track?.duration || start + 5)
      return Math.min(1, Math.max(0, (song.time + (val(this._style.lead) || 0) - start) / Math.max(0.001, end - start)))
    },

    _use(found) {
      this.lines = found?.synced ? parseLRC(found.synced) : []
      this.plain = found?.plain || null
      this.source = found?.source || null
      this.status = this.lines.length ? 'synced' : this.plain ? 'plain' : 'missing'
      if (track) log(this.status === 'synced' ? `lyrics: ${this.lines.length} lines from ${this.source}` : this.status === 'plain' ? 'lyrics: found only without times (song.lyrics.plain); add a .lrc file for this song to show them' : 'lyrics: none found for this song')
    },
    async _trackChanged() {
      const request = ++this._request
      this.lines = []
      this.plain = null
      this.source = null
      if (!track?.name) { this.status = 'none'; return }
      if (this._manual?.key === lyricsKey(track)) return this._use({ synced: this._manual.text, source: 'song.lyrics.set' })
      this.status = 'loading'
      const t = track
      let found = null
      try {
        found = await findLocal(t)
        if (!found && this.online) found = await findOnline(t)
      } catch (err) { warn(`could not look up the lyrics (${err.message})`) }
      if (request === this._request) this._use(found)
    },
    set(text) {
      this._request++
      this._manual = track ? { key: lyricsKey(track), text } : null
      this._use({ synced: text, source: 'song.lyrics.set' })
      return this
    },
    async load(url) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`song: could not load ${url} (${res.status})`)
      return this.set(await res.text())
    },
    forget() { store.set('lyrics', null); return this },
    style(options = {}) { Object.assign(this._style, options); return this },
    init(source, options = {}) {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas')
        this._ctx = this.canvas.getContext('2d')
      }
      this.style(options)
      this._draw()
      const s = source || scope.s0
      s.init({ src: this.canvas, dynamic: true })
      return s
    },

    _layout(ctx, line, size, maxWidth) {
      // words with their own times, or the plain text split at spaces
      const upper = val(this._style.uppercase)
      const words = (line.words || line.text.split(/\s+/).filter(Boolean).map((text) => ({ text, time: null }))).map((w) => ({ ...w, text: upper ? w.text.toUpperCase() : w.text }))
      const space = ctx.measureText(' ').width
      const rows = [[]]
      let x = 0
      for (const word of words) {
        const w = ctx.measureText(word.text).width
        if (x > 0 && x + w > maxWidth) { rows.push([]); x = 0 }
        rows[rows.length - 1].push({ ...word, x, w })
        x += w + space
      }
      return rows.filter((r) => r.length).map((row) => ({ words: row, width: row[row.length - 1].x + row[row.length - 1].w }))
    },
    _drawLine(ctx, line, y, size, alpha, t, anchor) {
      const st = this._style
      const W = this.canvas.width
      const align = val(st.align)
      const pos = val(st.position)
      const cx = Array.isArray(pos) ? val(pos[0]) * W : W / 2
      const maxWidth = W * val(st.width)
      const rows = this._layout(ctx, line, size, maxWidth)
      const lineHeight = size * 1.2
      const highlight = val(st.highlight)
      const outline = val(st.outline)
      // anchor 1: rows grow upwards (bottom), 0.5: around the middle, 0: downwards
      let rowY = y - (rows.length - 1) * lineHeight * anchor
      ctx.globalAlpha = alpha
      for (const row of rows) {
        const left = align === 'left' ? cx - maxWidth / 2 : align === 'right' ? cx + maxWidth / 2 - row.width : cx - row.width / 2
        for (const word of row.words) {
          if (outline) {
            ctx.lineWidth = size * val(st.outlineWidth)
            ctx.strokeStyle = outline
            ctx.strokeText(word.text, left + word.x, rowY)
          }
          ctx.fillStyle = highlight && word.time != null && word.time <= t ? highlight : val(st.color)
          ctx.fillText(word.text, left + word.x, rowY)
        }
        rowY += lineHeight
      }
      ctx.globalAlpha = 1
      return rows.length * lineHeight
    },
    _draw() {
      const canvas = this.canvas
      if (!canvas) return
      const hc = H?.canvas
      const W = hc?.width || window.innerWidth
      const Ht = hc?.height || window.innerHeight
      if (canvas.width !== W || canvas.height !== Ht) { canvas.width = W; canvas.height = Ht }
      const ctx = this._ctx
      const st = this._style
      ctx.clearRect(0, 0, W, Ht)
      const background = val(st.background)
      if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, W, Ht) }
      const i = this.index
      const line = this.lines[i]
      if (!line) return
      const t = song.time + (val(st.lead) || 0)
      const nextLine = this.lines[i + 1]
      const fade = Math.max(0.001, val(st.fade))
      const end = nextLine ? nextLine.time : Infinity
      const alpha = Math.max(0, Math.min(1, (t - line.time) / fade, (end - t) / fade))
      const size = Math.max(4, val(st.size) * Ht)
      ctx.font = `${val(st.weight)} ${size}px ${val(st.font)}`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.lineJoin = 'round'
      if (val(st.shadow)) { ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = size * 0.25 } else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0 }
      const pos = val(st.position)
      const up = pos === 'bottom'
      const y = Array.isArray(pos) ? val(pos[1]) * Ht : pos === 'top' ? size * 1.1 : pos === 'center' ? Ht / 2 : Ht - size * (val(st.next) ? 2.4 : 1.1)
      const anchor = up ? 1 : pos === 'top' ? 0 : 0.5
      const used = line.text ? this._drawLine(ctx, line, y, size, alpha, t, anchor) : 0
      if (val(st.next) && nextLine?.text) {
        const small = size * 0.6
        ctx.font = `${val(st.weight)} ${small}px ${val(st.font)}`
        this._drawLine(ctx, { ...nextLine, words: null }, y + Math.max(0, used - size * 1.2) * (1 - anchor) + size * 1.1, small, 0.45, t, 0)
      }
    }
  }

  // ----------------------------------------------------------------- song
  const song = {
    lyrics,
    get time() { return rawTime() + clock.offset },
    get playing() { return clock.playing },
    get track() { return track },
    get offset() { return clock.offset },
    get progress() { return track?.duration ? Math.min(1, Math.max(0, this.time / track.duration)) : 0 },
    get beat() { return tempo ? ((this.time - tempo.first) * tempo.bpm) / 60 : 0 },
    get connected() { return spotify.active && spotify.state !== 'login' && !!spotify.token },

    connect(clientId, options = {}) {
      if (clientId && typeof clientId === 'object') { options = clientId; clientId = options.clientId }
      if (clientId && clientId !== spotify.clientId) {
        if (spotify.clientId) { spotify.token = null; store.set('token', null) } // another app: log in again
        spotify.clientId = String(clientId).trim()
        store.set('client-id', spotify.clientId)
      }
      if (options.interval) spotify.interval = Math.max(250, options.interval)
      if (options.redirectUri) spotify.redirectUri = options.redirectUri
      if (!spotify.clientId) {
        warn("no Spotify client id yet. Create an app at https://developer.spotify.com/dashboard (redirect URI http://127.0.0.1:5173/spotify-callback) and call song.connect('its client id')")
        return this
      }
      if (options.hud !== false) hud.wanted = true
      spotify.active = true
      if (spotify.token) startPolling()
      else { spotify.state = 'login'; hud.update(); log('click "connect Spotify" (bottom right) to log in') }
      return this
    },
    disconnect() { spotify.active = false; spotify.state = 'off'; clearTimeout(spotify.timer); hud.update(); return this },
    logout() { this.disconnect(); spotify.token = null; store.set('token', null); return this },

    start(name, at = 0) {
      if (typeof name === 'number' || (typeof name === 'string' && /^[\d:.]+$/.test(name))) { at = name; name = null }
      let next = { id: null, uri: null, name: '', artist: '', artists: [], album: '', duration: 0, source: 'manual' }
      if (name && typeof name === 'object') next = { ...next, ...name, source: 'manual' }
      else if (name) {
        const split = String(name).split(/\s+[-–—]\s+/)
        next.name = split.length > 1 ? split.slice(1).join(' - ') : split[0]
        next.artist = split.length > 1 ? split[0] : ''
        next.artists = next.artist ? [next.artist] : []
      }
      setTrack(next, seconds(at), true)
      return this
    },
    sync(at) {
      const t = seconds(at)
      if (track?.source === 'spotify' && spotify.active) clock.offset = t - rawTime()
      else { clock.offset = 0; setClock(t, true) }
      jumped = true
      log(`synced to ${clockText(t)}${clock.offset ? ` (offset ${clock.offset.toFixed(2)} s)` : ''}`)
      return this
    },
    nudge(by = 0.1) { clock.offset += by; hud.update(); return this },
    pause() { clock.pos = rawTime(); clock.at = now(); clock.playing = false; return this },
    resume() { clock.at = now(); clock.playing = true; return this },

    on(match, fn) {
      if (typeof fn !== 'function') throw new Error("song.on(match, fn): fn must be a function, e.g. song.on('title', () => osc().out())")
      const entry = { match, fn }
      handlers.set(keyOf(match), entry)
      if (track && (matches(match, track) || (match === '*' && ![...handlers.values()].some((h) => matches(h.match, track))))) run(entry)
      return this
    },
    off(match) {
      if (match === undefined) handlers.clear()
      else handlers.delete(keyOf(match))
      return this
    },
    cue(time, fn) {
      if (typeof fn !== 'function') throw new Error("song.cue(time, fn): fn must be a function, e.g. song.cue('1:12', () => noise().out())")
      cues.push({ time: seconds(time), fn })
      cues.sort((a, b) => a.time - b.time)
      jumped = true
      return this
    },
    bpm(value, firstBeat = 0) { tempo = value ? { bpm: value, first: seconds(firstBeat) } : null; return this },

    hud(show = true) { hud.wanted = !!show; hud.update(); return this },
    status() {
      const t = track
      const name = t ? `${t.artist ? t.artist + ' - ' : ''}${t.name || '(unnamed)'}` : 'no song'
      const time = t ? ` ${clockText(this.time)}${t.duration ? ' / ' + clockText(t.duration) : ''}${clock.playing ? '' : ' (paused)'}` : ''
      const offset = clock.offset ? ` offset ${clock.offset > 0 ? '+' : ''}${clock.offset.toFixed(2)}s` : ''
      const where = spotify.active ? ` | spotify: ${spotify.state}` : ''
      return `${name}${time}${offset}${t ? ` | lyrics: ${lyrics.status}` : ''}${where}`
    }
  }

  // ----------------------------------------------------------------- loop
  let frame = 0
  let raf = 0
  const tick = () => {
    raf = requestAnimationFrame(tick)
    if (track) runCues(song.time)
    lyrics._draw()
    if (++frame % 6 === 0) hud.update()
  }
  raf = requestAnimationFrame(tick)

  const onKey = (e) => {
    if (!e.ctrlKey || !e.altKey) return
    if (e.key === 'ArrowRight') song.nudge(0.1)
    else if (e.key === 'ArrowLeft') song.nudge(-0.1)
    else if (e.key === 'ArrowDown') { clock.offset = 0; hud.update() } else return
    e.preventDefault()
    e.stopPropagation()
    log(`offset ${clock.offset.toFixed(2)} s`)
  }
  window.addEventListener('keydown', onKey, true)

  window.__hydraSong = {
    destroy() {
      cancelAnimationFrame(raf)
      clearTimeout(spotify.timer)
      spotify.active = false
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('storage', onStorage)
      channel?.close()
      hud.el?.remove()
    },
    parseLRC
  }
  scope.song = song
}
