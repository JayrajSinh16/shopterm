# Deployment Guide — Railway

## Prerequisites
- [Railway account](https://railway.app) (free $5/month credit)
- [Railway CLI](https://docs.railway.app/guides/cli): `npm install -g @railway/cli`
- Production URL from Railway (shown after first deploy)

---

## Step 1 — Push your code to GitHub
The repo must be on GitHub. Railway deploys directly from it.

---

## Step 2 — Create a Railway project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo** → select `JayrajSinh16/shopterm`
3. Set the **Root Directory** to `terms-checkbox`
4. Railway will detect the `Dockerfile` automatically

---

## Step 3 — Add a PostgreSQL database

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway automatically injects `DATABASE_URL` into your app — nothing to configure

---

## Step 4 — Set environment variables

In Railway → your app service → **Variables**, add:

```
SHOPIFY_API_KEY=your_key_from_partners_dashboard
SHOPIFY_API_SECRET=your_secret_from_partners_dashboard
SHOPIFY_APP_URL=https://your-app.up.railway.app
HOST=https://your-app.up.railway.app
SCOPES=read_orders,read_customers
NODE_ENV=production
```

> `DATABASE_URL` is auto-injected by the Postgres service — do not set it manually.

---

## Step 5 — Get your Railway URL

After the first deploy completes, Railway gives you a public URL like:
`https://terms-checkbox-production-xxxx.up.railway.app`

Use this as your `SHOPIFY_APP_URL` and `HOST` above.

---

## Step 6 — Update Shopify Partners Dashboard

Go to [partners.shopify.com](https://partners.shopify.com) → your app → **App setup**:

| Field | Value |
|---|---|
| App URL | `https://your-app.up.railway.app` |
| Allowed redirect URLs | `https://your-app.up.railway.app/auth/callback` `https://your-app.up.railway.app/auth/shopify/callback` `https://your-app.up.railway.app/api/auth/callback` |
| App Proxy URL | `https://your-app.up.railway.app/api/consent` |

---

## Step 7 — Update shopify.app.toml

```toml
application_url = "https://your-app.up.railway.app"

[auth]
redirect_urls = [
  "https://your-app.up.railway.app/auth/callback",
  "https://your-app.up.railway.app/auth/shopify/callback",
  "https://your-app.up.railway.app/api/auth/callback",
]

[app_proxy]
url = "https://your-app.up.railway.app/api/consent"
```

Then run:
```bash
shopify app config push
```

---

## Step 8 — Deploy the theme extension

```bash
cd terms-checkbox
shopify app deploy
```

This deploys the theme block and checkout extension to Shopify's CDN.

---

## How deploys work after setup

Every `git push` to `main` triggers a Railway redeploy automatically.
Migrations run automatically on startup via the Dockerfile CMD:
```
npx prisma migrate deploy && npm run start
```

---

## Verify deployment

- Health check: `https://your-app.up.railway.app/health` → should return `OK`
- Install on dev store and verify billing, settings, and consent logging work
