import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  List,
  Badge,
  Divider,
  Banner,
} from "@shopify/polaris";

export default function Upgrade() {
  return (
    <Page
      title="Upgrade to Pro"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {/* Pro plan card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingLg">Pro Plan</Text>
                    <Badge tone="success">Recommended</Badge>
                  </InlineStack>
                  <InlineStack gap="100" blockAlign="baseline">
                    <Text variant="heading2xl" as="p">$4.98</Text>
                    <Text tone="subdued">/ month</Text>
                  </InlineStack>
                </BlockStack>
                <Button variant="primary" url="/app/billing" size="large">
                  Upgrade Now
                </Button>
              </InlineStack>

              <Divider />

              <BlockStack gap="300">
                <Text variant="headingMd">Everything in Free, plus:</Text>
                <List type="bullet">
                  <List.Item>Unlimited consent log storage</List.Item>
                  <List.Item>CSV export of consent records</List.Item>
                  <List.Item>
                    Analytics dashboard — today / 7-day / all-time stats with trend chart
                  </List.Item>
                  <List.Item>
                    Consent log search &amp; filters — filter by email, date range
                  </List.Item>
                  <List.Item>
                    Full appearance customization — font size, font color, checkbox color,
                    link color, underline toggle
                  </List.Item>
                  <List.Item>
                    IP address &amp; user agent capture for compliance audits
                  </List.Item>
                  <List.Item>
                    Checkbox version snapshot — stores exact message text at time of consent
                  </List.Item>
                  <List.Item>
                    Checkout extension support (Shopify Plus)
                  </List.Item>
                  <List.Item>Priority support</List.Item>
                </List>
              </BlockStack>

              <Banner tone="info">
                Includes a 7-day free trial. Cancel any time from your Shopify Billing settings.
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Free plan comparison */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text variant="headingMd">Your Current Plan</Text>
                <Badge>Free</Badge>
              </BlockStack>
              <Divider />
              <List type="bullet">
                <List.Item>Checkbox on cart page</List.Item>
                <List.Item>Required / optional toggle</List.Item>
                <List.Item>Custom message text &amp; T&amp;C link</List.Item>
                <List.Item>Block express checkout buttons</List.Item>
                <List.Item>Works with drawer/slide-out carts</List.Item>
                <List.Item>50 consent logs (rolling, oldest deleted)</List.Item>
                <List.Item>Basic position options (above / below checkout)</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
