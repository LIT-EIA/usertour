// Shared by vite.config.ts and serve-bookmarklet.mjs: minifies the helper bookmarklet
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformWithEsbuild } from 'vite';

export const BOOKMARKLET_SRC = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../bookmarklet/bookmarklet.js',
);
export const BOOKMARKLET_OUT = 'bookmarklet/bookmarklet.min.js';

export async function minifyBookmarklet() {
  const source = await readFile(BOOKMARKLET_SRC, 'utf8');
  const { code } = await transformWithEsbuild(source, BOOKMARKLET_SRC, {
    minify: true,
    target: 'es2020',
  });
  return code;
}
