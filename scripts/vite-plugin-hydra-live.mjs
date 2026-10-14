// Dev-server side of live coding from a desktop editor.
//
// - POST /__hydra/eval  {"code": "...", "mode": "file" | "block", "file": "..."}
//   runs code in every open hydra tab and answers with the first tab's result:
//   {"ok": true, "clients": 1, "loaded": [...]} or {"ok": false, "error": "..."}.
//   Used by the VS Code extension in editors/vscode.
// - GET /__hydra/status  {"clients": n, "watching": [...]}
// - with HYDRA_WATCH set (npm run live), saving a .js file in the watched files or
//   folders runs the whole file, so any editor works.
//
// The endpoints only answer requests from this machine without a browser Origin
// (or from the dev server's own pages), since they run code in the hydra tab.
import fs from 'node:fs'
import path from 'node:path'

const RESULT_TIMEOUT = 4000

const isLoopback = (address = '') =>
  address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.')

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 5e6) reject(new Error('body too large'))
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default function hydraLive({ watch = process.env.HYDRA_WATCH } = {}) {
  const watching = (watch || '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => path.resolve(p))
  let server
  let nextId = 1
  const pending = new Map() // id -> resolve
  let lastFile = null // last file run in watch mode, replayed to tabs that open later

  const clientCount = () => server.ws.clients?.size ?? 0

  function run(message) {
    const id = nextId++
    const clients = clientCount()
    server.ws.send({ type: 'custom', event: 'hydra:eval', data: { ...message, id } })
    if (clients === 0) return Promise.resolve({ ok: false, clients, error: 'no hydra window is open' })
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        resolve({ ok: true, clients, pending: true })
      }, RESULT_TIMEOUT)
      pending.set(id, (result) => {
        clearTimeout(timer)
        resolve({ ...result, ok: !result.error, clients })
      })
    })
  }

  const isWatched = (file) => file.endsWith('.js') && watching.some((w) => file === w || file.startsWith(w + path.sep))

  function runFile(file) {
    let code
    try {
      code = fs.readFileSync(file, 'utf8')
    } catch (e) {
      return
    }
    lastFile = { code, file, mode: 'file' }
    const name = path.relative(process.cwd(), file)
    run(lastFile).then((result) => {
      const status = result.ok ? 'ran' : `error: ${result.error}`
      server.config.logger.info(`[hydra] ${name} ${status}`, { timestamp: true })
    })
  }

  return {
    name: 'hydra-live',
    apply: 'serve',
    configureServer(_server) {
      server = _server

      server.ws.on('hydra:result', ({ id, ...result } = {}) => {
        const resolve = pending.get(id)
        if (resolve) {
          pending.delete(id)
          resolve(result)
        }
      })

      // a tab that opens while watching starts with the last saved sketch
      server.ws.on('hydra:hello', (_data, client) => {
        if (lastFile) client.send('hydra:eval', { ...lastFile, id: 0 })
      })

      if (watching.length > 0) {
        server.watcher.add(watching)
        const onChange = (file) => { if (isWatched(path.resolve(file))) runFile(path.resolve(file)) }
        server.watcher.on('change', onChange)
        server.watcher.on('add', onChange)
        // start with the newest sketch so a fresh tab shows something
        const newest = watching
          .flatMap((w) => {
            try {
              return fs.statSync(w).isDirectory() ? fs.readdirSync(w).map((f) => path.join(w, f)) : [w]
            } catch (e) {
              return []
            }
          })
          .filter((f) => f.endsWith('.js') && fs.existsSync(f))
          .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]
        if (newest) lastFile = { code: fs.readFileSync(newest, 'utf8'), file: newest, mode: 'file' }
        server.httpServer?.once('listening', () => {
          const names = watching.map((w) => path.relative(process.cwd(), w) || '.').join(', ')
          server.config.logger.info(`  [hydra] watching ${names}: saving a .js file there runs it\n`)
        })
      }

      server.middlewares.use('/__hydra', async (req, res, next) => {
        const origin = req.headers.origin
        const host = req.headers.host
        const sameOrigin = origin && host && new URL(origin).host === host
        if (!isLoopback(req.socket.remoteAddress) || (origin && !sameOrigin)) {
          return send(res, 403, { ok: false, error: 'only local editors can run code' })
        }
        if (req.method === 'GET' && req.url === '/status') {
          return send(res, 200, { clients: clientCount(), watching })
        }
        if (req.method === 'POST' && req.url === '/eval') {
          if (!/^application\/json/.test(req.headers['content-type'] || '')) {
            return send(res, 415, { ok: false, error: 'send JSON' })
          }
          let message
          try {
            message = JSON.parse(await readBody(req))
          } catch (e) {
            return send(res, 400, { ok: false, error: 'invalid JSON' })
          }
          if (typeof message.code !== 'string') return send(res, 400, { ok: false, error: 'missing code' })
          const { code, mode = 'block', file } = message
          if (mode === 'file') lastFile = { code, file, mode }
          return send(res, 200, await run({ code, mode, file }))
        }
        next()
      })
    }
  }
}
