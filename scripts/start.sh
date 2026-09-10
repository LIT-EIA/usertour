#!/bin/sh

# Replace environment variables in config.js
envsubst < /usr/share/nginx/html/web/config.js > /usr/share/nginx/html/web/config.js.tmp
mv /usr/share/nginx/html/web/config.js.tmp /usr/share/nginx/html/web/config.js

# Replace NEST_SERVER_PORT in nginx config
sed -i "s/\${NEST_SERVER_PORT}/$NEST_SERVER_PORT/g" /etc/nginx/conf.d/default.conf

# The web app's install snippet and SDK loader request fixed URLs
# (/sdk/es2020/usertour.js, /sdk/legacy/usertour.iife.js), but @usertour/sdk
# builds into a version-numbered subdirectory. The Dockerfile flattens that
# at image build time for production; replicate it here in case start.sh is
# run against a dist that was only plain-copied (e.g. dev builds).
if [ ! -f /usr/share/nginx/html/sdk/es2020/usertour.js ]; then
  SDK_VERSION_DIR=$(find /usr/share/nginx/html/sdk -maxdepth 1 -type d -name '[0-9]*.*' | head -n1)
  [ -n "$SDK_VERSION_DIR" ] && cp -r "$SDK_VERSION_DIR/." /usr/share/nginx/html/sdk/
fi

# Start nginx
nginx

# Run database migrations
pnpm prisma migrate deploy

# Seed database
pnpm prisma db seed

# Start Node.js server
node dist/main 
