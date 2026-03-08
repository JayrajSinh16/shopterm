import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  DataTable,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getTodayCount, getTotalCount, getWeeklyTrend } from "../models/Analytics.server";
import { PLANS } from "../models/subscription.constants";
import { getPlan } from "../models/Subscription.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plan = await getPlan(shop);
  if (plan !== PLANS.PRO) {
    return redirect("/app/upgrade");
  }

  const [todayCount, totalCount, weeklyTrend] = await Promise.all([
    getTodayCount(shop),
    getTotalCount(shop),
    getWeeklyTrend(shop),
  ]);

  return json({ todayCount, totalCount, weeklyTrend });
};

export default function Analytics() {
  const { todayCount, totalCount, weeklyTrend } = useLoaderData();

  const weeklyRows = weeklyTrend.map((d) => [d.date, String(d.count)]);
  const weekTotal = weeklyTrend.reduce((sum, d) => sum + d.count, 0);
  const weekPeak = Math.max(...weeklyTrend.map((d) => d.count), 0);

  return (
    <Page title="Analytics" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        {/* Summary cards */}
        <Layout.Section>
          <InlineStack gap="400" wrap>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">Today</Text>
                <Text variant="heading2xl" as="p">{todayCount}</Text>
                <Text tone="subdued">consents</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">Last 7 Days</Text>
                <Text variant="heading2xl" as="p">{weekTotal}</Text>
                <Text tone="subdued">consents</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">All Time</Text>
                <Text variant="heading2xl" as="p">{totalCount}</Text>
                <Text tone="subdued">consents</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">Peak Day (7d)</Text>
                <Text variant="heading2xl" as="p">{weekPeak}</Text>
                <Text tone="subdued">consents</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Weekly trend table */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Daily Trend — Last 7 Days</Text>
              <DataTable
                columnContentTypes={["text", "numeric"]}
                headings={["Date", "Consents"]}
                rows={weeklyRows}
                totals={["Total", weekTotal]}
                showTotalsInFooter
              />

              {/* Simple ASCII bar chart */}
              <Divider />
              <Text variant="headingSm" tone="subdued">Bar Chart</Text>
              <div style={{ fontFamily: "monospace", fontSize: "13px" }}>
                {weeklyTrend.map((d) => {
                  const bar = weekPeak > 0
                    ? "█".repeat(Math.round((d.count / weekPeak) * 20))
                    : "";
                  return (
                    <div key={d.date} style={{ marginBottom: 4 }}>
                      <span style={{ display: "inline-block", width: 70, color: "#666" }}>
                        {d.date}
                      </span>
                      <span style={{ color: "#2c6ecb" }}>{bar || "▏"}</span>
                      <span style={{ marginLeft: 6, color: "#333" }}>{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
