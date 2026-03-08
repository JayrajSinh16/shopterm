/**
 * Billing Route
 * GET /app/billing
 *
 * Redirects the merchant to the Shopify billing confirmation page
 * to subscribe to the Pro Plan. billing.request() always throws a
 * redirect response — no UI is rendered here.
 */
import { authenticate } from "../shopify.server";
import { PRO_PLAN_NAME } from "../models/subscription.constants";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  await billing.request({
    plan: PRO_PLAN_NAME,
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: `${process.env.SHOPIFY_APP_URL || ""}/app`,
  });

  // billing.request() always redirects; this line is never reached
  return null;
};
