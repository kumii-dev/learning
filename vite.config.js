/**
 * vite.config.js
 * Vite config for the Kumii Learning Hub React frontend.
 *
 * - Root: client/
 * - Build output: dist/
 * - Dev proxy: /api → Express on :3001
 * - Path alias: @/ → client/src/
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'client',

  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },

  server: {
    port: 3000,
    proxy: {
      // Forward all /api requests to the Express backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },

  preview: {
    port: 3000,
  },
});
