import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@usertour/types': path.resolve(__dirname, '../../packages/shared/types/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['@remixicon/react'],
  },
  server: {
    port: 5174,
    open: true,
    https: false,
    hmr: false,
    proxy: {
      '/graphql': {
        target: 'http://localhost:3000/graphql',
        // target: 'https://local.usertour.io/graphql',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/graphql/, ''),
      },
      '/api': {
        target: 'http://localhost:3000/api',
        // target: 'https://local.usertour.io/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
