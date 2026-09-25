import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import path from 'path' 

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(), // ESTO ARREGLA EL ERROR DE TRANSACTIONBUILDER
    topLevelAwait(), // ESTO PERMITE QUE LUCID CARGUE EN ORDEN
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mapeo directo para evitar el error de .ready
      'libsodium-wrappers-sumo': 'libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js',
    },
  },
  optimizeDeps: {
    exclude: ['lucid-cardano', 'libsodium-wrappers-sumo']
  }
})