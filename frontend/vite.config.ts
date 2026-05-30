import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the backend in development so we avoid CORS issues
    // and don't need to hardcode the backend URL in every fetch call.
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        // Strip /api prefix — backend routes are at /notes, /tags, etc.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
