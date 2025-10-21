#!/bin/sh
cd apps/server
pnpm prisma migrate deploy
pnpm prisma db seed
sleep infinity