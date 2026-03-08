/**
 * ConsentLogTable
 *
 * Reusable Polaris DataTable for rendering consent log rows.
 */
import { DataTable, Badge, EmptyState } from "@shopify/polaris";

export function ConsentLogTable({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        heading="No consent logs yet"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>
          Consent records will appear here once customers start agreeing to your
          terms.
        </p>
      </EmptyState>
    );
  }

  const rows = logs.map((log) => [
    formatDate(log.timestamp),
    log.customerEmail || "Guest",
    log.cartToken ? log.cartToken.substring(0, 12) + "…" : "—",
    <Badge tone="success" key={log.id}>
      Agreed
    </Badge>,
    truncateUrl(log.pageUrl),
  ]);

  return (
    <DataTable
      columnContentTypes={["text", "text", "text", "text", "text"]}
      headings={["Date & Time", "Customer", "Cart Token", "Status", "Page"]}
      rows={rows}
    />
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
  if (!url) return "—";
  try {
    return new URL(url).pathname;
  } catch {
    return url.length > 30 ? url.substring(0, 30) + "…" : url;
  }
}
