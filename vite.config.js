import { defineConfig } from 'vite'
import hydraLive from './scripts/vite-plugin-hydra-live.mjs'

export default defineConfig({
    //define: { global: {} },
    base: '',
    plugins: [hydraLive()],
    // always http://127.0.0.1:5173, where the Spotify login returns (npm run
    // dev's --host adds the other addresses). If the port is taken, stop with
    // an error instead of moving to 5174, which would not match the redirect
    // URI registered at Spotify.
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
    define: {
        'process.env': {},
        // 'global.window': 'window'
        // global: {}
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis'
            }
        }
    }
})