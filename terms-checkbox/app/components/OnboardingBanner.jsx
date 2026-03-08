/**
 * OnboardingBanner — shows first-time setup steps to a new merchant.
 */
import { Card, BlockStack, InlineStack, Text, Button, Badge } from "@shopify/polaris";

export function OnboardingBanner({ steps = [], onDismiss }) {
  const allDone = steps.every((s) => s.done);

  if (allDone) return null;

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text variant="headingMd">Getting Started</Text>
          {onDismiss && (
            <Button variant="plain" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </InlineStack>
        <BlockStack gap="300">
          {steps.map((step, i) => (
            <InlineStack key={i} gap="300" align="start">
              <span style={{ fontSize: 18 }}>{step.done ? "✅" : "⬜"}</span>
              <BlockStack gap="100">
                <Text as="span" fontWeight={step.done ? "regular" : "semibold"}>
                  {step.label}
                </Text>
                {step.description && (
                  <Text tone="subdued" variant="bodySm">
                    {step.description}
                  </Text>
                )}
                {!step.done && step.action && (
                  <div style={{ marginTop: 4 }}>
                    {step.action.external ? (
                      <Button
                        url={step.action.external}
                        target="_blank"
                        size="slim"
                      >
                        {step.action.label}
                      </Button>
                    ) : (
                      <Button url={step.action.url} size="slim">
                        {step.action.label}
                      </Button>
                    )}
                  </div>
                )}
              </BlockStack>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
