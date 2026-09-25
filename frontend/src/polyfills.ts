import { Buffer } from 'buffer'

// ✅ Usar Object.defineProperty con writable: true
// para que las wallets puedan sobreescribir window.cardano
Object.defineProperty(window, 'Buffer', {
  value: Buffer,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'global', {
  value: globalThis,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'process', {
  value: { env: {}, version: 'v18.0.0', browser: true },
  writable: true,
  configurable: true,
})