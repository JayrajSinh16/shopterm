# Shopify Terms & Conditions Checkbox App — Complete Build Guide

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Setup](#3-project-setup)
4. [App Backend](#4-app-backend)
5. [App Frontend (Admin UI)](#5-app-frontend-admin-ui)
6. [Theme App Extension (Storefront)](#6-theme-app-extension-storefront)
7. [Consent Logging](#7-consent-logging)
8. [Express Checkout Integration](#8-express-checkout-integration)
9. [Testing & Deployment](#9-testing--deployment)
10. [App Store Listing](#10-app-store-listing)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Shopify Store                      │
│                                                      │
│  ┌──────────────┐    ┌───────────────────────────┐  │
│  │  Theme App   │    │     Cart Page / Drawer     │  │
│  │  Extension   │───▶│  ☑ I agree to T&C          │  │
│  │  (Blocks)    │    │  [Check out] button         │  │
│  └──────┬───────┘    └───────────────────────────┘  │
│         │                                            │
└─────────┼────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              Your App Backend (Remix)                │
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Admin UI   │  │ Consent Log  │  │  Settings   │ │
│  │  (Polaris)  │  │   Database   │  │   Store     │ │
│  └────────────┘  └──────────────┘  └─────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │           App Proxy / API Endpoints             │ │
│  │  POST /api/consent — logs checkbox agreement    │ │
│  │  GET  /api/consent — retrieves consent records  │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**How it works:**
1. Merchant installs app → configures settings (message, link, required/optional)
2. Theme App Extension injects checkbox into cart page / drawer cart
3. Customer checks the box → JS blocks checkout until checked (if required)
4. On checkbox check, a POST request logs the consent (timestamp, customer, order)
5. Merchant can view consent logs in the admin UI

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| App Framework | Shopify Remix App Template |
| Admin UI | Shopify Polaris + App Bridge |
| Storefront | Theme App Extension (Liquid + Vanilla JS) |
| Database | Prisma + SQLite (dev) / PostgreSQL (prod) |
| Hosting | Fly.io, Railway, Render, or Vercel |
| Auth | Shopify OAuth (built into Remix template) |

---

## 3. Project Setup

### 3.1 Prerequisites
```bash
# Install Node.js 18+ and npm
node -v  # Should be >= 18

# Install Shopify CLI
npm install -g @shopify/cli @shopify/app

# Create a Shopify Partner account at partners.shopify.com
# Create a development store for testing
```

### 3.2 Scaffold the App
```bash
# Create new Shopify app using Remix template
shopify app init

# When prompted:
# - Name: terms-checkbox
# - Template: Remix
# - Language: JavaScript (or TypeScript)

cd terms-checkbox
```

### 3.3 Project Structure
```
terms-checkbox/
├── app/                          # Remix app (backend + admin UI)
│   ├── routes/
│   │   ├── app._index.jsx        # Main settings page
│   │   ├── app.consent-logs.jsx  # Consent logs viewer
│   │   ├── api.consent.jsx       # API endpoint for logging
│   │   └── webhooks.jsx          # Shopify webhooks
│   ├── models/
│   │   └── consent.server.js     # Database operations
│   └── db.server.js              # Prisma client
├── extensions/
│   └── tc-checkbox/              # Theme App Extension
│       ├── blocks/
│       │   └── checkbox.liquid   # The checkbox block
│       ├── assets/
│       │   └── checkbox.js       # Client-side JS
│       └── locales/
│           └── en.default.json   # Translations
├── prisma/
│   └── schema.prisma             # Database schema
├── shopify.app.toml              # App config
└── package.json
```

---

## 4. App Backend

### 4.1 Database Schema (prisma/schema.prisma)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"       // Use "postgresql" in production
  url      = env("DATABASE_URL")
}

model Session {
  id            String    @id
  shop          String
  state         String
  isOnline      Boolean   @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String
  userId        BigInt?
}

model AppSettings {
  id                  String   @id @default(cuid())
  shop                String   @unique
  enabled             Boolean  @default(true)
  checkboxRequired    Boolean  @default(true)
  message             String   @default("I accept the")
  linkText            String   @default("terms and conditions")
  linkUrl             String   @default("/policies/terms-of-service")
  position            String   @default("above_checkout") // above_checkout | below_checkout | custom
  fontSize            Int      @default(14)
  checkboxColor       String   @default("#000000")
  errorMessage        String   @default("You must agree to the terms and conditions before checking out.")
  logConsent          Boolean  @default(true)
  blockExpressCheckout Boolean @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model ConsentLog {
  id          String   @id @default(cuid())
  shop        String
  customerId  String?
  customerEmail String?
  cartToken   String?
  ipAddress   String?
  userAgent   String?
  consentGiven Boolean  @default(true)
  timestamp   DateTime @default(now())
  pageUrl     String?
  checkboxVersion String? // Track which message version was shown
}
```

### 4.2 Run Migration
```bash
npx prisma migrate dev --name init
```

### 4.3 Consent API Endpoint (app/routes/api.consent.jsx)
```javascript
import { json } from "@remix-run/node";
import db from "../db.server";

// This endpoint is called via App Proxy
export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      shop,
      customerId,
      customerEmail,
      cartToken,
      consentGiven,
      pageUrl,
      checkboxVersion,
    } = body;

    // Validate required fields
    if (!shop) {
      return json({ error: "Shop is required" }, { status: 400 });
    }

    const log = await db.consentLog.create({
      data: {
        shop,
        customerId: customerId || null,
        customerEmail: customerEmail || null,
        cartToken: cartToken || null,
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent") || null,
        consentGiven: consentGiven ?? true,
        pageUrl: pageUrl || null,
        checkboxVersion: checkboxVersion || null,
      },
    });

    return json({ success: true, id: log.id });
  } catch (error) {
    console.error("Consent logging error:", error);
    return json({ error: "Failed to log consent" }, { status: 500 });
  }
}

// GET: Retrieve consent logs (for admin)
export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter required" }, { status: 400 });
  }

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    db.consentLog.findMany({
      where: { shop },
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
    db.consentLog.count({ where: { shop } }),
  ]);

  return json({ logs, total, page, limit });
}
```

### 4.4 Settings API (app/routes/app._index.jsx)
```javascript
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Layout, Card, FormLayout, TextField, Select,
  Checkbox, Button, Banner, Text, BlockStack, InlineStack,
  ColorPicker, RangeSlider, Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await db.appSettings.findUnique({ where: { shop } });

  if (!settings) {
    settings = await db.appSettings.create({
      data: { shop },
    });
  }

  return json({ settings });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const settings = await db.appSettings.upsert({
    where: { shop },
    update: {
      enabled: formData.get("enabled") === "true",
      checkboxRequired: formData.get("checkboxRequired") === "true",
      message: formData.get("message"),
      linkText: formData.get("linkText"),
      linkUrl: formData.get("linkUrl"),
      position: formData.get("position"),
      fontSize: parseInt(formData.get("fontSize") || "14"),
      checkboxColor: formData.get("checkboxColor"),
      errorMessage: formData.get("errorMessage"),
      logConsent: formData.get("logConsent") === "true",
      blockExpressCheckout: formData.get("blockExpressCheckout") === "true",
    },
    create: {
      shop,
      message: formData.get("message"),
      linkText: formData.get("linkText"),
      linkUrl: formData.get("linkUrl"),
    },
  });

  return json({ settings, success: true });
}

export default function Settings() {
  const { settings } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [formState, setFormState] = useState(settings);

  const handleChange = useCallback((field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    submit(formData, { method: "post" });
  }, [formState, submit]);

  return (
    <Page title="Terms & Conditions Checkbox">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">General Settings</Text>
                <Checkbox
                  label="Enable checkbox on cart"
                  checked={formState.enabled}
                  onChange={(v) => handleChange("enabled", v)}
                />
                <Checkbox
                  label="Checkbox is required to checkout"
                  checked={formState.checkboxRequired}
                  onChange={(v) => handleChange("checkboxRequired", v)}
                />
                <Checkbox
                  label="Block express checkout until agreed"
                  checked={formState.blockExpressCheckout}
                  onChange={(v) => handleChange("blockExpressCheckout", v)}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Checkbox Message</Text>
                <FormLayout>
                  <TextField
                    label="Message text"
                    value={formState.message}
                    onChange={(v) => handleChange("message", v)}
                    helpText='Text before the link, e.g. "I accept the"'
                  />
                  <TextField
                    label="Link text"
                    value={formState.linkText}
                    onChange={(v) => handleChange("linkText", v)}
                    helpText='The clickable link text, e.g. "terms and conditions"'
                  />
                  <TextField
                    label="Link URL"
                    value={formState.linkUrl}
                    onChange={(v) => handleChange("linkUrl", v)}
                    helpText="URL to your terms page"
                  />
                  <TextField
                    label="Error message"
                    value={formState.errorMessage}
                    onChange={(v) => handleChange("errorMessage", v)}
                    helpText="Shown when customer tries to checkout without agreeing"
                    multiline={2}
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Appearance</Text>
                <Select
                  label="Position"
                  options={[
                    { label: "Above checkout button", value: "above_checkout" },
                    { label: "Below checkout button", value: "below_checkout" },
                    { label: "Custom (App Block)", value: "custom" },
                  ]}
                  value={formState.position}
                  onChange={(v) => handleChange("position", v)}
                />
                <RangeSlider
                  label={`Font size: ${formState.fontSize}px`}
                  value={formState.fontSize}
                  min={10}
                  max={20}
                  onChange={(v) => handleChange("fontSize", v)}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Consent Logging</Text>
                <Checkbox
                  label="Log date & time when checkbox is checked"
                  checked={formState.logConsent}
                  onChange={(v) => handleChange("logConsent", v)}
                />
                <Banner tone="info">
                  Consent logs record the timestamp, customer info, and cart
                  token when a customer agrees to your terms.
                </Banner>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Preview</Text>
              <div style={{
                padding: "20px",
                border: "1px solid #e1e1e1",
                borderRadius: "8px",
                background: "#fff"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: `${formState.fontSize}px`
                }}>
                  <input type="checkbox" />
                  <span>
                    {formState.message}{" "}
                    <a href="#" style={{ color: "#2c6ecb" }}>
                      {formState.linkText}
                    </a>
                  </span>
                </div>
              </div>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Quick Links</Text>
              <Button url="/app/consent-logs" fullWidth>
                View Consent Logs
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <div style={{ marginTop: "20px" }}>
        <Button variant="primary" onClick={handleSave} loading={isSubmitting}>
          Save Settings
        </Button>
      </div>
    </Page>
  );
}
```

---

## 5. App Frontend (Admin UI) — Consent Logs Page

### 5.1 Consent Logs Viewer (app/routes/app.consent-logs.jsx)
```javascript
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Page, Card, DataTable, Pagination, Badge, Text,
  BlockStack, Button, EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 25;

  const [logs, total] = await Promise.all([
    db.consentLog.findMany({
      where: { shop },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.consentLog.count({ where: { shop } }),
  ]);

  return json({ logs, total, page, limit });
}

export default function ConsentLogs() {
  const { logs, total, page, limit } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  if (logs.length === 0) {
    return (
      <Page title="Consent Logs" backAction={{ url: "/app" }}>
        <Card>
          <EmptyState
            heading="No consent logs yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Consent records will appear here once customers start
              agreeing to your terms.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = logs.map((log) => [
    new Date(log.timestamp).toLocaleString(),
    log.customerEmail || "Guest",
    log.cartToken ? log.cartToken.substring(0, 12) + "..." : "—",
    log.consentGiven ? (
      <Badge tone="success">Agreed</Badge>
    ) : (
      <Badge tone="critical">Declined</Badge>
    ),
    log.pageUrl || "—",
  ]);

  return (
    <Page title="Consent Logs" backAction={{ url: "/app" }}
      subtitle={`${total} total records`}>
      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "text", "text"]}
          headings={["Date & Time", "Customer", "Cart Token", "Status", "Page"]}
          rows={rows}
        />
        <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
          <Pagination
            hasPrevious={page > 1}
            hasNext={page < totalPages}
            onPrevious={() => setSearchParams({ page: String(page - 1) })}
            onNext={() => setSearchParams({ page: String(page + 1) })}
          />
        </div>
      </Card>
    </Page>
  );
}
```

---

## 6. Theme App Extension (Storefront)

This is the most critical part — the actual checkbox that appears on the store.

### 6.1 Create the Extension
```bash
shopify app generate extension

# Select: Theme app extension
# Name: tc-checkbox
```

### 6.2 Checkbox Block (extensions/tc-checkbox/blocks/checkbox.liquid)
```liquid
{% comment %}
  Terms & Conditions Checkbox Block
  Can be placed anywhere in the cart via the Theme Editor
{% endcomment %}

{{ 'checkbox.css' | asset_url | stylesheet_tag }}

<div
  class="tc-checkbox-wrapper"
  id="tc-checkbox-wrapper"
  data-required="{{ block.settings.required }}"
  data-error-message="{{ block.settings.error_message }}"
  data-log-consent="{{ block.settings.log_consent }}"
  data-shop="{{ shop.permanent_domain }}"
  data-proxy-url="{{ shop.url }}/apps/tc-consent"
  data-block-express="{{ block.settings.block_express_checkout }}"
>
  <label class="tc-checkbox-label" for="tc-agree-checkbox">
    <input
      type="checkbox"
      id="tc-agree-checkbox"
      class="tc-checkbox-input"
      name="tc-agree"
    />
    <span class="tc-checkbox-custom"></span>
    <span class="tc-checkbox-text" style="font-size: {{ block.settings.font_size }}px;">
      {{ block.settings.message_text }}
      {% if block.settings.link_url != blank %}
        <a
          href="{{ block.settings.link_url }}"
          target="_blank"
          rel="noopener noreferrer"
          class="tc-checkbox-link"
        >
          {{ block.settings.link_text }}
        </a>
      {% endif %}
    </span>
  </label>
  <div class="tc-error-message" id="tc-error-message" style="display: none;">
    {{ block.settings.error_message }}
  </div>
</div>

<script src="{{ 'checkbox.js' | asset_url }}" defer></script>

{% schema %}
{
  "name": "T&C Checkbox",
  "target": "section",
  "enabled_on": {
    "templates": ["cart"]
  },
  "settings": [
    {
      "type": "checkbox",
      "id": "required",
      "label": "Required to checkout",
      "default": true
    },
    {
      "type": "text",
      "id": "message_text",
      "label": "Message text",
      "default": "I accept the"
    },
    {
      "type": "text",
      "id": "link_text",
      "label": "Link text",
      "default": "terms and conditions"
    },
    {
      "type": "url",
      "id": "link_url",
      "label": "Link URL"
    },
    {
      "type": "text",
      "id": "error_message",
      "label": "Error message",
      "default": "You must agree to the terms and conditions before checking out."
    },
    {
      "type": "range",
      "id": "font_size",
      "label": "Font size",
      "min": 10,
      "max": 24,
      "step": 1,
      "default": 14,
      "unit": "px"
    },
    {
      "type": "checkbox",
      "id": "log_consent",
      "label": "Log consent timestamps",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "block_express_checkout",
      "label": "Block express checkout (PayPal, Apple Pay, Shop Pay)",
      "default": true
    },
    {
      "type": "color",
      "id": "checkbox_color",
      "label": "Checkbox accent color",
      "default": "#000000"
    },
    {
      "type": "color",
      "id": "error_color",
      "label": "Error message color",
      "default": "#dc3545"
    }
  ]
}
{% endschema %}
```

### 6.3 CSS (extensions/tc-checkbox/assets/checkbox.css)
```css
.tc-checkbox-wrapper {
  padding: 12px 0;
  margin: 8px 0;
}

.tc-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  line-height: 1.4;
}

/* Hide native checkbox */
.tc-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Custom checkbox */
.tc-checkbox-custom {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid #ccc;
  border-radius: 4px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-top: 1px;
}

.tc-checkbox-input:checked + .tc-checkbox-custom {
  background: #000;
  border-color: #000;
}

.tc-checkbox-input:checked + .tc-checkbox-custom::after {
  content: '';
  width: 6px;
  height: 10px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.tc-checkbox-input:focus + .tc-checkbox-custom {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
}

.tc-checkbox-text {
  color: #333;
}

.tc-checkbox-link {
  color: #2c6ecb;
  text-decoration: underline;
}

.tc-checkbox-link:hover {
  color: #1a4d8f;
}

.tc-error-message {
  color: #dc3545;
  font-size: 13px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff5f5;
  border-radius: 4px;
  border: 1px solid #fecaca;
  animation: tc-shake 0.4s ease;
}

@keyframes tc-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Error state for checkout button */
.tc-checkout-blocked {
  opacity: 0.5;
  pointer-events: none;
}

/* Express checkout overlay */
.tc-express-overlay {
  position: relative;
}

.tc-express-overlay::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 10;
  cursor: not-allowed;
  border-radius: 4px;
}
```

### 6.4 JavaScript (extensions/tc-checkbox/assets/checkbox.js)
```javascript
(function () {
  "use strict";

  const wrapper = document.getElementById("tc-checkbox-wrapper");
  if (!wrapper) return;

  const checkbox = document.getElementById("tc-agree-checkbox");
  const errorEl = document.getElementById("tc-error-message");
  const isRequired = wrapper.dataset.required === "true";
  const shouldLog = wrapper.dataset.logConsent === "true";
  const proxyUrl = wrapper.dataset.proxyUrl;
  const shop = wrapper.dataset.shop;
  const blockExpress = wrapper.dataset.blockExpress === "true";
  const errorMessage = wrapper.dataset.errorMessage;

  // --- Checkout Button Blocking ---
  function getCheckoutButtons() {
    // Find all checkout-related buttons and forms
    const selectors = [
      '[name="checkout"]',
      '[type="submit"][name="checkout"]',
      'button[name="checkout"]',
      'input[name="checkout"]',
      'a[href="/checkout"]',
      '.cart__checkout-button',
      '.cart__submit',
      '#cart-checkout-button',
      '[data-checkout-button]',
      'form[action="/checkout"] button',
      'form[action="/checkout"] input[type="submit"]',
    ];
    return document.querySelectorAll(selectors.join(", "));
  }

  function getExpressCheckoutButtons() {
    const selectors = [
      '.shopify-payment-button',
      '.dynamic-checkout__buttons',
      '[data-shopify="dynamic-checkout-cart"]',
      '.additional-checkout-buttons',
      '#dynamic-checkout-cart',
      '.cart__dynamic-checkout-buttons',
    ];
    return document.querySelectorAll(selectors.join(", "));
  }

  function updateCheckoutState() {
    const isChecked = checkbox.checked;
    const checkoutBtns = getCheckoutButtons();
    const expressBtns = getExpressCheckoutButtons();

    if (isRequired && !isChecked) {
      // Block standard checkout
      checkoutBtns.forEach((btn) => {
        btn.classList.add("tc-checkout-blocked");
        if (btn.tagName === "BUTTON" || btn.tagName === "INPUT") {
          btn.disabled = true;
        }
      });

      // Block express checkout
      if (blockExpress) {
        expressBtns.forEach((el) => {
          el.classList.add("tc-express-overlay");
        });
      }
    } else {
      // Unblock
      checkoutBtns.forEach((btn) => {
        btn.classList.remove("tc-checkout-blocked");
        if (btn.tagName === "BUTTON" || btn.tagName === "INPUT") {
          btn.disabled = false;
        }
      });

      expressBtns.forEach((el) => {
        el.classList.remove("tc-express-overlay");
      });

      // Hide error if shown
      if (errorEl) errorEl.style.display = "none";
    }
  }

  // --- Intercept Checkout Form Submission ---
  function interceptCheckout() {
    // Intercept form submissions
    document.querySelectorAll('form[action="/checkout"]').forEach((form) => {
      form.addEventListener("submit", function (e) {
        if (isRequired && !checkbox.checked) {
          e.preventDefault();
          e.stopPropagation();
          showError();
          scrollToCheckbox();
          return false;
        }
      });
    });

    // Intercept click on checkout links
    document.querySelectorAll('a[href="/checkout"]').forEach((link) => {
      link.addEventListener("click", function (e) {
        if (isRequired && !checkbox.checked) {
          e.preventDefault();
          e.stopPropagation();
          showError();
          scrollToCheckbox();
        }
      });
    });
  }

  function showError() {
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.textContent = errorMessage;
      // Re-trigger animation
      errorEl.style.animation = "none";
      errorEl.offsetHeight; // Force reflow
      errorEl.style.animation = "tc-shake 0.4s ease";
    }
  }

  function scrollToCheckbox() {
    wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // --- Consent Logging ---
  function logConsent() {
    if (!shouldLog || !proxyUrl) return;

    const data = {
      shop: shop,
      consentGiven: true,
      cartToken: getCartToken(),
      customerEmail: getCustomerEmail(),
      pageUrl: window.location.href,
      timestamp: new Date().toISOString(),
    };

    fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((err) => console.warn("TC consent log failed:", err));
  }

  function getCartToken() {
    // Try to get cart token from cookie
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "cart") return value;
    }
    return null;
  }

  function getCustomerEmail() {
    // Try to get email if customer is logged in
    if (window.__st && window.__st.cid) {
      return window.__st.cid;
    }
    return null;
  }

  // --- Event Listeners ---
  checkbox.addEventListener("change", function () {
    updateCheckoutState();
    if (this.checked) {
      logConsent();
    }
  });

  // --- Drawer Cart Support ---
  // Watch for dynamically loaded cart drawers
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function () {
      // Re-apply checkout blocking when DOM changes (drawer cart opens)
      updateCheckoutState();
      interceptCheckout();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // --- Initialize ---
  updateCheckoutState();
  interceptCheckout();
})();
```

### 6.5 Extension TOML (extensions/tc-checkbox/shopify.extension.toml)
```toml
api_version = "2024-10"

[[extensions]]
type = "theme"
name = "T&C Checkbox"
handle = "tc-checkbox"

  [extensions.capabilities]
  block_progress = false
```

---

## 7. Consent Logging

### 7.1 App Proxy Setup

In `shopify.app.toml`, add:
```toml
[app_proxy]
url = "https://your-app-url.com/api/consent"
subpath = "tc-consent"
prefix = "apps"
```

This makes `https://your-store.myshopify.com/apps/tc-consent` proxy to your API.

### 7.2 Export Consent Logs

Add a CSV export endpoint (app/routes/api.consent-export.jsx):
```javascript
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const logs = await db.consentLog.findMany({
    where: { shop },
    orderBy: { timestamp: "desc" },
  });

  const csv = [
    "Date,Customer Email,Cart Token,Consent Given,Page URL",
    ...logs.map(
      (l) =>
        `"${l.timestamp}","${l.customerEmail || ""}","${l.cartToken || ""}","${l.consentGiven}","${l.pageUrl || ""}"`
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="consent-logs-${Date.now()}.csv"`,
    },
  });
}
```

---

## 8. Express Checkout Integration

Express checkout buttons (PayPal, Apple Pay, Shop Pay) bypass the normal checkout form. Here's how to handle them:

### 8.1 Strategy
The JS in section 6.4 already covers this by:
1. **Overlaying** express checkout buttons with a semi-transparent div
2. **Removing** the overlay once the checkbox is checked
3. Using `pointer-events: none` to prevent clicks

### 8.2 Cart Ajax API Approach (Alternative)
For deeper integration, you can use Shopify's Cart API to add a cart attribute:

```javascript
// When checkbox is checked, add attribute to cart
function setCartAttribute(agreed) {
  fetch("/cart/update.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attributes: {
        "terms_accepted": agreed ? "yes" : "no",
        "terms_accepted_at": agreed ? new Date().toISOString() : "",
      },
    }),
  });
}

checkbox.addEventListener("change", function () {
  setCartAttribute(this.checked);
});
```

This stores consent in cart attributes, which are visible in the Shopify order.

---

## 9. Testing & Deployment

### 9.1 Local Development
```bash
# Start the dev server
shopify app dev

# This will:
# 1. Start your Remix server
# 2. Create a tunnel (Cloudflare)
# 3. Install the app on your dev store
# 4. Open the admin UI
```

### 9.2 Test Checklist
- [ ] Checkbox appears on cart page
- [ ] Checkbox blocks checkout when unchecked (if required)
- [ ] Error message displays with animation
- [ ] Express checkout buttons are blocked when unchecked
- [ ] Checking the box unblocks all checkout methods
- [ ] Consent is logged with correct timestamp
- [ ] Admin settings save and apply correctly
- [ ] Works with drawer/slide-out carts (MutationObserver)
- [ ] Works with AJAX cart updates
- [ ] Link opens terms page in new tab
- [ ] Responsive on mobile
- [ ] Consent logs display in admin

### 9.3 Deploy to Production
```bash
# Deploy to Fly.io (recommended)
fly launch
fly deploy

# Or deploy to Railway/Render via Git push

# Set environment variables
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set SHOPIFY_API_KEY="..."
fly secrets set SHOPIFY_API_SECRET="..."

# Run migrations in production
fly ssh console -C "npx prisma migrate deploy"
```

### 9.4 Deploy the Extension
```bash
shopify app deploy
```

---

## 10. App Store Listing

### 10.1 Required Assets
- App icon (1200×1200px)
- Screenshots (4-6, showing the features from your reference images)
- Demo video (recommended)
- Privacy policy URL
- App description

### 10.2 Submission Checklist
- [ ] App works on a clean theme (Dawn)
- [ ] No console errors
- [ ] Handles edge cases (empty cart, guest checkout)
- [ ] GDPR webhooks implemented (customer data request, erasure)
- [ ] App uninstall cleanup webhook
- [ ] Privacy policy in place
- [ ] Terms of service in place
- [ ] Responsive design
- [ ] Accessible (keyboard navigation, screen readers)

### 10.3 GDPR Webhooks (Required)

Add to `app/routes/webhooks.jsx`:
```javascript
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // Return customer consent data
      const customerLogs = await db.consentLog.findMany({
        where: {
          shop,
          customerEmail: payload.customer.email,
        },
      });
      // Send data to the provided endpoint
      break;

    case "CUSTOMERS_REDACT":
      // Delete customer consent data
      await db.consentLog.deleteMany({
        where: {
          shop,
          customerEmail: payload.customer.email,
        },
      });
      break;

    case "SHOP_REDACT":
      // Delete all shop data
      await db.consentLog.deleteMany({ where: { shop } });
      await db.appSettings.deleteMany({ where: { shop } });
      break;

    case "APP_UNINSTALLED":
      // Clean up session data
      await db.session.deleteMany({ where: { shop } });
      break;
  }

  return new Response("OK", { status: 200 });
};
```

---

## Summary of Key Commands

```bash
# Setup
shopify app init                    # Create app
shopify app generate extension      # Create theme extension

# Development
shopify app dev                     # Run locally
npx prisma studio                   # Browse database

# Deployment
shopify app deploy                  # Deploy extension
fly deploy                          # Deploy backend

# Database
npx prisma migrate dev              # Dev migration
npx prisma migrate deploy           # Production migration
```

---

## Additional Features to Consider

1. **Multiple checkboxes** — Allow merchants to add multiple policies (refund, shipping, age verification)
2. **Conditional display** — Show checkbox only for certain products or cart values
3. **Multi-language support** — Use Shopify's localization APIs
4. **Analytics dashboard** — Show consent rates, checkout conversion impact
5. **Email integration** — Include consent status in order confirmation emails
6. **Checkout UI Extension** — For Shopify Plus merchants, add checkbox directly in checkout
7. **Rich text editor** — Allow merchants to format the message with bold, italic, etc. (Image 2 from your references)
