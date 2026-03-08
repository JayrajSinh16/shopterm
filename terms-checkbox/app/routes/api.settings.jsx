/**
 * Public Settings API
 * GET /api/settings?shop=<shop-domain>
 *
 * Called by the Theme App Extension storefront JS to fetch the latest settings.
 * Returns only safe, public-facing settings (no PII, no secrets).
 *
 * NOTE: This endpoint is accessed via App Proxy. Validate HMAC.
 */

import { json } from "@remix-run/node";
import crypto from "crypto";
import { getPublicSettings } from "../models/Settings.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "shop parameter required" }, { status: 400 });
  }

  // Validate App Proxy HMAC
  const isValid = validateHmac(url.searchParams);
  if (!isValid) {
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  const settings = await getPublicSettings(shop);
  return json(settings);
}

function validateHmac(searchParams) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const signature = searchParams.get("signature");
  if (!signature) return false;

  const params = [];
  for (const [key, value] of searchParams.entries()) {
    if (key !== "signature") params.push(`${key}=${value}`);
  }
  params.sort();

  const computed = crypto
    .createHmac("sha256", secret)
    .update(params.join(""))
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}
