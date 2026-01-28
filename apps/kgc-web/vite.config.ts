import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kgc/ui': path.resolve(__dirname, '../../packages/shared/ui/src'),
    },
    // Dedupe React and related packages to prevent multiple instances
    dedupe: ['react', 'react-dom', 'zustand'],
  },
  server: {
    port: 5173,
    allowedHosts: ['dev-kgc.mflerp.com', 'tst-kgc.mflerp.com', 'uat-kgc.mflerp.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
