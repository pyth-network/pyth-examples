import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@0xslither/shared': path.resolve(__dirname, '../shared/index.ts'),
    },
  },
});

