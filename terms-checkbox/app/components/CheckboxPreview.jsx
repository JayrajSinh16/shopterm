/**
 * CheckboxPreview
 *
 * A live preview component that renders the checkbox exactly as it will
 * appear on the storefront, based on the current settings form state.
 */
import { useState } from "react";

export function CheckboxPreview({
  messageText = "I accept the",
  linkText = "terms and conditions",
  linkUrl = "/policies/terms-of-service",
  errorMessage = "You must agree to the terms and conditions before checking out.",
  fontSize = 14,
  checkboxColor = "#000000",
  errorColor = "#dc3545",
  fontColor = "#333333",
  linkColor = "#2c6ecb",
  linkUnderline = true,
  enabled = true,
  checkboxRequired = true,
  showError = true,
}) {
  const [checked, setChecked] = useState(false);
  const isBlocked = checkboxRequired && !checked;

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #e1e1e1",
        borderRadius: "8px",
        background: "#fff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        opacity: enabled ? 1 : 0.5,
      }}
    >
      {/* Checkbox label */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          fontSize,
          marginBottom: 12,
          cursor: "pointer",
        }}
        onClick={() => setChecked((c) => !c)}
      >
        {/* Custom checkbox visual */}
        <div
          style={{
            flexShrink: 0,
            width: 20,
            height: 20,
            border: `2px solid ${checked ? checkboxColor : "#aaa"}`,
            borderRadius: 4,
            background: checked ? checkboxColor : "#fff",
            marginTop: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {checked && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path
                d="M1 5L4.5 8.5L11 1"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <span style={{ color: fontColor, lineHeight: 1.4 }}>
          {messageText}{" "}
          <a
            href={linkUrl}
            style={{ color: linkColor, textDecoration: linkUnderline ? "underline" : "none" }}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {linkText}
          </a>
        </span>
      </div>

      {/* Simulated checkout button */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          textAlign: "center",
          padding: "12px 16px",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 500,
          opacity: isBlocked ? 0.5 : 1,
          cursor: isBlocked ? "not-allowed" : "pointer",
          marginBottom: 8,
          transition: "opacity 0.2s",
        }}
      >
        Check out
      </div>

      {/* Error message — only shown when required and unchecked */}
      {showError && isBlocked && (
        <div
          style={{
            color: errorColor,
            fontSize: 13,
            padding: "8px 12px",
            background: "#fff5f5",
            borderRadius: 4,
            border: `1px solid ${errorColor}33`,
          }}
        >
          ⚠ {errorMessage}
        </div>
      )}
    </div>
  );
}
