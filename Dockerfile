FROM node:22.13-alpine

WORKDIR /app

RUN npm install -g pnpm
RUN npm install -g prisma

# Copy package files and workspace config
COPY . ./
COPY apps/sdk/.env.example ./apps/sdk/.env
COPY apps/web/.env.example ./apps/web/.env
COPY apps/server/.env.example ./apps/server/.env

RUN pnpm install 

# Install system dependencies
RUN apk add --no-cache nginx openssl openssl-dev libc6-compat gettext

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx

# Copy start script
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"] 