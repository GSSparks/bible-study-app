import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({ }),
  ],
  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8088',
    },
  },
});
