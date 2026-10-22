// Minifies bookmarklet/bookmarklet.js into where the dev container's nginx serves the
// web app, so the helper bookmarklet loads the latest code. --watch redeploys on save.
// The Docker image build doesn't run this (vite build emits the file instead).
//
// Usage: node scripts/serve-bookmarklet.mjs [--watch]
// USERTOUR_WEB_SERVE_DIR overrides the target (default /usr/share/nginx/html/web).
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  renameSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { BOOKMARKLET_OUT, BOOKMARKLET_SRC, minifyBookmarklet } from './bookmarklet.mjs';

const serveDir = process.env.USERTOUR_WEB_SERVE_DIR || '/usr/share/nginx/html/web';
const target = join(serveDir, BOOKMARKLET_OUT);

// No nginx here (e.g. running on a laptop): nothing to do
if (!existsSync(serveDir)) {
  console.warn(`[serve-bookmarklet] ${serveDir} doesn't exist, nothing to serve`);
  process.exit(0);
}
try {
  mkdirSync(dirname(target), { recursive: true });
  accessSync(dirname(target), constants.W_OK);
} catch {
  console.warn(
    `[serve-bookmarklet] Can't write to ${dirname(target)}, the served bookmarklet is unchanged. Once, as root:\n` +
      `  chown -R ${process.env.USER || '<you>'} ${dirname(target)}`,
  );
  process.exit(1);
}

async function deploy() {
  try {
    const code = await minifyBookmarklet();
    // Write then rename so nginx never serves a half-written file
    writeFileSync(`${target}.tmp`, code);
    renameSync(`${target}.tmp`, target);
    console.log(`[serve-bookmarklet] ${new Date().toLocaleTimeString()} served ${target}`);
  } catch (error) {
    console.error(`[serve-bookmarklet] Build failed, keeping the previous file:\n${error.message}`);
  }
}

await deploy();

if (process.argv.includes('--watch')) {
  // Watch the folder rather than the file: editors often save by replacing it
  let timer;
  watch(dirname(BOOKMARKLET_SRC), (_event, filename) => {
    if (filename !== basename(BOOKMARKLET_SRC)) return;
    clearTimeout(timer);
    timer = setTimeout(deploy, 100);
  });
  console.log(`[serve-bookmarklet] Watching ${BOOKMARKLET_SRC}`);
}
