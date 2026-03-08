# SHOPIFY TERMS & CONDITIONS CHECKBOX APP
## Complete Agent Implementation Plan

---

# SECTION 1: PROJECT OVERVIEW

## 1.1 What This App Does
A Shopify app that adds an "I agree to terms and conditions" checkbox to the cart page and drawer cart. Customers must check this box before they can proceed to checkout. The app logs consent (date, time, customer info) for legal compliance.

## 1.2 Business Requirements
- Merchant installs the app → configures checkbox text, link, position, and styling
- A checkbox appears on the storefront cart page (and optionally drawer cart)
- If "required" is enabled, the checkout button is blocked until the checkbox is checked
- Express checkout buttons (PayPal, Apple Pay, Shop Pay) are also blocked
- When a customer checks the box, a consent record is logged with timestamp
- Merchant can view, search, and export consent logs from the admin dashboard
- The checkbox message is fully customizable with a rich text editor
- Supports multiple checkbox positions: above checkout, below checkout, or custom via App Block

## 1.3 User Personas
**Merchant (Admin User):**
- Configures checkbox settings via Shopify Admin embedded app
- Views consent logs, exports them as CSV
- Customizes the look and feel of the checkbox

**Customer (Storefront User):**
- Sees the checkbox on the cart page
- Must check it to proceed to checkout
- Clicks the link to read the terms/policy page

## 1.4 Supported Checkout Flows
- Standard checkout button (form submit to /checkout)
- Express checkout: PayPal, Apple Pay, Google Pay, Shop Pay
- AJAX/dynamic carts (drawer carts, slide-out carts)
- Direct URL navigation to /checkout

---

# SECTION 2: TECHNICAL ARCHITECTURE

## 2.1 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     SHOPIFY PLATFORM                         │
│                                                              │
│  ┌─────────────────────┐      ┌────────────────────────────┐│
│  │   Shopify Admin      │      │    Storefront (Theme)      ││
│  │                      │      │                            ││
│  │  ┌────────────────┐  │      │  ┌──────────────────────┐  ││
│  │  │  Embedded App  │  │      │  │  Theme App Extension │  ││
│  │  │  (Remix +      │  │      │  │                      │  ││
│  │  │   Polaris UI)  │  │      │  │  checkbox.liquid     │  ││
│  │  │                │  │      │  │  checkbox.css         │  ││
│  │  │  - Settings    │  │      │  │  checkbox.js          │  ││
│  │  │  - Consent Logs│  │      │  │                      │  ││
│  │  │  - Analytics   │  │      │  │  Renders:            │  ││
│  │  └───────┬────────┘  │      │  │  ☑ I accept the T&C │  ││
│  │          │            │      │  │  [Check out]         │  ││
│  └──────────┼────────────┘      │  └──────────┬───────────┘  ││
│             │                    │             │              ││
└─────────────┼────────────────────┼─────────────┼──────────────┘
              │                    │             │
              ▼                    │             ▼
┌─────────────────────────────┐   │   ┌─────────────────────────┐
│     APP SERVER (Remix)      │   │   │    App Proxy Endpoint   │
│                             │   │   │                         │
│  Routes:                    │   │   │  POST /apps/tc-consent  │
│  /app            → Settings │   │   │  → Logs consent to DB   │
│  /app/consent    → Logs     │   │   │                         │
│  /app/analytics  → Stats    │   │   └────────────┬────────────┘
│  /api/consent    → REST API │   │                │
│  /webhooks       → GDPR     │   │                │
│                             │   │                │
│  ┌───────────────────────┐  │   │                │
│  │   PostgreSQL (Prisma) │◄─┼───┼────────────────┘
│  │                       │  │   │
│  │  - Sessions           │  │   │
│  │  - AppSettings        │  │   │
│  │  - ConsentLogs        │  │   │
│  │  - CheckboxConfigs    │  │   │
│  └───────────────────────┘  │   │
└─────────────────────────────┘   │
                                  │
              ┌───────────────────┘
              ▼
┌─────────────────────────────┐
│   Shopify Cart Attributes   │
│                             │
│  terms_accepted: "yes"      │
│  terms_accepted_at: "..."   │
│  → Visible in Order Details │
└─────────────────────────────┘
```

## 2.2 Tech Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| App Framework | Shopify Remix Template | Latest | OAuth, session, embedded app |
| Admin UI | Shopify Polaris | v12+ | Admin dashboard components |
| App Bridge | @shopify/app-bridge-react | v4+ | Embed app in Shopify Admin |
| Storefront | Theme App Extension | API 2024-10 | Inject checkbox into theme |
| Database | PostgreSQL | 15+ | Store settings + consent logs |
| ORM | Prisma | v5+ | Database access layer |
| Hosting | Fly.io / Railway | — | App server deployment |
| Package Manager | npm | v9+ | Dependency management |
| Runtime | Node.js | v18+ | Server runtime |

## 2.3 File Structure (Complete)

```
terms-checkbox-app/
│
├── shopify.app.toml                     # Shopify app configuration
├── package.json
├── remix.config.js
├── vite.config.js
├── .env                                  # Environment variables
│
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── migrations/                       # Auto-generated migrations
│
├── app/
│   ├── entry.server.jsx                  # Remix server entry
│   ├── root.jsx                          # Root layout
│   ├── shopify.server.js                 # Shopify auth config
│   ├── db.server.js                      # Prisma client singleton
│   │
│   ├── models/
│   │   ├── Settings.server.js            # Settings CRUD operations
│   │   ├── ConsentLog.server.js          # Consent log operations
│   │   └── Analytics.server.js           # Analytics queries
│   │
│   ├── routes/
│   │   ├── app.jsx                       # Admin layout (nav, frame)
│   │   ├── app._index.jsx               # Dashboard / overview
│   │   ├── app.settings.jsx             # Checkbox settings page
│   │   ├── app.settings.appearance.jsx  # Appearance/styling settings
│   │   ├── app.consent-logs.jsx         # Consent logs viewer
│   │   ├── app.analytics.jsx            # Analytics dashboard
│   │   ├── app.help.jsx                 # Help / documentation
│   │   ├── api.consent.jsx              # App Proxy: log consent
│   │   ├── api.consent-export.jsx       # CSV export endpoint
│   │   ├── api.settings.jsx             # Settings API for storefront
│   │   └── webhooks.jsx                 # GDPR + app lifecycle webhooks
│   │
│   └── components/
│       ├── CheckboxPreview.jsx           # Live preview component
│       ├── ConsentLogTable.jsx           # Reusable log table
│       ├── AnalyticsCard.jsx             # Stats card component
│       └── OnboardingBanner.jsx          # First-time setup guide
│
├── extensions/
│   └── tc-checkbox/                      # Theme App Extension
│       ├── shopify.extension.toml        # Extension config
│       ├── blocks/
│       │   ├── checkbox.liquid           # Main checkbox block
│       │   └── checkbox-inline.liquid    # Inline variant for drawer carts
│       ├── snippets/
│       │   └── tc-checkbox-core.liquid   # Shared checkbox markup
│       ├── assets/
│       │   ├── tc-checkbox.css           # Checkbox styles
│       │   └── tc-checkbox.js            # Checkout blocking + consent logging
│       └── locales/
│           ├── en.default.json           # English strings
│           ├── es.json                   # Spanish
│           ├── fr.json                   # French
│           └── de.json                   # German
│
├── public/
│   └── screenshots/                      # App listing screenshots
│
└── docs/
    ├── SETUP.md                          # Developer setup instructions
    ├── DEPLOYMENT.md                     # Deployment guide
    └── API.md                            # API documentation
```

---

# SECTION 3: REQUIREMENTS SPECIFICATION

## 3.1 Functional Requirements

### FR-1: Checkbox Display
| ID | Requirement | Priority |
|----|------------|----------|
| FR-1.1 | Display a checkbox with configurable text on the cart page | P0 |
| FR-1.2 | Support "above checkout button" position | P0 |
| FR-1.3 | Support "below checkout button" position | P0 |
| FR-1.4 | Support custom position via Theme Editor App Block | P0 |
| FR-1.5 | Display clickable link to terms/policy page | P0 |
| FR-1.6 | Link opens in new tab | P0 |
| FR-1.7 | Support drawer/slide-out carts (dynamic DOM) | P1 |
| FR-1.8 | Responsive design (desktop + mobile) | P0 |

### FR-2: Checkout Blocking
| ID | Requirement | Priority |
|----|------------|----------|
| FR-2.1 | Block standard checkout button when unchecked | P0 |
| FR-2.2 | Block express checkout (PayPal, Apple Pay, Shop Pay) | P0 |
| FR-2.3 | Show error message when user tries to checkout without agreeing | P0 |
| FR-2.4 | Error message has shake animation | P2 |
| FR-2.5 | Scroll to checkbox when error is triggered | P1 |
| FR-2.6 | Intercept form submission to /checkout | P0 |
| FR-2.7 | Intercept direct link navigation to /checkout | P0 |
| FR-2.8 | Optional: allow checkout without checkbox (non-required mode) | P1 |

### FR-3: Consent Logging
| ID | Requirement | Priority |
|----|------------|----------|
| FR-3.1 | Log timestamp when checkbox is checked | P0 |
| FR-3.2 | Log customer email (if logged in) | P0 |
| FR-3.3 | Log cart token | P1 |
| FR-3.4 | Log IP address | P1 |
| FR-3.5 | Log user agent | P2 |
| FR-3.6 | Log page URL | P1 |
| FR-3.7 | Store which version of the message was shown | P2 |
| FR-3.8 | Write consent to Shopify cart attributes | P0 |

### FR-4: Admin Settings
| ID | Requirement | Priority |
|----|------------|----------|
| FR-4.1 | Enable/disable checkbox globally | P0 |
| FR-4.2 | Set checkbox as required or optional | P0 |
| FR-4.3 | Configure message text (before link) | P0 |
| FR-4.4 | Configure link text | P0 |
| FR-4.5 | Configure link URL (with URL picker) | P0 |
| FR-4.6 | Configure error message text | P0 |
| FR-4.7 | Set font size (range slider) | P1 |
| FR-4.8 | Set checkbox accent color | P1 |
| FR-4.9 | Set error message color | P2 |
| FR-4.10 | Select position (above/below/custom) | P0 |
| FR-4.11 | Toggle express checkout blocking | P0 |
| FR-4.12 | Toggle consent logging | P0 |
| FR-4.13 | Live preview of checkbox appearance | P1 |

### FR-5: Consent Log Viewer
| ID | Requirement | Priority |
|----|------------|----------|
| FR-5.1 | Display logs in paginated table | P0 |
| FR-5.2 | Show date/time, customer email, cart token, status | P0 |
| FR-5.3 | Export logs as CSV | P0 |
| FR-5.4 | Search/filter logs by date range | P1 |
| FR-5.5 | Search/filter logs by customer email | P1 |
| FR-5.6 | Show total consent count | P1 |

### FR-6: GDPR Compliance
| ID | Requirement | Priority |
|----|------------|----------|
| FR-6.1 | Handle CUSTOMERS_DATA_REQUEST webhook | P0 |
| FR-6.2 | Handle CUSTOMERS_REDACT webhook | P0 |
| FR-6.3 | Handle SHOP_REDACT webhook | P0 |
| FR-6.4 | Handle APP_UNINSTALLED webhook | P0 |

## 3.2 Non-Functional Requirements

| ID | Requirement | Details |
|----|------------|---------|
| NFR-1 | Performance | Checkbox JS must load in < 50ms, no layout shift |
| NFR-2 | Compatibility | Works with Shopify OS 2.0 themes (Dawn, etc.) |
| NFR-3 | Accessibility | WCAG 2.1 AA: keyboard nav, screen reader labels, focus states |
| NFR-4 | Security | App Proxy validates HMAC signatures, sanitize all inputs |
| NFR-5 | Scalability | Handle 10,000+ consent logs per store without degradation |
| NFR-6 | Reliability | Consent logging failure must not block checkout |
| NFR-7 | i18n | Support English, Spanish, French, German out of the box |

---

# SECTION 4: UI DESIGN SPECIFICATIONS

## 4.1 Storefront Checkbox — Design Specs

### Default State (Unchecked)
```
┌──────────────────────────────────────────────┐
│                                              │
│  [ ] I accept the terms and conditions       │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │           Check out                  │    │  ← Disabled/dimmed
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │     PayPal / Apple Pay / Shop Pay    │    │  ← Overlay blocking
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

### Error State (Tried to checkout without checking)
```
┌──────────────────────────────────────────────┐
│                                              │
│  [ ] I accept the terms and conditions       │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ ⚠ You must agree to the terms and   │    │
│  │   conditions before checking out.    │    │  ← Red error box
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

### Checked State
```
┌──────────────────────────────────────────────┐
│                                              │
│  [✓] I accept the terms and conditions       │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │           Check out                  │    │  ← Enabled, full opacity
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │     PayPal / Apple Pay / Shop Pay    │    │  ← Overlay removed
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

### CSS Design Tokens
```css
/* Checkbox Design Tokens — defaults, overridable by merchant */
--tc-checkbox-size: 20px;
--tc-checkbox-border-color: #cccccc;
--tc-checkbox-border-radius: 4px;
--tc-checkbox-checked-bg: #000000;       /* Merchant configurable */
--tc-checkbox-checked-border: #000000;
--tc-checkbox-checkmark-color: #ffffff;
--tc-font-size: 14px;                    /* Merchant configurable */
--tc-text-color: #333333;
--tc-link-color: #2c6ecb;
--tc-link-hover-color: #1a4d8f;
--tc-error-bg: #fff5f5;
--tc-error-border: #fecaca;
--tc-error-text: #dc3545;               /* Merchant configurable */
--tc-error-font-size: 13px;
--tc-transition-speed: 0.2s;
```

## 4.2 Admin UI — Page Layouts

### Dashboard Page (app._index.jsx)
```
┌─────────────────────────────────────────────────────────┐
│  Terms & Conditions Checkbox                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Status       │  │  Consents    │  │  Consent     │ │
│  │  ● Enabled    │  │  Today       │  │  Rate        │ │
│  │              │  │  127         │  │  94.2%       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Quick Setup Guide                              │   │
│  │                                                 │   │
│  │  1. ✅ App installed                            │   │
│  │  2. ✅ Settings configured                      │   │
│  │  3. ⬜ Add checkbox to theme                    │   │
│  │     → [Open Theme Editor]                       │   │
│  │  4. ⬜ Test on storefront                       │   │
│  │     → [Preview Store]                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Recent Consent Logs                            │   │
│  │                                                 │   │
│  │  Time          Customer        Status           │   │
│  │  2 min ago     john@...        ✓ Agreed         │   │
│  │  15 min ago    Guest           ✓ Agreed         │   │
│  │  1 hr ago      alice@...       ✓ Agreed         │   │
│  │                                                 │   │
│  │  [View All Logs →]                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Settings Page (app.settings.jsx)
```
┌─────────────────────────────────────────────────────────┐
│  ← Back    Settings                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────┐│
│  │  General                 │  │  Preview             ││
│  │                          │  │                      ││
│  │  [✓] Enable checkbox     │  │  ┌────────────────┐  ││
│  │  [✓] Required to checkout│  │  │                │  ││
│  │  [✓] Block express       │  │  │ [ ] I accept   │  ││
│  │      checkout             │  │  │ the terms and  │  ││
│  │                          │  │  │ conditions     │  ││
│  │  Message text:           │  │  │                │  ││
│  │  ┌────────────────────┐  │  │  │ [Check out]    │  ││
│  │  │ I accept the       │  │  │  │                │  ││
│  │  └────────────────────┘  │  │  └────────────────┘  ││
│  │                          │  │                      ││
│  │  Link text:              │  │                      ││
│  │  ┌────────────────────┐  │  │                      ││
│  │  │ terms & conditions │  │  │                      ││
│  │  └────────────────────┘  │  │                      ││
│  │                          │  │                      ││
│  │  Link URL:               │  │                      ││
│  │  ┌────────────────────┐  │  │                      ││
│  │  │ /policies/terms    │  │  │                      ││
│  │  └────────────────────┘  │  │                      ││
│  │                          │  │                      ││
│  │  Error message:          │  │                      ││
│  │  ┌────────────────────┐  │  │                      ││
│  │  │ You must agree...  │  │  │                      ││
│  │  └────────────────────┘  │  │                      ││
│  │                          │  │                      ││
│  │  Position:               │  │                      ││
│  │  [Above checkout btn ▼]  │  │                      ││
│  │                          │  │                      ││
│  │  Font size: 14px         │  │                      ││
│  │  ──────●─────────        │  │                      ││
│  │                          │  │                      ││
│  │  [✓] Log consent         │  │                      ││
│  │                          │  │                      ││
│  └──────────────────────────┘  └──────────────────────┘│
│                                                         │
│  [Save Settings]                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Consent Logs Page (app.consent-logs.jsx)
```
┌─────────────────────────────────────────────────────────┐
│  ← Back    Consent Logs                [Export CSV]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filters:                                               │
│  [Date range ▼]  [Search by email...    ]  [Apply]     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Date & Time       │ Customer    │ Cart    │ ✓  │   │
│  ├────────────────────┼────────────┼─────────┼─────│   │
│  │  Feb 21, 3:45 PM   │ john@x.com │ abc123  │ ✓  │   │
│  │  Feb 21, 3:32 PM   │ Guest      │ def456  │ ✓  │   │
│  │  Feb 21, 3:18 PM   │ alice@y.co │ ghi789  │ ✓  │   │
│  │  Feb 21, 2:55 PM   │ bob@z.io   │ jkl012  │ ✓  │   │
│  │  ...                                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Showing 1-25 of 1,247    [← Previous]  [Next →]      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# SECTION 5: STEP-BY-STEP BUILD PROCESS

## Phase 1: Project Scaffolding (Steps 1–5)

### Step 1: Create Shopify App
```bash
shopify app init
# Name: terms-checkbox
# Template: Remix
# Language: JavaScript
cd terms-checkbox
npm install
```

### Step 2: Install Additional Dependencies
```bash
npm install @prisma/client
npm install -D prisma
```

### Step 3: Configure Environment
Create `.env`:
```env
DATABASE_URL="file:./dev.db"
SHOPIFY_API_KEY="<from partners dashboard>"
SHOPIFY_API_SECRET="<from partners dashboard>"
SCOPES="read_orders,read_customers"
HOST="<ngrok or cloudflare tunnel URL>"
```

### Step 4: Define Database Schema
Create `prisma/schema.prisma` with these models:
- **Session** — Shopify session storage (required by template)
- **AppSettings** — Per-store configuration (all fields from FR-4)
- **ConsentLog** — Consent records (all fields from FR-3)

Key fields for AppSettings:
```
shop (String, unique)
enabled (Boolean, default true)
checkboxRequired (Boolean, default true)
messageText (String, default "I accept the")
linkText (String, default "terms and conditions")
linkUrl (String, default "/policies/terms-of-service")
errorMessage (String)
position (String: "above_checkout" | "below_checkout" | "custom")
fontSize (Int, default 14)
checkboxColor (String, default "#000000")
errorColor (String, default "#dc3545")
logConsent (Boolean, default true)
blockExpressCheckout (Boolean, default true)
```

Key fields for ConsentLog:
```
shop (String)
customerId (String, nullable)
customerEmail (String, nullable)
cartToken (String, nullable)
ipAddress (String, nullable)
userAgent (String, nullable)
consentGiven (Boolean, default true)
pageUrl (String, nullable)
checkboxVersion (String, nullable)
timestamp (DateTime, default now())
```

### Step 5: Run Initial Migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Phase 2: Backend Models & API (Steps 6–10)

### Step 6: Create Prisma Client Singleton
File: `app/db.server.js`
- Standard Prisma singleton pattern for Remix
- Prevents multiple instances in development

### Step 7: Create Settings Model
File: `app/models/Settings.server.js`
Functions:
- `getSettings(shop)` — Get or create default settings for a shop
- `updateSettings(shop, data)` — Upsert settings
- `deleteSettings(shop)` — Delete settings (for uninstall)

### Step 8: Create ConsentLog Model
File: `app/models/ConsentLog.server.js`
Functions:
- `createLog(data)` — Create a new consent record
- `getLogs(shop, { page, limit, dateFrom, dateTo, email })` — Paginated, filtered query
- `getLogCount(shop, filters)` — Total count for pagination
- `exportLogs(shop, filters)` — Get all logs for CSV export
- `deleteCustomerLogs(shop, email)` — GDPR customer redact
- `deleteShopLogs(shop)` — GDPR shop redact

### Step 9: Create Analytics Model
File: `app/models/Analytics.server.js`
Functions:
- `getTodayCount(shop)` — Consent count for today
- `getWeeklyTrend(shop)` — Daily counts for last 7 days
- `getConsentRate(shop)` — Percentage (consents / page views)

### Step 10: Create Consent API Endpoint
File: `app/routes/api.consent.jsx`

**POST handler** (called from storefront via App Proxy):
- Parse JSON body
- Validate required fields (shop)
- Create consent log record
- Return `{ success: true, id }`
- On error: return 500 but NEVER block the customer

**GET handler** (called from admin):
- Authenticate admin session
- Return paginated logs with total count

**IMPORTANT**: The POST endpoint will be accessed via Shopify App Proxy, which adds HMAC authentication automatically. Validate the `X-Shopify-Hmac-Sha256` header.

---

## Phase 3: Admin UI Pages (Steps 11–17)

### Step 11: Admin Layout
File: `app/routes/app.jsx`
- Use Polaris `Frame` with `Navigation`
- Navigation items:
  - Dashboard (app._index)
  - Settings (app.settings)
  - Consent Logs (app.consent-logs)
  - Help (app.help)

### Step 12: Dashboard Page
File: `app/routes/app._index.jsx`

**Loader**: Fetch settings + today's consent count + recent 5 logs

**UI Components**:
- Status card (enabled/disabled badge)
- Stats cards (today's consents, consent rate)
- Onboarding checklist (if new install):
  1. ✅ App installed
  2. Configure settings → link to settings page
  3. Add to theme → deep link to Theme Editor
  4. Test checkout → link to preview store
- Recent consent logs mini-table (last 5)
- "View All Logs" link

### Step 13: Settings Page
File: `app/routes/app.settings.jsx`

**Loader**: Fetch current settings

**Action**: Save settings via form submission

**UI Layout** (two-column):
Left column — Form:
- `Checkbox`: Enable/disable
- `Checkbox`: Required to checkout
- `Checkbox`: Block express checkout
- `TextField`: Message text
- `TextField`: Link text
- `TextField`: Link URL (with URL validation)
- `TextField`: Error message (multiline)
- `Select`: Position dropdown
- `RangeSlider`: Font size (10–24px)
- `ColorPicker` or `TextField`: Checkbox color
- `ColorPicker` or `TextField`: Error color
- `Checkbox`: Log consent timestamps

Right column — Live Preview:
- `CheckboxPreview` component that updates in real-time as settings change
- Shows the checkbox exactly as it will appear on the store

**Save button** at bottom with loading state

### Step 14: Appearance Settings Page (Optional, can merge with Step 13)
File: `app/routes/app.settings.appearance.jsx`
- Advanced styling options
- Custom CSS override textarea
- Theme compatibility notes

### Step 15: Consent Logs Page
File: `app/routes/app.consent-logs.jsx`

**Loader**: Fetch paginated logs with filters from URL search params

**UI Components**:
- Filter bar:
  - Date range picker (from/to)
  - Email search text field
  - Apply button
- `DataTable` with columns: Date & Time, Customer, Cart Token, Status, Page URL
- `Pagination` component
- "Export CSV" button (triggers download)
- `EmptyState` when no logs exist

### Step 16: CSV Export Endpoint
File: `app/routes/api.consent-export.jsx`
- Authenticate admin session
- Query all logs (with optional filters)
- Generate CSV string with headers
- Return as `text/csv` Response with Content-Disposition header

### Step 17: Help Page
File: `app/routes/app.help.jsx`
- Setup instructions with screenshots
- FAQ section
- Link to theme editor
- Contact support information
- Troubleshooting: "Checkbox not showing?" common fixes

---

## Phase 4: Theme App Extension (Steps 18–25)

### Step 18: Generate Extension
```bash
shopify app generate extension
# Type: Theme app extension
# Name: tc-checkbox
```

### Step 19: Extension Configuration
File: `extensions/tc-checkbox/shopify.extension.toml`
```toml
api_version = "2024-10"

[[extensions]]
type = "theme"
name = "T&C Checkbox"
handle = "tc-checkbox"
```

### Step 20: Main Checkbox Block
File: `extensions/tc-checkbox/blocks/checkbox.liquid`

**Schema settings** (all configurable in Theme Editor):
- `required` (checkbox, default: true)
- `message_text` (text, default: "I accept the")
- `link_text` (text, default: "terms and conditions")
- `link_url` (url type)
- `error_message` (text)
- `font_size` (range: 10–24, default: 14)
- `log_consent` (checkbox, default: true)
- `block_express_checkout` (checkbox, default: true)
- `checkbox_color` (color, default: #000000)
- `error_color` (color, default: #dc3545)

**Template**:
- `enabled_on: { templates: ["cart"] }` — Only available on cart template
- Renders the checkbox HTML
- Passes all settings as `data-*` attributes to the wrapper div
- Includes CSS and JS via asset URLs
- Uses CSS custom properties from the color settings

**HTML structure**:
```html
<div class="tc-checkbox-wrapper" id="tc-checkbox-wrapper"
  data-required="true"
  data-error-message="..."
  data-log-consent="true"
  data-shop="{{ shop.permanent_domain }}"
  data-proxy-url="{{ shop.url }}/apps/tc-consent"
  data-block-express="true"
  style="--tc-checkbox-color: {{ block.settings.checkbox_color }};
         --tc-error-color: {{ block.settings.error_color }};
         --tc-font-size: {{ block.settings.font_size }}px;">

  <label class="tc-checkbox-label" for="tc-agree-checkbox">
    <input type="checkbox" id="tc-agree-checkbox" class="tc-checkbox-input" />
    <span class="tc-checkbox-custom"></span>
    <span class="tc-checkbox-text">
      {{ block.settings.message_text }}
      <a href="{{ block.settings.link_url }}" target="_blank">
        {{ block.settings.link_text }}
      </a>
    </span>
  </label>

  <div class="tc-error-message" id="tc-error-message" style="display:none;">
    {{ block.settings.error_message }}
  </div>
</div>
```

### Step 21: CSS Stylesheet
File: `extensions/tc-checkbox/assets/tc-checkbox.css`

Key styles:
- Custom checkbox (hide native, create styled replacement)
- Checked state with checkmark (CSS-only, no images)
- Focus state with visible outline (accessibility)
- Error message box with red background/border
- Shake animation on error (`@keyframes tc-shake`)
- `.tc-checkout-blocked` class: `opacity: 0.5; pointer-events: none;`
- `.tc-express-overlay::after` pseudo-element: semi-transparent overlay
- CSS custom properties for merchant-configurable colors
- Mobile responsive adjustments

### Step 22: JavaScript — Core Logic
File: `extensions/tc-checkbox/assets/tc-checkbox.js`

**IIFE structure** (no global pollution):

```
(function() {
  "use strict";

  // 1. INITIALIZATION
  //    - Get DOM references
  //    - Read data attributes from wrapper
  //    - Exit early if wrapper not found

  // 2. CHECKOUT BUTTON DETECTION
  //    - getCheckoutButtons(): Query multiple selectors for standard checkout
  //    - getExpressCheckoutButtons(): Query selectors for dynamic checkout

  // 3. STATE MANAGEMENT
  //    - updateCheckoutState(): Enable/disable buttons based on checkbox state
  //    - Called on: checkbox change, DOM mutation, page load

  // 4. CHECKOUT INTERCEPTION
  //    - Intercept form[action="/checkout"] submissions
  //    - Intercept a[href="/checkout"] clicks
  //    - Intercept window.location changes to /checkout (advanced)
  //    - Show error + scroll to checkbox on blocked attempt

  // 5. ERROR DISPLAY
  //    - showError(): Show error message with shake animation
  //    - hideError(): Hide error message
  //    - scrollToCheckbox(): Smooth scroll to checkbox wrapper

  // 6. CONSENT LOGGING
  //    - logConsent(): POST to App Proxy endpoint
  //    - Fire-and-forget (never block user flow)
  //    - Include: shop, cartToken, customerEmail, pageUrl, timestamp

  // 7. CART ATTRIBUTE UPDATE
  //    - setCartAttribute(): POST to /cart/update.js
  //    - Sets terms_accepted="yes" and terms_accepted_at="<ISO timestamp>"
  //    - This makes consent visible in Shopify order details

  // 8. DRAWER CART SUPPORT
  //    - MutationObserver on document.body
  //    - Re-run updateCheckoutState() and interceptCheckout() on DOM changes
  //    - Debounced to avoid performance issues

  // 9. EVENT LISTENERS
  //    - checkbox.change → updateCheckoutState + logConsent + setCartAttribute
  //    - Initialize on DOMContentLoaded
})();
```

### Step 23: Checkout Button Selectors
The JS must find checkout buttons across many different themes. Use these selectors:

**Standard checkout buttons:**
```javascript
const CHECKOUT_SELECTORS = [
  '[name="checkout"]',
  'button[name="checkout"]',
  'input[name="checkout"]',
  'a[href="/checkout"]',
  'a[href*="/checkout"]',
  '.cart__checkout-button',
  '.cart__checkout',
  '.cart__submit',
  '#cart-checkout-button',
  '#checkout',
  '[data-checkout-button]',
  'form[action="/checkout"] button[type="submit"]',
  'form[action="/checkout"] input[type="submit"]',
  'form[action="/cart"] button[name="checkout"]',
];
```

**Express checkout buttons:**
```javascript
const EXPRESS_SELECTORS = [
  '.shopify-payment-button',
  '.dynamic-checkout__buttons',
  '[data-shopify="dynamic-checkout-cart"]',
  '.additional-checkout-buttons',
  '#dynamic-checkout-cart',
  '.cart__dynamic-checkout-buttons',
  '.cart__ctas .additional-checkout-buttons',
];
```

### Step 24: Locales (i18n)
File: `extensions/tc-checkbox/locales/en.default.json`
```json
{
  "checkbox": {
    "name": "T&C Checkbox",
    "settings": {
      "required": { "label": "Required to checkout" },
      "message_text": { "label": "Message text" },
      "link_text": { "label": "Link text" },
      "link_url": { "label": "Link URL" },
      "error_message": { "label": "Error message" },
      "font_size": { "label": "Font size" },
      "log_consent": { "label": "Log consent timestamps" },
      "block_express_checkout": { "label": "Block express checkout" },
      "checkbox_color": { "label": "Checkbox color" },
      "error_color": { "label": "Error message color" }
    }
  }
}
```

Create matching files for `es.json`, `fr.json`, `de.json`.

### Step 25: Inline Checkbox Block (for Drawer Carts)
File: `extensions/tc-checkbox/blocks/checkbox-inline.liquid`
- Smaller, more compact version
- Same functionality but designed for tight spaces
- `enabled_on: { templates: ["*"] }` — Available on all templates
- Uses same JS and CSS files

---

## Phase 5: App Proxy & Webhooks (Steps 26–29)

### Step 26: Configure App Proxy
In `shopify.app.toml`:
```toml
[app_proxy]
url = "https://<your-app-url>/api/consent"
subpath = "tc-consent"
prefix = "apps"
```

This creates: `https://store.myshopify.com/apps/tc-consent`

### Step 27: App Proxy HMAC Validation
In the consent API endpoint, validate that requests actually come from Shopify:
```javascript
// Shopify sends these query params on App Proxy requests:
// shop, path_prefix, timestamp, signature
// Validate signature using SHOPIFY_API_SECRET
```

### Step 28: GDPR Webhooks
File: `app/routes/webhooks.jsx`

Handle these mandatory webhooks:
1. `CUSTOMERS_DATA_REQUEST` → Return all consent logs for the customer
2. `CUSTOMERS_REDACT` → Delete all consent logs for the customer
3. `SHOP_REDACT` → Delete ALL data for the shop (settings + logs)
4. `APP_UNINSTALLED` → Clean up sessions, optionally keep data for re-install

### Step 29: Register Webhooks
In `shopify.app.toml`:
```toml
[webhooks]
api_version = "2024-10"

  [[webhooks.subscriptions]]
  topics = ["app/uninstalled"]
  uri = "/webhooks"

  [[webhooks.subscriptions]]
  topics = ["customers/data_request"]
  uri = "/webhooks"

  [[webhooks.subscriptions]]
  topics = ["customers/redact"]
  uri = "/webhooks"

  [[webhooks.subscriptions]]
  topics = ["shop/redact"]
  uri = "/webhooks"
```

---

## Phase 6: Testing (Steps 30–34)

### Step 30: Local Development Setup
```bash
shopify app dev
# Opens tunnel, installs on dev store, starts server
```

### Step 31: Test Theme Integration
1. Go to dev store admin → Online Store → Themes → Customize
2. Navigate to Cart template
3. Click "Add block" → Find "T&C Checkbox"
4. Configure settings in the Theme Editor sidebar
5. Save and preview

### Step 32: Functional Test Cases

**Checkbox Display:**
- [ ] Checkbox renders on cart page
- [ ] Message text matches settings
- [ ] Link text is clickable and opens in new tab
- [ ] Link URL is correct
- [ ] Font size matches setting
- [ ] Checkbox color matches setting

**Checkout Blocking:**
- [ ] Checkout button is disabled when checkbox is unchecked
- [ ] Clicking disabled checkout shows error message
- [ ] Error message has shake animation
- [ ] Page scrolls to checkbox on error
- [ ] Checking the box enables the checkout button
- [ ] Checking the box hides the error message
- [ ] Express checkout buttons are blocked when unchecked
- [ ] Express checkout buttons are unblocked when checked
- [ ] Form submission to /checkout is intercepted
- [ ] Direct link to /checkout is intercepted

**Consent Logging:**
- [ ] Checking the box sends POST to App Proxy
- [ ] Consent log appears in admin dashboard
- [ ] Timestamp is correct
- [ ] Customer email is captured (when logged in)
- [ ] Cart token is captured
- [ ] Cart attributes are updated (terms_accepted=yes)
- [ ] Failed consent logging does NOT block checkout

**Admin UI:**
- [ ] Settings page loads with current values
- [ ] All settings save correctly
- [ ] Preview updates in real-time
- [ ] Consent logs table displays correctly
- [ ] Pagination works
- [ ] CSV export downloads correctly
- [ ] Date filter works
- [ ] Email search works

**Edge Cases:**
- [ ] Empty cart → no checkbox shown (or graceful handling)
- [ ] Multiple tabs open → each functions independently
- [ ] Rapid checkbox toggle → no duplicate logs
- [ ] Very long message text → wraps correctly
- [ ] Non-English characters in message → display correctly
- [ ] Drawer cart opens → checkbox appears (MutationObserver)
- [ ] Page refresh → checkbox resets to unchecked (intentional)

### Step 33: Accessibility Testing
- [ ] Checkbox is keyboard focusable (Tab key)
- [ ] Checkbox toggles with Space key
- [ ] Focus state is visually visible
- [ ] Screen reader announces: "I accept the terms and conditions, checkbox, unchecked"
- [ ] Error message is announced by screen reader (aria-live)
- [ ] Link is keyboard accessible
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

### Step 34: Performance Testing
- [ ] JS file size < 5KB (minified)
- [ ] CSS file size < 3KB (minified)
- [ ] No Cumulative Layout Shift (CLS)
- [ ] Consent POST completes in < 500ms
- [ ] MutationObserver doesn't cause jank

---

## Phase 7: Deployment (Steps 35–38)

### Step 35: Set Up Production Database
```bash
# Create PostgreSQL database (e.g., on Railway, Supabase, Neon)
# Get the DATABASE_URL connection string
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 36: Deploy App Server
**Option A: Fly.io**
```bash
fly launch
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set SHOPIFY_API_KEY="..."
fly secrets set SHOPIFY_API_SECRET="..."
fly deploy
fly ssh console -C "npx prisma migrate deploy"
```

**Option B: Railway**
```bash
# Connect GitHub repo
# Set environment variables in Railway dashboard
# Deploy automatically on push
```

### Step 37: Deploy Theme Extension
```bash
shopify app deploy
# This publishes the theme extension to Shopify
```

### Step 38: Update App URLs
In Shopify Partners Dashboard:
- Set App URL to production URL
- Set Redirect URLs
- Update App Proxy URL to production URL
- Verify webhooks are registered

---

## Phase 8: App Store Submission (Steps 39–42)

### Step 39: Prepare Listing Assets
- **App icon**: 1200×1200px PNG, white/clean background
- **Screenshots**: 4–6 screenshots showing:
  1. Checkbox on cart page (default position)
  2. Checkbox with custom position (App Block)
  3. Admin settings page
  4. Consent logs page
  5. Rich text editor for message
  6. Express checkout blocking
- **Demo video** (optional but recommended): 30–60s showing setup flow

### Step 40: Write App Listing
- **Name**: "Terms & Conditions Checkbox"
- **Tagline**: "Add T&C consent checkbox to cart. Log agreement timestamps."
- **Description**: Cover all features from the original requirements
- **Categories**: Cart customization, Legal
- **Pricing**: Free plan + paid plan with advanced features

### Step 41: Submission Checklist
- [ ] App functions on a fresh Dawn theme
- [ ] No JavaScript console errors
- [ ] All GDPR webhooks respond correctly
- [ ] App gracefully handles uninstall/reinstall
- [ ] Privacy policy page exists and is linked
- [ ] No hardcoded store URLs
- [ ] Handles rate limiting gracefully
- [ ] Loading states for all async operations
- [ ] Error states for all failure scenarios

### Step 42: Submit for Review
```bash
shopify app release
```

---

# SECTION 6: ADDITIONAL RESOURCES

## 6.1 Key Shopify Documentation Links
- Remix App Template: https://shopify.dev/docs/apps/getting-started/build-app-example
- Theme App Extensions: https://shopify.dev/docs/apps/online-store/theme-app-extensions
- App Proxy: https://shopify.dev/docs/apps/online-store/app-proxies
- Polaris Components: https://polaris.shopify.com/components
- Cart Ajax API: https://shopify.dev/docs/api/ajax/reference/cart
- GDPR Webhooks: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
- App Store Requirements: https://shopify.dev/docs/apps/launch/app-requirements

## 6.2 Critical Implementation Notes

### Note 1: Consent Logging Must Never Block Checkout
The consent POST request must be fire-and-forget. If the API is down or slow, the customer must still be able to checkout. Use:
```javascript
fetch(url, options).catch(() => {}); // Silently fail
```

### Note 2: Cart Attributes for Order-Level Consent
Writing to cart attributes via `/cart/update.js` ensures the consent status is visible in the Shopify order admin, even if the consent log API fails. This is the most reliable way to track consent.

### Note 3: MutationObserver Performance
Debounce the MutationObserver callback to avoid performance issues:
```javascript
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updateCheckoutState();
    interceptCheckout();
  }, 100);
});
```

### Note 4: Theme Compatibility
The checkout button selectors must cover a wide range of themes. Test with at least:
- Dawn (free, Shopify default)
- Debut (legacy)
- One or two popular paid themes (e.g., Prestige, Impulse)

### Note 5: Express Checkout Timing
Dynamic checkout buttons (PayPal, etc.) load asynchronously after the page. The MutationObserver handles this, but also add a fallback:
```javascript
// Retry finding express buttons every 500ms for 5 seconds after page load
let retries = 0;
const expressInterval = setInterval(() => {
  if (retries++ >= 10 || getExpressCheckoutButtons().length > 0) {
    clearInterval(expressInterval);
    updateCheckoutState();
  }
}, 500);
```

### Note 6: Security Considerations
- Validate App Proxy HMAC on all POST requests
- Sanitize all user input before storing in database
- Rate limit the consent API (e.g., max 10 requests per minute per IP)
- Never expose customer PII in client-side JavaScript
- Use parameterized queries (Prisma handles this)

## 6.3 Future Enhancement Ideas (Post-Launch)
1. Multiple checkbox support (separate T&C, refund policy, age verification)
2. Conditional display based on cart contents or total
3. Checkout UI Extension for Shopify Plus merchants
4. Analytics dashboard with charts (consent rate over time)
5. A/B testing different message variants
6. Slack/email notifications when consent rate drops
7. Integration with Shopify Flow for automation
8. Custom CSS editor for advanced merchants
