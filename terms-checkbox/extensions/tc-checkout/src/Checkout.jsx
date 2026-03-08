import { useState, useCallback, useRef } from "react";
import {
  reactExtension,
  useSettings,
  useBuyerJourneyIntercept,
  useApplyAttributeChange,
  useSessionToken,
  useShop,
  Checkbox,
  Link,
  Text,
  BlockStack,
  InlineStack,
  Banner,
} from "@shopify/ui-extensions-react/checkout";

export default reactExtension(
  "purchase.checkout.block.render",
  () => <TermsCheckbox />
);

const VALID_SIZES = ["extraSmall", "small", "medium", "large", "extraLarge"];
const VALID_APPEARANCES = ["subdued", "accent", "info", "success", "warning", "critical"];

function TermsCheckbox() {
  const [checked, setChecked] = useState(false);
  const [validationError, setValidationError] = useState("");
  const checkedRef = useRef(false);
  const applyAttributeChange = useApplyAttributeChange();
  const getSessionToken = useSessionToken();
  const shop = useShop();

  const {
    message_text,
    link_text,
    link_url,
    error_message,
    required,
    font_size,
    font_appearance,
    link_appearance,
  } = useSettings();

  const messageText = message_text || "I agree to the";
  const linkText = link_text || "terms and conditions";
  const linkUrl = link_url || "/policies/terms-of-service";
  const errorMsg =
    error_message ||
    "You must agree to the terms and conditions before completing your purchase.";

  const isRequired = required !== false && required !== "false";

  const size = VALID_SIZES.includes(font_size) ? font_size : "small";
  const textAppearance = VALID_APPEARANCES.includes(font_appearance) ? font_appearance : undefined;
  const linkStyle = link_appearance === "monochrome" ? "monochrome" : undefined;

  const isRequiredRef = useRef(isRequired);
  isRequiredRef.current = isRequired;
  const errorMsgRef = useRef(errorMsg);
  errorMsgRef.current = errorMsg;

  // Block checkout and show error banner below the checkbox
  useBuyerJourneyIntercept(() => {
    if (isRequiredRef.current && !checkedRef.current) {
      setValidationError(errorMsgRef.current);

      return {
        behavior: "block",
        reason: "Terms and conditions not accepted",
      };
    }

    return { behavior: "allow" };
  });

  const handleChange = useCallback(
    async (newChecked) => {
      setChecked(newChecked);
      checkedRef.current = newChecked;

      // Clear error when checkbox is checked
      if (newChecked) {
        setValidationError("");
      }

      try {
        await applyAttributeChange({
          type: "updateAttribute",
          key: "terms_accepted",
          value: newChecked ? "yes" : "no",
        });
        if (newChecked) {
          await applyAttributeChange({
            type: "updateAttribute",
            key: "terms_accepted_at",
            value: new Date().toISOString(),
          });
        }
      } catch (e) {
        // Non-critical
      }

      if (newChecked) {
        logConsent();
      }
    },
    [applyAttributeChange]
  );

  async function logConsent() {
    try {
      const token = await getSessionToken();
      const shopDomain = shop.myshopifyDomain;
      const proxyUrl = `https://${shopDomain}/apps/tc-consent`;

      await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shop: shopDomain,
          consentGiven: true,
          pageUrl: "checkout",
          checkboxVersion: `${messageText} ${linkText}`,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      // Non-critical
    }
  }

  return (
    <BlockStack spacing="tight">
      <Checkbox checked={checked} onChange={handleChange}>
        <InlineStack spacing="extraTight" blockAlignment="center">
          <Text size={size} appearance={textAppearance}>
            {messageText}
          </Text>
          <Link to={linkUrl} external appearance={linkStyle}>
            <Text size={size} appearance={textAppearance}>
              {linkText}
            </Text>
          </Link>
        </InlineStack>
      </Checkbox>
      {validationError && (
        <Banner status="critical" title={validationError} />
      )}
    </BlockStack>
  );
}
