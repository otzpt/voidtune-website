import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // The FastAPI backend runs separately on 8000; proxying keeps the frontend
    // calling relative /api paths in both dev and production.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: {
    // three.js is most of the bundle and dwarfs the 500kB default warning, so
    // the warning would fire on every build and stop meaning anything.
    chunkSizeWarningLimit: 1500,
  },
});
