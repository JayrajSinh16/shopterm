import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  List,
  Link,
  Divider,
  Banner,
  Button,
  InlineStack,
} from "@shopify/polaris";

export default function Help() {
  return (
    <Page title="Help & Documentation" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Setup Guide */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Setup Guide</Text>
                <BlockStack gap="300">
                  <Text variant="headingSm">Step 1 — Configure Settings</Text>
                  <Text>
                    Go to <strong>Settings</strong> and customize your checkbox message,
                    link text, link URL, and error message. Set the position and appearance
                    to match your store.
                  </Text>

                  <Text variant="headingSm">Step 2 — Add to Your Theme</Text>
                  <Text>
                    Open your theme editor (Online Store → Themes → Customize), navigate
                    to the <strong>Cart</strong> template, click <strong>Add block</strong>,
                    and select <em>T&C Checkbox</em> from the list.
                  </Text>
                  <Text>
                    If your theme has a drawer/slide-out cart, add the block there as well
                    by navigating to your drawer cart section in the theme editor.
                  </Text>

                  <Text variant="headingSm">Step 3 — Test the Checkout Flow</Text>
                  <List type="bullet">
                    <List.Item>Add a product to your cart and visit the cart page.</List.Item>
                    <List.Item>Try clicking Checkout without checking the box — an error should appear.</List.Item>
                    <List.Item>Check the box and verify checkout proceeds normally.</List.Item>
                    <List.Item>Check the <strong>Consent Logs</strong> page to confirm the entry was recorded.</List.Item>
                  </List>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* FAQ */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Frequently Asked Questions</Text>

                <BlockStack gap="300">
                  <Text variant="headingSm">The checkbox isn't showing on my cart page</Text>
                  <List type="bullet">
                    <List.Item>Make sure the app is <strong>Enabled</strong> in Settings.</List.Item>
                    <List.Item>Verify you added the T&C Checkbox block to your Cart template in the Theme Editor.</List.Item>
                    <List.Item>Some themes use a custom cart page — try adding it to the section that contains the checkout button.</List.Item>
                    <List.Item>Clear your browser cache and hard-refresh the cart page.</List.Item>
                  </List>

                  <Divider />

                  <Text variant="headingSm">Express checkout buttons aren't being blocked</Text>
                  <List type="bullet">
                    <List.Item>Make sure <strong>Block express checkout</strong> is enabled in Settings.</List.Item>
                    <List.Item>Express checkout buttons (Shop Pay, Apple Pay, PayPal) load asynchronously — there may be a brief delay before the overlay appears.</List.Item>
                    <List.Item>Some themes use custom wrappers for express buttons; the selectors cover the most common patterns but may need theme-specific adjustment.</List.Item>
                  </List>

                  <Divider />

                  <Text variant="headingSm">Consent logs aren't appearing</Text>
                  <List type="bullet">
                    <List.Item>Make sure <strong>Log consent timestamps</strong> is enabled in Settings.</List.Item>
                    <List.Item>The App Proxy must be correctly configured in your Shopify Partners dashboard. See the deployment docs for details.</List.Item>
                    <List.Item>Check your server logs for any errors on the <code>/api/consent</code> endpoint.</List.Item>
                  </List>

                  <Divider />

                  <Text variant="headingSm">Will this work with my drawer cart?</Text>
                  <Text>
                    Yes. The checkbox JS uses a MutationObserver to detect when drawer cart
                    elements are added to the DOM and re-applies checkout blocking automatically.
                    Add the block to your drawer cart section in the Theme Editor to display
                    the checkbox inside the drawer.
                  </Text>

                  <Divider />

                  <Text variant="headingSm">Is this GDPR compliant?</Text>
                  <Text>
                    The app records consent timestamps, customer email, and cart token to
                    provide an audit trail. All GDPR mandatory webhooks (data request,
                    customer redact, shop redact) are implemented. You should consult a
                    legal professional regarding your specific compliance requirements.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Resources */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Resources</Text>
                <List type="bullet">
                  <List.Item>
                    <Link url="https://shopify.dev/docs/apps/online-store/theme-app-extensions" external>
                      Shopify Theme App Extensions Docs
                    </Link>
                  </List.Item>
                  <List.Item>
                    <Link url="https://shopify.dev/docs/apps/online-store/app-proxies" external>
                      App Proxy Documentation
                    </Link>
                  </List.Item>
                  <List.Item>
                    <Link url="https://polaris.shopify.com/components" external>
                      Shopify Polaris Components
                    </Link>
                  </List.Item>
                  <List.Item>
                    <Link url="https://shopify.dev/docs/api/ajax/reference/cart" external>
                      Shopify Cart Ajax API
                    </Link>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>

            <Banner tone="info">
              Need more help? Open an issue or contact support via your Shopify Partners dashboard.
            </Banner>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
