/**
 * AnalyticsCard — a simple stats card component.
 */
import { Card, BlockStack, Text } from "@shopify/polaris";

export function AnalyticsCard({ title, value, subtitle }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="headingSm" tone="subdued">
          {title}
        </Text>
        <Text variant="heading2xl" as="p">
          {value}
        </Text>
        {subtitle && <Text tone="subdued">{subtitle}</Text>}
      </BlockStack>
    </Card>
  );
}
