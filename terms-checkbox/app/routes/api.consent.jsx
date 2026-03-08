/**
 * App Proxy Endpoint: POST /apps/tc-consent
 *
 * Shopify routes storefront requests to:
 *   https://<store>.myshopify.com/apps/tc-consent
 * → proxied to our server at: /api/consent
 *
 * Shopify automatically adds HMAC query params on App Proxy requests.
 * We validate the signature before processing.
 *
 * GET  — Returns paginated consent logs (admin use only, session-authenticated)
 * POST — Logs a new consent record (storefront HMAC-validated OR checkout extension session-token)
 */

import { json } from "@remix-run/node";
import crypto from "crypto";
import { authenticate } from "../shopify.server";
import { createLog, getLogs } from "../models/ConsentLog.server";

// ── POST: Log consent (called from storefront via App Proxy OR checkout extension) ──
export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Validate auth: App Proxy HMAC OR checkout extension session token
  const url = new URL(request.url);
  const hmacValid = validateAppProxyHmac(url.searchParams);
  const sessionTokenShop = !hmacValid
    ? await validateSessionToken(request)
    : null;

  if (!hmacValid && !sessionTokenShop) {
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    shop,
    customerId,
    customerEmail,
    cartToken,
    consentGiven = true,
    pageUrl,
    checkboxVersion,
  } = body;

  if (!shop) {
    return json({ error: "shop is required" }, { status: 400 });
  }

  try {
    const log = await createLog({
      shop,
      customerId: customerId || null,
      customerEmail: customerEmail || null,
      cartToken: cartToken || null,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: request.headers.get("user-agent") || null,
      consentGiven,
      pageUrl: pageUrl || null,
      checkboxVersion: checkboxVersion || null,
    });

    return json({ success: true, id: log.id });
  } catch (err) {
    console.error("[api.consent] DB error:", err);
    // IMPORTANT: Never return a 500 that could block checkout; still return 200
    return json(
      { success: false, error: "Failed to log consent (non-critical)" },
      { status: 200 }
    );
  }
}

// ── GET: Retrieve consent logs (admin, session-authenticated) ─────────────────
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const email = url.searchParams.get("email") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  const result = await getLogs(shop, { page, limit, email, dateFrom, dateTo });
  return json(result);
}

// ── HMAC Validation ───────────────────────────────────────────────────────────

function validateAppProxyHmac(searchParams) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const signature = searchParams.get("signature");
  if (!signature) return false;

  // Build the query string without the signature param, sorted
  const params = [];
  for (const [key, value] of searchParams.entries()) {
    if (key !== "signature") {
      params.push(`${key}=${value}`);
    }
  }
  params.sort();
  const message = params.join("");

  const computed = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

// ── Session Token Validation (for Checkout UI Extension) ─────────────────────

/**
 * Checkout UI extensions send a Shopify-signed JWT session token.
 * We decode and verify it using the app's API secret.
 * Returns the shop domain if valid, null otherwise.
 */
async function validateSessionToken(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return null;

  try {
    // Shopify session tokens are JWTs signed with HS256 using the app's API secret
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const headerB64 = parts[0];
    const payloadB64 = parts[1];
    const signatureB64 = parts[2];

    // Verify signature
    const signInput = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(signInput)
      .digest("base64url");

    // Constant-time comparison
    if (
      expectedSig.length !== signatureB64.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSig, "utf8"),
        Buffer.from(signatureB64, "utf8")
      )
    ) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );

    // Check expiration (with 60s leeway)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp + 60 < now) return null;

    // Extract shop from the iss (issuer) or dest claim
    // Shopify sets dest to the shop URL: https://store.myshopify.com
    const dest = payload.dest || payload.iss || "";
    const shopMatch = dest.match(/([^/]+\.myshopify\.com)/);
    return shopMatch ? shopMatch[1] : null;
  } catch {
    return null;
  }
}
