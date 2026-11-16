---
paths: ["nginx/**", "scripts/start.sh", "Dockerfile"]
---
# nginx: production vs. dev container

- `nginx/default.conf` is the **production** config. The `Dockerfile` copies it by name, and it serves the web UI as a static build from `/usr/share/nginx/html/web`.
- `nginx/default.dev.conf` is **dev only**. It's identical except `location /` proxies to the Vite dev server (`pnpm dev:web`, port 5174) with `Cache-Control: no-store`. Nothing in the production build reads it.
- The Coder template (`main.tf` on the `dev-container` branch) copies `default.dev.conf` to `/etc/nginx/conf.d/default.conf` when it exists and starts `pnpm dev:web` in the background (log: `/var/log/vite.log`). Otherwise it falls back to `default.conf`.
- Both files use a `${NEST_SERVER_PORT}` placeholder that `scripts/start.sh` fills in with `sed`. Keep that placeholder in both.
- When you change shared routes (API, WebSocket, SDK) in one file, make the same change in the other.
- The SDK is still served from `/usr/share/nginx/html/sdk` in dev. `pnpm build:sdk:dev` copies a fresh build there through `apps/sdk/scripts/serve-dev.mjs`.
- Apply by hand (as root): `sed 's/\${NEST_SERVER_PORT}/3000/g' nginx/default.dev.conf > /etc/nginx/conf.d/default.conf && nginx -t && nginx -s reload`.
- Port 80 returns 502 while Vite isn't running.
