# Deployment Guide

## Option A: Fly.io (Recommended)

### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Launch app
```bash
fly launch
# Follow prompts — it will detect Node.js automatically
```

### 3. Set secrets
```bash
fly secrets set DATABASE_URL="postgresql://user:pass@host:5432/dbname"
fly secrets set SHOPIFY_API_KEY="your_api_key"
fly secrets set SHOPIFY_API_SECRET="your_api_secret"
fly secrets set SHOPIFY_APP_URL="https://your-app.fly.dev"
```

### 4. Update Prisma for PostgreSQL
In `prisma/schema.prisma`, change:
```prisma
datasource db {
  provider = "postgresql"   # was "sqlite"
  url      = env("DATABASE_URL")
}
```

### 5. Deploy
```bash
fly deploy
fly ssh console -C "npx prisma migrate deploy"
```

---

## Option B: Railway

1. Connect your GitHub repository at [railway.app](https://railway.app)
2. Add a PostgreSQL database service
3. Set environment variables in the Railway dashboard
4. Deploy runs automatically on git push

---

## Option C: Render

1. Create a new Web Service at [render.com](https://render.com)
2. Connect your repository
3. Set build command: `npm install && npx prisma generate`
4. Set start command: `npm run start`
5. Set environment variables
6. Add a PostgreSQL database

---

## After Deploying

### Update Shopify Partners Dashboard
1. App URL → `https://your-production-url.com`
2. Redirect URLs → add `https://your-production-url.com/auth/callback`
3. App Proxy URL → `https://your-production-url.com/api/consent`

### Update shopify.app.toml
```toml
application_url = "https://your-production-url.com"

[auth]
redirect_urls = [
  "https://your-production-url.com/auth/callback",
  "https://your-production-url.com/auth/shopify/callback",
]

[app_proxy]
url = "https://your-production-url.com/api/consent"
```

### Deploy Theme Extension
```bash
shopify app deploy
```

### Run Production Migrations
```bash
# Fly.io
fly ssh console -C "npx prisma migrate deploy"

# Railway / Render
# Set the following as a release command:
# npx prisma migrate deploy
```
