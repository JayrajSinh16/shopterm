-- CreateTable: Shopify session storage (required by shopify-app-remix)
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Per-store app configuration
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
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
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Consent records
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT,
    "cartToken" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "pageUrl" TEXT,
    "checkboxVersion" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");

-- CreateIndex
CREATE INDEX "ConsentLog_shop_idx" ON "ConsentLog"("shop");

-- CreateIndex
CREATE INDEX "ConsentLog_shop_timestamp_idx" ON "ConsentLog"("shop", "timestamp");

-- CreateIndex
CREATE INDEX "ConsentLog_shop_customerEmail_idx" ON "ConsentLog"("shop", "customerEmail");
