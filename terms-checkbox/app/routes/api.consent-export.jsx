/**
 * CSV Export Endpoint
 * GET /api/consent-export
 *
 * Downloads all consent logs as a CSV file.
 * Requires admin session authentication.
 */

import { authenticate } from "../shopify.server";
import { exportLogs } from "../models/ConsentLog.server";
import { getPlan, PLANS } from "../models/Subscription.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plan = await getPlan(shop);
  if (plan !== PLANS.PRO) {
    return new Response(
      JSON.stringify({ error: "CSV export requires the Pro plan. Upgrade at /app/upgrade." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";
  const email = url.searchParams.get("email") || "";

  const logs = await exportLogs(shop, { dateFrom, dateTo, email });

  // Build CSV
  const headers = [
    "ID",
    "Timestamp",
    "Customer Email",
    "Customer ID",
    "Cart Token",
    "Consent Given",
    "Page URL",
    "IP Address",
    "Checkbox Version",
  ];

  const escape = (val) => {
    const s = val == null ? "" : String(val);
    // Wrap in quotes if the value contains commas, quotes, or newlines
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = logs.map((log) =>
    [
      log.id,
      log.timestamp,
      log.customerEmail,
      log.customerId,
      log.cartToken,
      log.consentGiven,
      log.pageUrl,
      log.ipAddress,
      log.checkboxVersion,
    ]
      .map(escape)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `consent-logs-${shop}-${Date.now()}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
