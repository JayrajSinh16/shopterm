import db from "../db.server";

const DEFAULT_SETTINGS = {
  enabled: true,
  checkboxRequired: true,
  messageText: "I accept the",
  linkText: "terms and conditions",
  linkUrl: "/policies/terms-of-service",
  errorMessage:
    "You must agree to the terms and conditions before checking out.",
  position: "above_checkout",
  fontSize: 14,
  checkboxColor: "#000000",
  errorColor: "#dc3545",
  logConsent: true,
  blockExpressCheckout: true,
  fontColor: "#333333",
  linkColor: "#2c6ecb",
  linkUnderline: true,
};

/**
 * Get settings for a shop. Creates defaults if none exist.
 * @param {string} shop - The shop domain
 */
export async function getSettings(shop) {
  let settings = await db.appSettings.findUnique({ where: { shop } });

  if (!settings) {
    settings = await db.appSettings.create({
      data: { shop, ...DEFAULT_SETTINGS },
    });
  }

  return settings;
}

/**
 * Update (upsert) settings for a shop.
 * @param {string} shop
 * @param {object} data
 */
export async function updateSettings(shop, data) {
  return db.appSettings.upsert({
    where: { shop },
    create: { shop, ...DEFAULT_SETTINGS, ...data },
    update: data,
  });
}

/**
 * Delete settings for a shop (used on uninstall / SHOP_REDACT).
 * @param {string} shop
 */
export async function deleteSettings(shop) {
  return db.appSettings.deleteMany({ where: { shop } });
}

/**
 * Return only the fields the storefront JS needs (safe to expose publicly).
 * @param {string} shop
 */
export async function getPublicSettings(shop) {
  const s = await getSettings(shop);
  return {
    enabled: s.enabled,
    checkboxRequired: s.checkboxRequired,
    messageText: s.messageText,
    linkText: s.linkText,
    linkUrl: s.linkUrl,
    errorMessage: s.errorMessage,
    position: s.position,
    fontSize: s.fontSize,
    checkboxColor: s.checkboxColor,
    errorColor: s.errorColor,
    logConsent: s.logConsent,
    blockExpressCheckout: s.blockExpressCheckout,
    fontColor: s.fontColor,
    linkColor: s.linkColor,
    linkUnderline: s.linkUnderline,
  };
}
