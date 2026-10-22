// Copies a dev build to where the dev container's nginx serves the SDK, so
// `pnpm build:sdk:dev` changes show up on reload. Only the build:dev scripts run
// this; the Docker image build doesn't.
//
// Usage: node scripts/serve-dev.mjs <es2020|legacy>
// USERTOUR_SDK_SERVE_DIR overrides the target (default /usr/share/nginx/html/sdk).
import { accessSync, constants, cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = process.argv[2];
if (folder !== 'es2020' && folder !== 'legacy') {
  console.error('[serve-dev] Usage: node scripts/serve-dev.mjs <es2020|legacy>');
  process.exit(1);
}

const sdkDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(sdkDir, 'package.json'), 'utf8'));
const source = join(sdkDir, 'dist', version, folder);
const serveDir = process.env.USERTOUR_SDK_SERVE_DIR || '/usr/share/nginx/html/sdk';

// No nginx here (e.g. building on a laptop): nothing to do
if (!existsSync(serveDir)) {
  process.exit(0);
}
try {
  accessSync(serveDir, constants.W_OK);
} catch {
  console.warn(
    `[serve-dev] Can't write to ${serveDir}, the served SDK is unchanged. Once, as root:\n` +
      `  chown -R ${process.env.USER || '<you>'} ${serveDir}`,
  );
  process.exit(0);
}

// Same layout as the Docker image: /sdk/<folder>/ for the loader and chunks,
// /<version>/<folder>/ for the CSS the bundle links to
for (const target of [join(serveDir, folder), join(serveDir, version, folder)]) {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}
console.log(`[serve-dev] Served ${folder} build from ${serveDir}`);
