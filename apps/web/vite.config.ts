import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // O game-core é consumido como código-fonte TS: um só passo de build e
      // types compartilhados sem etapa de publicação.
      '@hub/game-core': fileURLToPath(new URL('../../packages/game-core/src/index.ts', import.meta.url)),
    },
  },
  server: {
    host: true,
    proxy: { '/api': { target: 'http://localhost:3333', changeOrigin: true } },
  },
});
