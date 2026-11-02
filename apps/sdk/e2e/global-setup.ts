import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../node_modules/.cache/e2e-harness');

const bundle = (entry: string, name: string) =>
  build({
    configFile: false,
    logLevel: 'warn',
    plugins: [react()],
    resolve: {
      alias: {
        '@usertour/types': resolve(__dirname, '../../../packages/shared/types/src/index.ts'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
    build: {
      lib: {
        entry: resolve(__dirname, entry),
        name: `UsertourTest_${name.replace(/\W/g, '_')}`,
        formats: ['iife'],
        fileName: () => `${name}.js`,
      },
      outDir,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: false,
    },
  });

/** Bundles the test entries for the fixture pages */
export default async function globalSetup() {
  await bundle('harness.ts', 'harness');
  await bundle('checklist-harness.tsx', 'checklist-harness');
  await bundle('launcher-harness.tsx', 'launcher-harness');
}
