import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend dev server lives at http://localhost:5173.
// Backend (Fastify) lives at http://localhost:3000 and exposes /api/*.
// We proxy /api/* so the frontend can use RELATIVE URLs only — never
// hardcode http://localhost:3000 inside application code.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});