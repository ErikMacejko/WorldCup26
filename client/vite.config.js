import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy /api to the backend so cookies share the `localhost` host.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
});
