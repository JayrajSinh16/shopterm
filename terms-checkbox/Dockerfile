# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Shopify API key is needed at build time by @shopify/shopify-app-remix
ARG SHOPIFY_API_KEY
ARG SHOPIFY_API_SECRET
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV SHOPIFY_API_SECRET=$SHOPIFY_API_SECRET

RUN npx prisma generate
RUN npm run build
RUN mkdir -p /app/public

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY package.json ./
COPY start.sh ./
RUN chmod +x start.sh

# Railway injects $PORT at runtime; expose it here for documentation
EXPOSE 3000

CMD ["sh", "start.sh"]
