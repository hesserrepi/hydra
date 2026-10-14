# Hydra live coding for VS Code

Write hydra sketches in VS Code and run them in the local hydra editor from this
repository, with the bundled hyper-hydra and extra shaders extensions.

## Features

- **Run code**: `ctrl+enter` runs the current line (or selection), `alt+enter` the
  block around the cursor (lines between blank lines), `ctrl+shift+enter` the whole
  file, `ctrl+shift+h` hushes. The same keys as the web editor. The code that ran
  flashes.
- **Autocomplete** for every hydra source and method, hyper-hydra and extra shaders,
  with parameter names, default values and links to the docs, through
  `types/hydra.d.ts` and the JavaScript language service.
- **Errors inline**: an error in the hydra window underlines the code that caused it
  and turns the status bar item red.
- **Status bar**: shows whether the hydra editor is running and a window is open;
  click to open one or start the server.
- **Insert extension example**: pick any hyper-hydra / extra shaders example.
- **Run on save** (`Hydra: Toggle run on save`).

Keybindings apply to files matching `hydra.sketchFiles` (default: anything in a
`sketches/` folder, and `*.hydra.js`). All commands are in the palette under "Hydra".

## Install

From the repository root:

```sh
npm install
npm run vscode:package           # creates editors/vscode/hydra-live-<version>.vsix
code --install-extension editors/vscode/hydra-live-0.1.0.vsix
```

Or, while working on the extension, link the folder into VS Code's extensions:
`ln -s "$PWD/editors/vscode" ~/.vscode/extensions/hydra-live`.

## Use

1. `npm run dev` in the repository (or `Hydra: Start the local hydra server`), and
   keep the hydra tab open in Chrome.
2. Open `sketches/` (already set up for autocomplete) or any folder and run
   `Hydra: Set up autocomplete in this folder`.
3. Write, then `ctrl+enter`.

Settings: `hydra.serverUrl` (default `http://localhost:5173`), `hydra.repoPath`,
`hydra.sketchFiles`, `hydra.runOnSave`, `hydra.flash`.
