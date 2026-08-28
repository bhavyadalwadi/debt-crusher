CREATE TYPE "FinancialConnectionStatus" AS ENUM ('CONNECTING', 'CURRENT', 'STALE', 'SYNCING', 'REAUTH_REQUIRED', 'ERROR', 'DISCONNECTED');
CREATE TYPE "FinancialAccountMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED');
CREATE TYPE "SyncJobReason" AS ENUM ('INITIAL', 'MANUAL', 'WEBHOOK');
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "StagedChangeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED', 'SUPERSEDED');

CREATE TABLE "AppUser" (
  "id" TEXT NOT NULL,
  "clerkUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);
INSERT INTO "AppUser" ("id", "updatedAt") VALUES ('owner', CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "AppUser_clerkUserId_key" ON "AppUser"("clerkUserId");

ALTER TABLE "Portfolio" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT 'owner';
CREATE INDEX "Portfolio_ownerId_idx" ON "Portfolio"("ownerId");
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivitySnapshot" ADD COLUMN "portfolioId" TEXT NOT NULL DEFAULT 'current';
CREATE INDEX "ActivitySnapshot_portfolioId_importedAt_idx" ON "ActivitySnapshot"("portfolioId", "importedAt");
ALTER TABLE "ActivitySnapshot" ADD CONSTRAINT "ActivitySnapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FinancialLinkSession" (
  "id" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "tokenHash" TEXT,
  "consumedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialLinkSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinancialLinkSession_tokenHash_key" ON "FinancialLinkSession"("tokenHash");
CREATE INDEX "FinancialLinkSession_portfolioId_expiresAt_idx" ON "FinancialLinkSession"("portfolioId", "expiresAt");

CREATE TABLE "FinancialConnection" (
  "id" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'PLAID',
  "providerItemId" TEXT NOT NULL,
  "institutionId" TEXT,
  "institutionName" TEXT NOT NULL,
  "consentedProducts" TEXT NOT NULL,
  "status" "FinancialConnectionStatus" NOT NULL DEFAULT 'CONNECTING',
  "tokenCiphertext" TEXT,
  "tokenIv" TEXT,
  "tokenTag" TEXT,
  "wrappedKey" TEXT,
  "wrappedKeyIv" TEXT,
  "wrappedKeyTag" TEXT,
  "tokenKeyVersion" TEXT,
  "lastAttemptedSync" TIMESTAMP(3),
  "lastSuccessfulSync" TIMESTAMP(3),
  "dataAsOf" TIMESTAMP(3),
  "errorCode" TEXT,
  "disconnectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinancialConnection_providerItemId_key" ON "FinancialConnection"("providerItemId");
CREATE INDEX "FinancialConnection_portfolioId_status_idx" ON "FinancialConnection"("portfolioId", "status");

CREATE TABLE "FinancialAccount" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "officialName" TEXT,
  "mask" TEXT,
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "matchStatus" "FinancialAccountMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
  "cashAccountId" TEXT,
  "creditCardId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinancialAccount_connectionId_providerAccountId_key" ON "FinancialAccount"("connectionId", "providerAccountId");
CREATE INDEX "FinancialAccount_connectionId_matchStatus_idx" ON "FinancialAccount"("connectionId", "matchStatus");

CREATE TABLE "SyncJob" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "reason" "SyncJobReason" NOT NULL,
  "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "errorCode" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyncJob_idempotencyKey_key" ON "SyncJob"("idempotencyKey");
CREATE INDEX "SyncJob_connectionId_createdAt_idx" ON "SyncJob"("connectionId", "createdAt");

CREATE TABLE "StagedChange" (
  "id" TEXT NOT NULL,
  "syncJobId" TEXT NOT NULL,
  "financialAccountId" TEXT NOT NULL,
  "targetEntityType" TEXT NOT NULL,
  "targetEntityId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "trustedValueJson" TEXT,
  "proposedValueJson" TEXT,
  "providerUpdatedAt" TIMESTAMP(3),
  "dataAsOf" TIMESTAMP(3) NOT NULL,
  "status" "StagedChangeStatus" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StagedChange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StagedChange_financialAccountId_status_idx" ON "StagedChange"("financialAccountId", "status");
CREATE INDEX "StagedChange_targetEntityType_targetEntityId_field_status_idx" ON "StagedChange"("targetEntityType", "targetEntityId", "field", "status");

CREATE TABLE "WebhookReceipt" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "connectionId" TEXT,
  "providerItemHash" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventCode" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL,
  "processingStatus" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebhookReceipt_fingerprint_key" ON "WebhookReceipt"("fingerprint");
CREATE INDEX "WebhookReceipt_connectionId_receivedAt_idx" ON "WebhookReceipt"("connectionId", "receivedAt");

CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "ipHash" TEXT,
  "sessionHash" TEXT,
  "metadataJson" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SecurityEvent_ownerId_occurredAt_idx" ON "SecurityEvent"("ownerId", "occurredAt");
CREATE INDEX "SecurityEvent_portfolioId_occurredAt_idx" ON "SecurityEvent"("portfolioId", "occurredAt");

CREATE TABLE "SecurityRateLimit" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT,
  "action" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityRateLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SecurityRateLimit_action_subjectHash_windowStart_key" ON "SecurityRateLimit"("action", "subjectHash", "windowStart");
CREATE INDEX "SecurityRateLimit_expiresAt_idx" ON "SecurityRateLimit"("expiresAt");

ALTER TABLE "FinancialLinkSession" ADD CONSTRAINT "FinancialLinkSession_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialConnection" ADD CONSTRAINT "FinancialConnection_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FinancialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FinancialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StagedChange" ADD CONSTRAINT "StagedChange_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StagedChange" ADD CONSTRAINT "StagedChange_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookReceipt" ADD CONSTRAINT "WebhookReceipt_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FinancialConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityRateLimit" ADD CONSTRAINT "SecurityRateLimit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
