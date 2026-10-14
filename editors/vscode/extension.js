// Hydra live coding for VS Code: sends code to the local hydra editor's dev server
// (POST /__hydra/eval, see scripts/vite-plugin-hydra-live.mjs), which runs it in
// every open hydra tab and reports errors back.
const vscode = require('vscode')
const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

let output
let statusItem
let diagnostics
let flashDecoration
let lastStatus = null // { clients } or null when the server is unreachable

const config = () => vscode.workspace.getConfiguration('hydra')

function request(method, urlPath, body) {
  const url = new URL(urlPath, config().get('serverUrl'))
  const lib = url.protocol === 'https:' ? https : http
  const data = body === undefined ? undefined : JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = lib.request(url, {
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
      timeout: 8000
    }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { text += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(text))
        } catch (e) {
          reject(new Error(`unexpected answer from ${url.origin} (is it the hydra editor?)`))
        }
      })
    })
    req.on('timeout', () => req.destroy(new Error('timed out')))
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

function isSketch(document) {
  if (!document || document.languageId !== 'javascript') return false
  return config().get('sketchFiles').some((pattern) => vscode.languages.match({ pattern }, document) > 0)
}

function updateContext() {
  const editor = vscode.window.activeTextEditor
  vscode.commands.executeCommand('setContext', 'hydra.isSketch', isSketch(editor?.document))
}

function setStatus(status, error) {
  lastStatus = status
  if (!status) {
    statusItem.text = '$(debug-disconnect) hydra'
    statusItem.tooltip = `hydra editor not running at ${config().get('serverUrl')}. Click to start it.`
    statusItem.command = 'hydra.startServer'
    statusItem.backgroundColor = undefined
  } else if (error) {
    statusItem.text = '$(error) hydra'
    statusItem.tooltip = error
    statusItem.command = 'hydra.openBrowser'
    statusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground')
  } else {
    statusItem.text = status.clients > 0 ? `$(play) hydra` : '$(eye-closed) hydra'
    statusItem.tooltip = status.clients > 0 ?
      `${status.clients} hydra window${status.clients > 1 ? 's' : ''} open` :
      'No hydra window open. Click to open one.'
    statusItem.command = 'hydra.openBrowser'
    statusItem.backgroundColor = undefined
  }
}

async function refreshStatus() {
  try {
    const status = await request('GET', '/__hydra/status')
    if (!lastStatus || lastStatus.clients !== status.clients) setStatus(status)
    else lastStatus = status
  } catch (e) {
    setStatus(null)
  }
}

function flash(editor, range) {
  if (!config().get('flash')) return
  editor.setDecorations(flashDecoration, [range])
  setTimeout(() => editor.setDecorations(flashDecoration, []), 250)
}

async function run(editor, range, mode) {
  const document = editor.document
  const code = document.getText(range)
  if (!code.trim()) return
  flash(editor, range)
  let result
  try {
    result = await request('POST', '/__hydra/eval', { code, mode, file: document.uri.fsPath })
  } catch (e) {
    setStatus(null)
    const choice = await vscode.window.showWarningMessage(
      `Can't reach the hydra editor at ${config().get('serverUrl')} (${e.message}).`, 'Start it')
    if (choice) vscode.commands.executeCommand('hydra.startServer')
    return
  }
  if (result.loaded) output.appendLine(result.loaded)
  if (result.clients === 0) {
    setStatus({ clients: 0 })
    const choice = await vscode.window.showInformationMessage('No hydra window is open.', 'Open one')
    if (choice) vscode.commands.executeCommand('hydra.openBrowser')
    return
  }
  if (result.error) {
    output.appendLine(`error: ${result.error}`)
    diagnostics.set(document.uri, [new vscode.Diagnostic(range, `hydra: ${result.error}`, vscode.DiagnosticSeverity.Error)])
    setStatus({ clients: result.clients }, result.error)
    vscode.window.setStatusBarMessage(`hydra: ${result.error}`, 5000)
  } else {
    diagnostics.delete(document.uri)
    setStatus({ clients: result.clients })
  }
}

// the paragraph around the cursor, delimited by blank lines (like alt+enter in the web editor)
function blockRange(document, line) {
  const blank = (n) => document.lineAt(n).isEmptyOrWhitespace
  if (blank(line)) return null
  let start = line
  let end = line
  while (start > 0 && !blank(start - 1)) start--
  while (end < document.lineCount - 1 && !blank(end + 1)) end++
  return new vscode.Range(start, 0, end, document.lineAt(end).text.length)
}

function withEditor(fn) {
  return () => {
    const editor = vscode.window.activeTextEditor
    if (editor) return fn(editor)
  }
}

const selectionOr = (editor, fallback) => (editor.selection.isEmpty ? fallback() : editor.selection)

function findRepo() {
  const configured = config().get('repoPath')
  const candidates = [
    ...(configured ? [configured] : []),
    ...(vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath)
  ]
  // also look upwards from the open file, e.g. sketches/ inside the repo
  const file = vscode.window.activeTextEditor?.document.uri.fsPath
  if (file) {
    for (let dir = path.dirname(file); dir !== path.dirname(dir); dir = path.dirname(dir)) candidates.push(dir)
  }
  return candidates.find((dir) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name === 'hydra-web-editor'
    } catch (e) {
      return false
    }
  })
}

// nearest jsconfig.json from the file's folder up to the workspace folder
function hasJsconfig(document) {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
  for (let dir = path.dirname(document.uri.fsPath); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'jsconfig.json')) || fs.existsSync(path.join(dir, 'tsconfig.json'))) return true
    if (!folder || dir === folder || dir === path.dirname(dir)) return false
  }
}

function setupFolder(context, dir) {
  const types = path.join(context.extensionPath, 'types', 'hydra.d.ts')
  fs.copyFileSync(types, path.join(dir, 'hydra.d.ts'))
  const jsconfig = path.join(dir, 'jsconfig.json')
  if (fs.existsSync(jsconfig)) {
    vscode.window.showInformationMessage(
      `Copied hydra.d.ts to ${dir}. jsconfig.json already exists there: make sure it includes hydra.d.ts and does not list "dom" in "lib".`)
    return
  }
  fs.writeFileSync(jsconfig, JSON.stringify({
    compilerOptions: { target: 'es2022', lib: ['es2022'], checkJs: false },
    include: ['**/*.js', 'hydra.d.ts']
  }, null, 2) + '\n')
  vscode.window.showInformationMessage(`Hydra autocomplete is set up in ${dir}.`)
}

function activate(context) {
  output = vscode.window.createOutputChannel('Hydra')
  diagnostics = vscode.languages.createDiagnosticCollection('hydra')
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  flashDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
    isWholeLine: false
  })
  setStatus(null)
  context.subscriptions.push(output, diagnostics, statusItem, flashDecoration)

  const register = (name, fn) => context.subscriptions.push(vscode.commands.registerCommand(name, fn))

  register('hydra.runLine', withEditor((editor) => {
    const line = editor.document.lineAt(editor.selection.active.line).range
    return run(editor, selectionOr(editor, () => line), 'block')
  }))

  register('hydra.runBlock', withEditor((editor) => {
    const range = selectionOr(editor, () => blockRange(editor.document, editor.selection.active.line))
    if (range) return run(editor, range, 'block')
  }))

  register('hydra.runFile', withEditor((editor) => {
    const document = editor.document
    const all = new vscode.Range(0, 0, document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
    return run(editor, all, 'file')
  }))

  register('hydra.hush', async () => {
    try {
      await request('POST', '/__hydra/eval', { code: 'hush()', mode: 'block' })
    } catch (e) {
      setStatus(null)
    }
  })

  register('hydra.openBrowser', () => vscode.env.openExternal(vscode.Uri.parse(config().get('serverUrl'))))

  register('hydra.startServer', async () => {
    const repo = findRepo()
    if (!repo) {
      const choice = await vscode.window.showWarningMessage(
        'Set hydra.repoPath to the folder of the hydra editor repository to start it from VS Code.', 'Open settings')
      if (choice) vscode.commands.executeCommand('workbench.action.openSettings', 'hydra.repoPath')
      return
    }
    const terminal = vscode.window.terminals.find((t) => t.name === 'hydra') ||
      vscode.window.createTerminal({ name: 'hydra', cwd: repo })
    terminal.show(true)
    terminal.sendText('npm run dev -- --open')
    setTimeout(refreshStatus, 4000)
  })

  register('hydra.setupFolder', async () => {
    const document = vscode.window.activeTextEditor?.document
    let dir = document && !document.isUntitled ? path.dirname(document.uri.fsPath) : undefined
    if (!dir) {
      const picked = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Set up' })
      dir = picked?.[0]?.fsPath
    }
    if (dir) setupFolder(context, dir)
  })

  register('hydra.insertExample', withEditor(async (editor) => {
    const data = JSON.parse(fs.readFileSync(path.join(context.extensionPath, 'data', 'extensions.json'), 'utf8'))
    const sketches = (data.sketches || []).map((sketch) => ({
      label: sketch.name,
      description: sketch.topic,
      detail: sketch.description,
      example: sketch.code.trimEnd()
    }))
    const items = sketches.concat(data.extensions
      .filter((ext) => ext.examples?.length)
      .flatMap((ext) => ext.examples.map((example, i) => ({
        label: ext.examples.length > 1 ? `${ext.name} (${i + 1})` : ext.name,
        description: data.collections.find((c) => c.id === ext.collection)?.name,
        detail: ext.description,
        example
      }))))
    const picked = await vscode.window.showQuickPick(items, { matchOnDescription: true, matchOnDetail: true, placeHolder: 'Insert an example' })
    if (picked) editor.insertSnippet(new vscode.SnippetString().appendText(picked.example + '\n'))
  }))

  register('hydra.newSketch', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'javascript',
      content: '// save under a sketches/ folder (or as *.hydra.js) to use the hydra keybindings\nosc(10, 0.1, 1.2)\n  .out()\n'
    })
    vscode.window.showTextDocument(document)
  })

  register('hydra.toggleRunOnSave', async () => {
    const value = !config().get('runOnSave')
    await config().update('runOnSave', value, vscode.ConfigurationTarget.Global)
    vscode.window.setStatusBarMessage(`hydra: run on save ${value ? 'on' : 'off'}`, 3000)
  })

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (!config().get('runOnSave') || !isSketch(document)) return
      const editor = vscode.window.visibleTextEditors.find((e) => e.document === document)
      if (editor) vscode.commands.executeCommand('hydra.runFile')
    }),
    vscode.workspace.onDidChangeTextDocument((event) => diagnostics.delete(event.document.uri)),
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      updateContext()
      if (!editor || !isSketch(editor.document)) return
      statusItem.show()
      refreshStatus()
      const key = `askedSetup:${path.dirname(editor.document.uri.fsPath)}`
      if (!editor.document.isUntitled && !hasJsconfig(editor.document) && !context.workspaceState.get(key)) {
        context.workspaceState.update(key, true)
        const choice = await vscode.window.showInformationMessage(
          'Set up hydra autocomplete for this folder? It adds jsconfig.json and hydra.d.ts.', 'Set up')
        if (choice) setupFolder(context, path.dirname(editor.document.uri.fsPath))
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => { if (event.affectsConfiguration('hydra')) updateContext() })
  )

  const timer = setInterval(() => { if (vscode.window.state.focused && isSketch(vscode.window.activeTextEditor?.document)) refreshStatus() }, 5000)
  context.subscriptions.push({ dispose: () => clearInterval(timer) })

  updateContext()
  if (isSketch(vscode.window.activeTextEditor?.document)) {
    statusItem.show()
    refreshStatus()
  }
}

function deactivate() {}

module.exports = { activate, deactivate, blockRange }
