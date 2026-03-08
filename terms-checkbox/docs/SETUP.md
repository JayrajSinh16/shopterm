# Developer Setup Guide

## Prerequisites

- Node.js 18+
- npm 9+
- A [Shopify Partners](https://partners.shopify.com) account
- A Shopify development store for testing
- Shopify CLI v3+: `npm install -g @shopify/cli @shopify/app`

## First-Time Setup

### 1. Install dependencies

```bash
cd terms-checkbox
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:
```env
SHOPIFY_API_KEY=your_key_from_partners_dashboard
SHOPIFY_API_SECRET=your_secret_from_partners_dashboard
DATABASE_URL=file:./dev.db
HOST=https://your-tunnel-url.ngrok-free.app
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Link the app (if not already done)

```bash
shopify app config link
```

### 5. Start the development server

```bash
shopify app dev
```

This will:
- Start your Remix server
- Create a Cloudflare tunnel
- Install the app on your dev store
- Open the admin embedded app

## Adding the Checkbox to a Theme

1. In your dev store admin: **Online Store → Themes → Customize**
2. Navigate to the **Cart** template
3. Click **Add block**
4. Find **T&C Checkbox** in the list
5. Configure settings in the right sidebar
6. Click **Save**

## Testing

See the test checklist in `agent-implementation-plan.md`, Section 6 (Phase 6).

## Database Browsing

```bash
npx prisma studio
```

Opens a web UI at `http://localhost:5555` to browse/edit the database.
