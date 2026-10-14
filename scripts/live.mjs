// npm run live [-- files or folders...] [--no-open]
// Starts the editor with the dev server watching sketch files (default: sketches/)
// and opens it in the browser. Saving a watched .js file in any editor runs it.
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const open = !args.includes('--no-open')
const targets = args.filter((a) => !a.startsWith('--'))
if (targets.length === 0) targets.push('sketches')
for (const target of targets) {
  if (!fs.existsSync(target) && !target.endsWith('.js')) fs.mkdirSync(target, { recursive: true })
}
process.env.HYDRA_WATCH = targets.map((t) => path.resolve(t)).join(',')

const server = await createServer({ server: { open: open ? '/' : false } })
await server.listen()
server.printUrls()
