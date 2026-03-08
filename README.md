# Shopterm

A Shopify app that adds customizable Terms & Conditions checkboxes to product pages and checkout.

## Features

- Theme extension with customizable checkbox blocks
- Checkout extension for Plus stores
- Consent logging and analytics
- Multi-language support (EN, DE, ES, FR)
- Export consent records

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure `.env` with your Shopify credentials
4. Run migrations: `npx prisma migrate dev`
5. Start dev server: `npm run dev`

## Tech Stack

- Remix + React
- Shopify App Bridge
- Prisma + SQLite
- Polaris UI