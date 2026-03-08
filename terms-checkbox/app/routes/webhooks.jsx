/**
 * Shopify Webhooks Handler
 *
 * Handles all mandatory GDPR webhooks + app lifecycle events.
 * Shopify requires these endpoints to be implemented for app store approval.
 */

import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  deleteCustomerLogs,
  deleteShopLogs,
  getCustomerLogs,
} from "../models/ConsentLog.server";
import { deleteSettings } from "../models/Settings.server";

export const action = async ({ request }) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  console.log(`[webhook] Received: ${topic} from ${shop}`);

  switch (topic) {
    // ── GDPR: Customer data request ────────────────────────────────────────
    case "CUSTOMERS_DATA_REQUEST": {
      const { customer } = payload;
      const email = customer?.email;

      if (email) {
        const logs = await getCustomerLogs(shop, email);
        // In a real app, you'd send this data to the provided data_request.callback_url
        // For now, log it server-side
        console.log(
          `[webhook] CUSTOMERS_DATA_REQUEST: Found ${logs.length} records for ${email} in ${shop}`
        );
      }

      return new Response("OK", { status: 200 });
    }

    // ── GDPR: Customer redact ───────────────────────────────────────────────
    case "CUSTOMERS_REDACT": {
      const { customer } = payload;
      const email = customer?.email;

      if (email) {
        const result = await deleteCustomerLogs(shop, email);
        console.log(
          `[webhook] CUSTOMERS_REDACT: Deleted consent logs for ${email} in ${shop}`
        );
      }

      return new Response("OK", { status: 200 });
    }

    // ── GDPR: Shop redact ───────────────────────────────────────────────────
    case "SHOP_REDACT": {
      // Delete ALL data for this shop
      await Promise.all([
        deleteShopLogs(shop),
        deleteSettings(shop),
        db.session.deleteMany({ where: { shop } }),
      ]);

      console.log(`[webhook] SHOP_REDACT: All data deleted for ${shop}`);
      return new Response("OK", { status: 200 });
    }

    // ── App uninstalled ─────────────────────────────────────────────────────
    case "APP_UNINSTALLED": {
      // Delete sessions; optionally keep settings + consent logs for reinstall
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }

      console.log(`[webhook] APP_UNINSTALLED: Sessions cleared for ${shop}`);
      return new Response("OK", { status: 200 });
    }

    default:
      console.warn(`[webhook] Unhandled topic: ${topic}`);
      return new Response("Not handled", { status: 404 });
  }
};
