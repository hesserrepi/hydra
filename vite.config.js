import { defineConfig } from 'vite'
import hydraLive from './scripts/vite-plugin-hydra-live.mjs'

export default defineConfig({
    //define: { global: {} },
    base: '',
    plugins: [hydraLive()],
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