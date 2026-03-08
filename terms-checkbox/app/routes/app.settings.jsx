import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  Text,
  BlockStack,
  InlineStack,
  RangeSlider,
  Divider,
  Badge,
  Toast,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSettings, updateSettings } from "../models/Settings.server";
import { CheckboxPreview } from "../components/CheckboxPreview";
import { PLANS } from "../models/subscription.constants";
import { getPlan } from "../models/Subscription.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const [settings, plan] = await Promise.all([
    getSettings(session.shop),
    getPlan(session.shop),
  ]);
  return json({ settings, isPro: plan === PLANS.PRO });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const data = {
    enabled: formData.get("enabled") === "true",
    checkboxRequired: formData.get("checkboxRequired") === "true",
    messageText: String(formData.get("messageText") || "I accept the"),
    linkText: String(formData.get("linkText") || "terms and conditions"),
    linkUrl: String(formData.get("linkUrl") || "/policies/terms-of-service"),
    errorMessage: String(
      formData.get("errorMessage") ||
        "You must agree to the terms and conditions before checking out."
    ),
    position: String(formData.get("position") || "above_checkout"),
    fontSize: parseInt(formData.get("fontSize") || "14", 10),
    checkboxColor: String(formData.get("checkboxColor") || "#000000"),
    errorColor: String(formData.get("errorColor") || "#dc3545"),
    logConsent: formData.get("logConsent") === "true",
    blockExpressCheckout: formData.get("blockExpressCheckout") === "true",
    fontColor: String(formData.get("fontColor") || "#333333"),
    linkColor: String(formData.get("linkColor") || "#2c6ecb"),
    linkUnderline: formData.get("linkUnderline") === "true",
  };

  const settings = await updateSettings(shop, data);
  return json({ settings, success: true });
};

export default function Settings() {
  const { settings, isPro } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showToast, setShowToast] = useState(false);

  const [form, setForm] = useState({
    enabled: settings.enabled,
    checkboxRequired: settings.checkboxRequired,
    messageText: settings.messageText,
    linkText: settings.linkText,
    linkUrl: settings.linkUrl,
    errorMessage: settings.errorMessage,
    position: settings.position,
    fontSize: settings.fontSize,
    checkboxColor: settings.checkboxColor,
    errorColor: settings.errorColor,
    logConsent: settings.logConsent,
    blockExpressCheckout: settings.blockExpressCheckout,
    fontColor: settings.fontColor ?? "#333333",
    linkColor: settings.linkColor ?? "#2c6ecb",
    linkUnderline: settings.linkUnderline ?? true,
  });

  // Show toast when save succeeds
  const prevSuccess = actionData?.success;
  if (prevSuccess && !showToast) setShowToast(true);

  const set = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    submit(fd, { method: "post" });
  }, [form, submit]);

  return (
    <Frame>
      <Page
        title="Settings"
        backAction={{ content: "Dashboard", url: "/app" }}
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          loading: isSubmitting,
        }}
      >
        {showToast && (
          <Toast
            content="Settings saved"
            onDismiss={() => setShowToast(false)}
          />
        )}

        <Layout>
          {/* Left column — form */}
          <Layout.Section>
            <BlockStack gap="500">
              {/* General */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">General</Text>
                  <Checkbox
                    label="Enable checkbox on cart page"
                    checked={form.enabled}
                    onChange={(v) => set("enabled", v)}
                  />
                  <Checkbox
                    label="Checkbox is required to proceed to checkout"
                    checked={form.checkboxRequired}
                    onChange={(v) => set("checkboxRequired", v)}
                  />
                  <Checkbox
                    label="Block express checkout buttons (PayPal, Apple Pay, Shop Pay) until agreed"
                    checked={form.blockExpressCheckout}
                    onChange={(v) => set("blockExpressCheckout", v)}
                  />
                </BlockStack>
              </Card>

              {/* Message */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Checkbox Message</Text>
                  <FormLayout>
                    <TextField
                      label="Message text"
                      value={form.messageText}
                      onChange={(v) => set("messageText", v)}
                      helpText='Text that appears before the link, e.g. "I accept the"'
                    />
                    <FormLayout.Group>
                      <TextField
                        label="Link text"
                        value={form.linkText}
                        onChange={(v) => set("linkText", v)}
                        helpText='Clickable link text, e.g. "terms and conditions"'
                      />
                      <TextField
                        label="Link URL"
                        value={form.linkUrl}
                        onChange={(v) => set("linkUrl", v)}
                        helpText="URL to your terms/policy page"
                      />
                    </FormLayout.Group>
                    <TextField
                      label="Error message"
                      value={form.errorMessage}
                      onChange={(v) => set("errorMessage", v)}
                      helpText="Shown when customer tries to checkout without agreeing"
                      multiline={2}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Appearance */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingMd">Appearance</Text>
                    {!isPro && (
                      <Button variant="plain" url="/app/upgrade" size="slim">
                        ⭐ Pro only — Upgrade
                      </Button>
                    )}
                  </InlineStack>

                  {!isPro && (
                    <Banner tone="warning">
                      Appearance customization (colors, font size, link style) is a Pro feature.
                      Position and basic settings below are available on all plans.
                    </Banner>
                  )}

                  <Select
                    label="Checkbox position"
                    options={[
                      { label: "Above checkout button", value: "above_checkout" },
                      { label: "Below checkout button", value: "below_checkout" },
                      { label: "Custom position (App Block) — Pro", value: "custom", disabled: !isPro },
                    ]}
                    value={form.position}
                    onChange={(v) => set("position", v)}
                    helpText="Where the checkbox appears relative to the checkout button."
                  />

                  <RangeSlider
                    label={`Font size: ${form.fontSize}px`}
                    value={form.fontSize}
                    min={10}
                    max={24}
                    step={1}
                    onChange={(v) => set("fontSize", v)}
                    output
                    disabled={!isPro}
                  />
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Checkbox accent color"
                        value={form.checkboxColor}
                        onChange={(v) => set("checkboxColor", v)}
                        helpText="Background & border color when checked"
                        disabled={!isPro}
                        prefix={
                          <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 3, background: form.checkboxColor, border: "1px solid #ccc" }} />
                        }
                      />
                      <TextField
                        label="Error message color"
                        value={form.errorColor}
                        onChange={(v) => set("errorColor", v)}
                        helpText="Hex color for the error text"
                        disabled={!isPro}
                        prefix={
                          <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 3, background: form.errorColor, border: "1px solid #ccc" }} />
                        }
                      />
                    </FormLayout.Group>
                    <FormLayout.Group>
                      <TextField
                        label="Font color"
                        value={form.fontColor}
                        onChange={(v) => set("fontColor", v)}
                        helpText="Color of the checkbox label text"
                        disabled={!isPro}
                        prefix={
                          <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 3, background: form.fontColor, border: "1px solid #ccc" }} />
                        }
                      />
                      <TextField
                        label="Link color"
                        value={form.linkColor}
                        onChange={(v) => set("linkColor", v)}
                        helpText="Color of the T&C hyperlink"
                        disabled={!isPro}
                        prefix={
                          <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 3, background: form.linkColor, border: "1px solid #ccc" }} />
                        }
                      />
                    </FormLayout.Group>
                    <Checkbox
                      label="Underline the T&C link"
                      checked={form.linkUnderline}
                      onChange={(v) => set("linkUnderline", v)}
                      disabled={!isPro}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Consent logging */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingMd">Consent Logging</Text>
                    {!isPro && (
                      <Button variant="plain" url="/app/upgrade" size="slim">
                        ⭐ Pro only — Upgrade
                      </Button>
                    )}
                  </InlineStack>
                  {isPro ? (
                    <>
                      <Checkbox
                        label="Log date & time when checkbox is checked"
                        checked={form.logConsent}
                        onChange={(v) => set("logConsent", v)}
                      />
                      <Banner tone="info">
                        Consent logs record the timestamp, customer info, and cart token
                        each time a customer agrees. Required for GDPR/CCPA compliance records.
                      </Banner>
                    </>
                  ) : (
                    <Banner tone="warning">
                      Consent logging is a Pro feature. Upgrade to store unlimited records
                      with IP address, user agent, and cart token capture for compliance.
                      On the Free plan, only the last 50 logs are stored.
                    </Banner>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Right column — live preview */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd">Live Preview</Text>
                  <Text tone="subdued" variant="bodySm">
                    This is how the checkbox will appear to your customers.
                  </Text>
                  <Divider />
                  <CheckboxPreview
                    messageText={form.messageText}
                    linkText={form.linkText}
                    linkUrl={form.linkUrl}
                    errorMessage={form.errorMessage}
                    fontSize={form.fontSize}
                    checkboxColor={form.checkboxColor}
                    errorColor={form.errorColor}
                    fontColor={form.fontColor}
                    linkColor={form.linkColor}
                    linkUnderline={form.linkUnderline}
                    enabled={form.enabled}
                    checkboxRequired={form.checkboxRequired}
                    showError
                  />

                  {!form.enabled && (
                    <Banner tone="warning">
                      Checkbox is currently <strong>disabled</strong>. Enable it above to show it on your store.
                    </Banner>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd">Checkout Extension</Text>
                  <Badge tone="info">Shopify Plus</Badge>
                  <Text tone="subdued" variant="bodySm">
                    Add the T&C Checkbox to the checkout page (before payment).
                    Go to Settings → Checkout → Customize, then add the "T&C
                    Checkout Checkbox" block.
                  </Text>
                  <Banner tone="info">
                    The checkout extension has its own settings configured
                    directly in the Checkout Editor. It blocks the "Pay now"
                    button until customers agree.
                  </Banner>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd">Cart Page Extension</Text>
                  <Badge tone="success">All Plans</Badge>
                  <Text tone="subdued" variant="bodySm">
                    Add the T&C Checkbox to the cart page via Theme Editor.
                    This blocks the checkout button on the cart page.
                  </Text>
                  <Button
                    url="#"
                    target="_blank"
                    fullWidth
                  >
                    Open Theme Editor
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
