# Build stage for server
FROM node:22.21-alpine AS server-builder

WORKDIR /app

# pnpm version must match the root package.json "packageManager" (lockfile v9)
RUN npm install -g pnpm@9.0.6

# Install server deps from the root lockfile so builds are reproducible.
# apps/server/node_modules holds symlinks into /app/node_modules/.pnpm, so the
# production stage must keep this same layout.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile --filter @usertour/server...

WORKDIR /app/apps/server
RUN pnpm prisma generate
RUN pnpm build

# Copy email templates after build
COPY apps/server/src/email-templates ./dist/email-templates

# Build stage for web and sdk
FROM node:22.21-alpine AS web-builder

WORKDIR /app

RUN npm install -g pnpm

# Copy package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/web ./apps/web
COPY apps/sdk ./apps/sdk
COPY apps/sdk/.env.example ./apps/sdk/.env
COPY packages ./packages


# Generate config.js dynamically from .env.example
# This will overwrite the existing config.js file
RUN echo "window.ENV = {" > ./apps/web/public/config.js && \
    cat ./apps/web/.env.example | while read line; do \
    if [ ! -z "$line" ]; then \
        var_name=$(echo $line | cut -d'=' -f1 | tr -d ' ' | sed 's/VITE_//'); \
        echo "  $var_name: '\$$var_name'," >> ./apps/web/public/config.js; \
    fi \
    done && \
    echo "};" >> ./apps/web/public/config.js

RUN pnpm install
RUN pnpm --filter @usertour/types build
RUN pnpm --filter @usertour/web build
RUN pnpm --filter @usertour/sdk build
RUN pnpm --filter @usertour/sdk build:iife

# Copy SDK files to a known location
RUN SDK_VERSION=$(node -e "console.log(require('./apps/sdk/package.json').version)") && \
    mkdir -p /sdk-dist && \
    cp -r apps/sdk/dist/$SDK_VERSION/* /sdk-dist/

# Production stage
FROM node:22.21-alpine

WORKDIR /app

# Set npm registry and install base tools
RUN npm install -g pnpm

# Install system dependencies
RUN apk add --no-cache nginx openssl openssl-dev libc6-compat gettext
RUN apk add --no-cache openssl3 openssl3-dev

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts from both builders
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html/web
COPY --from=web-builder /app/apps/sdk/dist /usr/share/nginx/html/sdk
COPY --from=web-builder /sdk-dist /usr/share/nginx/html/sdk

COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=server-builder /app/apps/server/dist ./apps/server/dist
COPY --from=server-builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=server-builder /app/apps/server/prisma ./apps/server/prisma

# start.sh runs prisma, the seed, and dist/main relative to the server dir
WORKDIR /app/apps/server

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx

# Copy start script
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"] 