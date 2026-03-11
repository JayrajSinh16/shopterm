import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  List,
  Divider,
  DataTable,
  EmptyState,
  Box,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSettings } from "../models/Settings.server";
import { getTodayCount, getTotalCount, getRecentLogs } from "../models/Analytics.server";
import { PLANS, FREE_LOG_LIMIT } from "../models/subscription.constants";
import { getPlan } from "../models/Subscription.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [settings, todayCount, totalCount, recentLogs, plan] = await Promise.all([
    getSettings(shop),
    getTodayCount(shop),
    getTotalCount(shop),
    getRecentLogs(shop, 5),
    getPlan(shop),
  ]);

  const isPro = plan === PLANS.PRO;
  return json({ settings, todayCount, totalCount, recentLogs, shop, isPro });
};

export default function Dashboard() {
  const { settings, todayCount, totalCount, recentLogs, shop, isPro } = useLoaderData();
  const navigate = useNavigate();

  const setupSteps = [
    { label: "App installed", done: true },
    {
      label: "Configure settings",
      done: settings.messageText !== "I accept the" || settings.linkUrl !== "/policies/terms-of-service",
      action: { label: "Go to Settings", url: "/app/settings" },
    },
    {
      label: "Add checkbox to your theme",
      done: false,
      action: {
        label: "Open Theme Editor",
        external: `https://${shop}/admin/themes/current/editor?template=cart`,
      },
    },
    {
      label: "Test on your storefront",
      done: todayCount > 0,
      action: {
        label: "Preview Store",
        external: `https://${shop}/cart`,
      },
    },
  ];

  const allSetupDone = setupSteps.every((s) => s.done);

  const logRows = recentLogs.map((log) => [
    formatTimeAgo(log.timestamp),
    log.customerEmail || "Guest",
    <Badge tone="success" key={log.id}>Agreed</Badge>,
  ]);

  return (
    <Page title="Terms & Conditions Checkbox">
      <Layout>
        {/* Free plan upgrade banner */}
        {!isPro && (
          <Layout.Section>
            <Banner
              title="You're on the Free plan"
              tone="warning"
              action={{ content: "Upgrade to Pro — $4/mo", url: "/app/upgrade" }}
            >
              <p>
                Consent logs are capped at {FREE_LOG_LIMIT} (oldest deleted when full). Upgrade to
                unlock unlimited logs, CSV export, analytics, appearance customization, and more.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {/* Status + Stats Row */}
        <Layout.Section>
          <InlineStack gap="400" align="start" wrap>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">Status</Text>
                <Badge tone={settings.enabled ? "success" : "critical"}>
                  {settings.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">Consents Today</Text>
                <Text variant="heading2xl" as="p">{todayCount}</Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">Total Consents</Text>
                <Text variant="heading2xl" as="p">{totalCount}</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Setup Guide */}
        {!allSetupDone && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Quick Setup Guide</Text>
                <BlockStack gap="300">
                  {setupSteps.map((step, i) => (
                    <InlineStack key={i} gap="300" align="start">
                      <Text as="span">{step.done ? "✅" : "⬜"}</Text>
                      <BlockStack gap="100">
                        <Text as="span">{step.label}</Text>
                        {!step.done && step.action && (
                          step.action.external ? (
                            <Button
                              url={step.action.external}
                              target="_blank"
                              size="slim"
                            >
                              {step.action.label}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => navigate(step.action.url)}
                              size="slim"
                            >
                              {step.action.label}
                            </Button>
                          )
                        )}
                      </BlockStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Recent Logs */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd">Recent Consent Logs</Text>
                <Button onClick={() => navigate("/app/consent-logs")} size="slim">
                  View All Logs →
                </Button>
              </InlineStack>

              {recentLogs.length === 0 ? (
                <EmptyState
                  heading="No consent logs yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Consent records will appear here once customers agree to your terms.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text"]}
                  headings={["Time", "Customer", "Status"]}
                  rows={logRows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Current Config Summary */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Current Configuration</Text>
              <Divider />
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text tone="subdued">Required to checkout</Text>
                  <Badge tone={settings.checkboxRequired ? "success" : "warning"}>
                    {settings.checkboxRequired ? "Yes" : "No"}
                  </Badge>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text tone="subdued">Block express checkout</Text>
                  <Badge tone={settings.blockExpressCheckout ? "success" : "warning"}>
                    {settings.blockExpressCheckout ? "Yes" : "No"}
                  </Badge>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text tone="subdued">Log consent</Text>
                  <Badge tone={settings.logConsent ? "success" : "warning"}>
                    {settings.logConsent ? "Yes" : "No"}
                  </Badge>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text tone="subdued">Position</Text>
                  <Text>{formatPosition(settings.position)}</Text>
                </InlineStack>
              </BlockStack>
              <Button onClick={() => navigate("/app/settings")} variant="primary" fullWidth>
                Edit Settings
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatPosition(pos) {
  const map = {
    above_checkout: "Above checkout",
    below_checkout: "Below checkout",
    custom: "Custom (App Block)",
  };
  return map[pos] || pos;
}
