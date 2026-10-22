import path from 'node:path';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { BOOKMARKLET_OUT, minifyBookmarklet } from './scripts/bookmarklet.mjs';

// Minifies bookmarklet/bookmarklet.js: served fresh in dev, emitted to dist on build
function bookmarklet(): Plugin {
  return {
    name: 'usertour-bookmarklet',
    configureServer(server) {
      server.middlewares.use(`/${BOOKMARKLET_OUT}`, async (_req, res, next) => {
        try {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(await minifyBookmarklet());
        } catch (error) {
          next(error);
        }
      });
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: BOOKMARKLET_OUT,
        source: await minifyBookmarklet(),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert(), bookmarklet()],
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
