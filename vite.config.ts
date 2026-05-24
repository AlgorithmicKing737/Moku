import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

export default defineConfig({
  plugins: [sveltekit()],
  clearScreen: false,
  define: {
    __APP_VERSION__: JSON.stringify(env.npm_package_version ?? '0.0.0'),
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !env.TAURI_DEBUG ? 'oxc' : false,
    sourcemap: !!env.TAURI_DEBUG,
  },
})