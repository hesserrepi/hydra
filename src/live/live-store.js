// Browser side of live coding from a desktop editor (see
// scripts/vite-plugin-hydra-live.mjs): runs code sent by the dev server and
// reports the result back. Only active under the vite dev server.
export default function liveStore(state, emitter) {
  const hot = import.meta.hot
  if (!hot) return

  hot.on('hydra:eval', ({ id, code, mode }) => {
    if (mode === 'file') {
      emitter.emit('editor: load code', code)
      emitter.emit('ui: hide info')
    }
    emitter.emit('repl: eval', code, (_codeString, isError) => {
      // errors thrown while the sketch runs are reported a moment after evaluation
      setTimeout(() => {
        const error = isError || state.isError ? state.errorMessage || 'error' : null
        hot.send('hydra:result', { id, error, loaded: state.logMessage || '' })
      }, 50)
    })
  })

  // the dev server answers with the sketch it is watching, if any
  emitter.on('DOMContentLoaded', () => hot.send('hydra:hello', {}))
}
