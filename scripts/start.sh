#!/bin/sh
# Replace NEST_SERVER_PORT in nginx config
sed -i "s/\${NEST_SERVER_PORT}/$NEST_SERVER_PORT/g" /etc/nginx/conf.d/default.conf

# Start nginx
nginx

cd apps/server
pnpm prisma migrate deploy
pnpm prisma db seed
echo "✅ Ready for attachment to app container"
sleep infinity