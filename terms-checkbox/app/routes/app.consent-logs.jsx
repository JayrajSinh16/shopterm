import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Pagination,
  Badge,
  Text,
  BlockStack,
  InlineStack,
  Button,
  EmptyState,
  TextField,
  Select,
  Divider,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getLogs } from "../models/ConsentLog.server";
import { getPlan, PLANS, FREE_LOG_LIMIT } from "../models/Subscription.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  const plan = await getPlan(shop);
  const isPro = plan === PLANS.PRO;

  const page = parseInt(url.searchParams.get("page") || "1", 10);
  // Free plan: no filter support, cap at FREE_LOG_LIMIT
  const email = isPro ? (url.searchParams.get("email") || "") : "";
  const dateFrom = isPro ? (url.searchParams.get("dateFrom") || "") : "";
  const dateTo = isPro ? (url.searchParams.get("dateTo") || "") : "";
  const limit = isPro ? 25 : FREE_LOG_LIMIT;

  const result = await getLogs(shop, { page: isPro ? page : 1, limit, dateFrom, dateTo, email });

  return json({ ...result, filters: { email, dateFrom, dateTo }, isPro });
};

export default function ConsentLogs() {
  const { logs, total, page, totalPages, filters, isPro } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [emailFilter, setEmailFilter] = useState(filters.email);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);

  const applyFilters = useCallback(() => {
    const params = { page: "1" };
    if (emailFilter) params.email = emailFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    setSearchParams(params);
  }, [emailFilter, dateFrom, dateTo, setSearchParams]);

  const clearFilters = useCallback(() => {
    setEmailFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchParams({ page: "1" });
  }, [setSearchParams]);

  const rows = logs.map((log) => [
    formatDate(log.timestamp),
    log.customerEmail || "Guest",
    log.cartToken ? log.cartToken.substring(0, 12) + "…" : "—",
    <Badge tone="success" key={log.id}>Agreed</Badge>,
    log.pageUrl ? truncateUrl(log.pageUrl) : "—",
  ]);

  return (
    <Page
      title="Consent Logs"
      backAction={{ content: "Dashboard", url: "/app" }}
      subtitle={`${total} total records`}
      primaryAction={isPro ? {
        content: "Export CSV",
        url: "/api/consent-export",
        target: "_blank",
      } : undefined}
    >
      <Layout>
        {/* Free plan notice */}
        {!isPro && (
          <Layout.Section>
            <Banner
              title={`Free plan: showing last ${FREE_LOG_LIMIT} logs`}
              tone="warning"
              action={{ content: "Upgrade to Pro", url: "/app/upgrade" }}
            >
              <p>
                Filters, CSV export, and unlimited log storage are Pro features.
                Upgrade to access full consent history.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {/* Filters — Pro only */}
          {isPro && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Filters</Text>
                <InlineStack gap="300" wrap align="start">
                  <TextField
                    label="Customer email"
                    value={emailFilter}
                    onChange={setEmailFilter}
                    placeholder="Search by email..."
                    clearButton
                    onClearButtonClick={() => setEmailFilter("")}
                    autoComplete="off"
                  />
                  <TextField
                    label="Date from"
                    type="date"
                    value={dateFrom}
                    onChange={setDateFrom}
                    autoComplete="off"
                  />
                  <TextField
                    label="Date to"
                    type="date"
                    value={dateTo}
                    onChange={setDateTo}
                    autoComplete="off"
                  />
                </InlineStack>
                <InlineStack gap="200">
                  <Button variant="primary" onClick={applyFilters}>Apply Filters</Button>
                  <Button onClick={clearFilters}>Clear</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>

        <Layout.Section>
          <Card>
            {logs.length === 0 ? (
              <EmptyState
                heading="No consent logs found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  {total === 0
                    ? "Consent records will appear here once customers start agreeing to your terms."
                    : "No records match your current filters. Try adjusting them."}
                </p>
              </EmptyState>
            ) : (
              <>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["Date & Time", "Customer", "Cart Token", "Status", "Page"]}
                  rows={rows}
                />
                {isPro && (
                  <>
                    <Divider />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                      }}
                    >
                      <Text tone="subdued">
                        Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
                      </Text>
                      <Pagination
                        hasPrevious={page > 1}
                        hasNext={page < totalPages}
                        onPrevious={() => {
                          const p = new URLSearchParams(searchParams);
                          p.set("page", String(page - 1));
                          setSearchParams(p);
                        }}
                        onNext={() => {
                          const p = new URLSearchParams(searchParams);
                          p.set("page", String(page + 1));
                          setSearchParams(p);
                        }}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url.length > 30 ? url.substring(0, 30) + "…" : url;
  }
}
