-- Add a local owner before adding owner foreign keys to existing records.
CREATE TABLE "AppUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clerkUserId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
INSERT INTO "AppUser" ("id", "updatedAt") VALUES ('owner', CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "AppUser_clerkUserId_key" ON "AppUser"("clerkUserId");

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Portfolio" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL DEFAULT 'owner',
  "extraPaymentBudget" REAL NOT NULL,
  "promoEndSoonDays" INTEGER NOT NULL,
  "globalCashBufferOverride" REAL,
  "payoffStrategy" TEXT NOT NULL DEFAULT 'avalanche',
  "customStrategyJson" TEXT,
  "updatedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Portfolio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Portfolio" ("createdAt", "customStrategyJson", "extraPaymentBudget", "globalCashBufferOverride", "id", "payoffStrategy", "promoEndSoonDays", "updatedAt")
SELECT "createdAt", "customStrategyJson", "extraPaymentBudget", "globalCashBufferOverride", "id", "payoffStrategy", "promoEndSoonDays", "updatedAt" FROM "Portfolio";
DROP TABLE "Portfolio";
ALTER TABLE "new_Portfolio" RENAME TO "Portfolio";
CREATE INDEX "Portfolio_ownerId_idx" ON "Portfolio"("ownerId");

CREATE TABLE "new_ActivitySnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "portfolioId" TEXT NOT NULL DEFAULT 'current',
  "source" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "importedAt" DATETIME NOT NULL,
  "setupJson" TEXT NOT NULL,
  "creditAccountsJson" TEXT NOT NULL,
  "cashAccountsJson" TEXT NOT NULL,
  "dashboardSummaryJson" TEXT NOT NULL,
  "changeDetailJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivitySnapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivitySnapshot" ("cashAccountsJson", "changeDetailJson", "createdAt", "creditAccountsJson", "dashboardSummaryJson", "filename", "id", "importedAt", "label", "setupJson", "source")
SELECT "cashAccountsJson", "changeDetailJson", "createdAt", "creditAccountsJson", "dashboardSummaryJson", "filename", "id", "importedAt", "label", "setupJson", "source" FROM "ActivitySnapshot";
DROP TABLE "ActivitySnapshot";
ALTER TABLE "new_ActivitySnapshot" RENAME TO "ActivitySnapshot";
CREATE INDEX "ActivitySnapshot_portfolioId_importedAt_idx" ON "ActivitySnapshot"("portfolioId", "importedAt");
CREATE INDEX "ActivitySnapshot_importedAt_idx" ON "ActivitySnapshot"("importedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE TABLE "FinancialLinkSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "portfolioId" TEXT NOT NULL,
  "tokenHash" TEXT,
  "consumedAt" DATETIME,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialLinkSession_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialLinkSession_tokenHash_key" ON "FinancialLinkSession"("tokenHash");
CREATE INDEX "FinancialLinkSession_portfolioId_expiresAt_idx" ON "FinancialLinkSession"("portfolioId", "expiresAt");

CREATE TABLE "FinancialConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "portfolioId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'PLAID',
  "providerItemId" TEXT NOT NULL,
  "institutionId" TEXT,
  "institutionName" TEXT NOT NULL,
  "consentedProducts" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONNECTING',
  "tokenCiphertext" TEXT,
  "tokenIv" TEXT,
  "tokenTag" TEXT,
  "wrappedKey" TEXT,
  "wrappedKeyIv" TEXT,
  "wrappedKeyTag" TEXT,
  "tokenKeyVersion" TEXT,
  "lastAttemptedSync" DATETIME,
  "lastSuccessfulSync" DATETIME,
  "dataAsOf" DATETIME,
  "errorCode" TEXT,
  "disconnectedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FinancialConnection_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialConnection_providerItemId_key" ON "FinancialConnection"("providerItemId");
CREATE INDEX "FinancialConnection_portfolioId_status_idx" ON "FinancialConnection"("portfolioId", "status");

CREATE TABLE "FinancialAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "officialName" TEXT,
  "mask" TEXT,
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "matchStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
  "cashAccountId" TEXT,
  "creditCardId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FinancialAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FinancialConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FinancialAccount_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FinancialAccount_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "FinancialAccount_connectionId_matchStatus_idx" ON "FinancialAccount"("connectionId", "matchStatus");
CREATE UNIQUE INDEX "FinancialAccount_connectionId_providerAccountId_key" ON "FinancialAccount"("connectionId", "providerAccountId");

CREATE TABLE "SyncJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "errorCode" TEXT,
  "startedAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FinancialConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SyncJob_idempotencyKey_key" ON "SyncJob"("idempotencyKey");
CREATE INDEX "SyncJob_connectionId_createdAt_idx" ON "SyncJob"("connectionId", "createdAt");

CREATE TABLE "StagedChange" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "syncJobId" TEXT NOT NULL,
  "financialAccountId" TEXT NOT NULL,
  "targetEntityType" TEXT NOT NULL,
  "targetEntityId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "trustedValueJson" TEXT,
  "proposedValueJson" TEXT,
  "providerUpdatedAt" DATETIME,
  "dataAsOf" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "decidedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StagedChange_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StagedChange_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StagedChange_financialAccountId_status_idx" ON "StagedChange"("financialAccountId", "status");
CREATE INDEX "StagedChange_targetEntityType_targetEntityId_field_status_idx" ON "StagedChange"("targetEntityType", "targetEntityId", "field", "status");

CREATE TABLE "WebhookReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fingerprint" TEXT NOT NULL,
  "connectionId" TEXT,
  "providerItemHash" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventCode" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL,
  "processingStatus" TEXT NOT NULL,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" DATETIME,
  CONSTRAINT "WebhookReceipt_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FinancialConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WebhookReceipt_fingerprint_key" ON "WebhookReceipt"("fingerprint");
CREATE INDEX "WebhookReceipt_connectionId_receivedAt_idx" ON "WebhookReceipt"("connectionId", "receivedAt");

CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "ipHash" TEXT,
  "sessionHash" TEXT,
  "metadataJson" TEXT,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SecurityEvent_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SecurityEvent_ownerId_occurredAt_idx" ON "SecurityEvent"("ownerId", "occurredAt");
CREATE INDEX "SecurityEvent_portfolioId_occurredAt_idx" ON "SecurityEvent"("portfolioId", "occurredAt");

CREATE TABLE "SecurityRateLimit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT,
  "action" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "windowStart" DATETIME NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" DATETIME NOT NULL,
  CONSTRAINT "SecurityRateLimit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SecurityRateLimit_expiresAt_idx" ON "SecurityRateLimit"("expiresAt");
CREATE UNIQUE INDEX "SecurityRateLimit_action_subjectHash_windowStart_key" ON "SecurityRateLimit"("action", "subjectHash", "windowStart");
