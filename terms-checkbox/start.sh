#!/bin/sh
set -e

echo "================================================"
echo " Terms & Conditions Checkbox — Starting up"
echo "================================================"
echo "NODE_ENV : ${NODE_ENV}"
echo "PORT     : ${PORT}"

# Fail fast if required env vars are missing
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Add it in Railway → Variables."
  exit 1
fi

if [ -z "$SHOPIFY_API_KEY" ]; then
  echo "ERROR: SHOPIFY_API_KEY is not set. Add it in Railway → Variables."
  exit 1
fi

if [ -z "$SHOPIFY_API_SECRET" ]; then
  echo "ERROR: SHOPIFY_API_SECRET is not set. Add it in Railway → Variables."
  exit 1
fi

echo ""
echo "Running database migrations..."
npx prisma migrate deploy
echo "Migrations complete."

echo ""
echo "Starting server..."
exec npm run start
