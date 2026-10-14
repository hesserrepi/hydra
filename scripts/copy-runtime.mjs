// Copies the libraries the editor page loads at runtime from node_modules into
// public/vendor/, so the editor works without an internet connection.
// Runs after `npm install` and before `npm run dev` / `npm run build`.
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public', 'vendor')

// [package, file inside the package, file inside public/vendor]
const files = [
  ['hydra-synth', 'dist/hydra-synth.js', 'hydra-synth.js'],
  ['@highlightjs/cdn-assets', 'highlight.min.js', 'highlight.js/highlight.min.js'],
  ['@highlightjs/cdn-assets', 'languages/glsl.min.js', 'highlight.js/languages/glsl.min.js'],
  ['@highlightjs/cdn-assets', 'LICENSE', 'highlight.js/LICENSE'],
  ['js-beautify', 'js/lib/beautify.js', 'js-beautify/beautify.js'],
  ['js-beautify', 'LICENSE', 'js-beautify/LICENSE']
]

for (const [name, from, to] of files) {
  const target = join(dest, to)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(join(root, 'node_modules', name, from), target)
}
console.log(`copied ${files.length} runtime files into ${dest}`)
