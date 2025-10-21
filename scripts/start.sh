#!/bin/sh
cd apps/server
pnpm prisma migrate deploy
pnpm prisma db seed
echo "✅ Ready for attachment to app container"
sleep infinity