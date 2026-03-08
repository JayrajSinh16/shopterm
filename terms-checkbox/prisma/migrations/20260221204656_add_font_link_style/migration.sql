-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "checkboxRequired" BOOLEAN NOT NULL DEFAULT true,
    "messageText" TEXT NOT NULL DEFAULT 'I accept the',
    "linkText" TEXT NOT NULL DEFAULT 'terms and conditions',
    "linkUrl" TEXT NOT NULL DEFAULT '/policies/terms-of-service',
    "errorMessage" TEXT NOT NULL DEFAULT 'You must agree to the terms and conditions before checking out.',
    "position" TEXT NOT NULL DEFAULT 'above_checkout',
    "fontSize" INTEGER NOT NULL DEFAULT 14,
    "checkboxColor" TEXT NOT NULL DEFAULT '#000000',
    "errorColor" TEXT NOT NULL DEFAULT '#dc3545',
    "logConsent" BOOLEAN NOT NULL DEFAULT true,
    "blockExpressCheckout" BOOLEAN NOT NULL DEFAULT true,
    "fontColor" TEXT NOT NULL DEFAULT '#333333',
    "linkColor" TEXT NOT NULL DEFAULT '#2c6ecb',
    "linkUnderline" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("blockExpressCheckout", "checkboxColor", "checkboxRequired", "createdAt", "enabled", "errorColor", "errorMessage", "fontSize", "id", "linkText", "linkUrl", "logConsent", "messageText", "position", "shop", "updatedAt") SELECT "blockExpressCheckout", "checkboxColor", "checkboxRequired", "createdAt", "enabled", "errorColor", "errorMessage", "fontSize", "id", "linkText", "linkUrl", "logConsent", "messageText", "position", "shop", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
