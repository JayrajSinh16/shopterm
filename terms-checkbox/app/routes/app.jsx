import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { PLANS, PRO_PLAN_NAME } from "../models/subscription.constants";
import { getPlan, setPlan, isPro as getIsPro } from "../models/Subscription.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  let proActive = false;
  try {
    const { hasActivePayment } = await billing.check({
      plans: [PRO_PLAN_NAME],
      isTest: process.env.NODE_ENV !== "production",
    });
    proActive = hasActivePayment;
    // Sync plan to DB if it drifted
    const currentPlan = await getPlan(shop);
    const expectedPlan = proActive ? PLANS.PRO : PLANS.FREE;
    if (currentPlan !== expectedPlan) {
      await setPlan(shop, expectedPlan);
    }
  } catch {
    // Billing check unavailable (e.g. dev env) — fall back to DB value
    proActive = await getIsPro(shop);
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "", isPro: proActive };
};

export default function App() {
  const { apiKey, isPro } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Dashboard</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/consent-logs">Consent Logs</Link>
        {isPro && <Link to="/app/analytics">Analytics</Link>}
        <Link to="/app/help">Help</Link>
        {!isPro && <Link to="/app/upgrade">⭐ Upgrade to Pro</Link>}
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch certain errors; boundary is required
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
