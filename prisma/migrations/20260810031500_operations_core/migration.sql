-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extraPaymentBudget" REAL NOT NULL,
    "promoEndSoonDays" INTEGER NOT NULL,
    "globalCashBufferOverride" REAL,
    "payoffStrategy" TEXT NOT NULL DEFAULT 'avalanche',
    "customStrategyJson" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CreditAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "currentBalance" REAL NOT NULL,
    "creditLimit" REAL,
    "aprPercent" REAL NOT NULL,
    "promoFlag" BOOLEAN NOT NULL,
    "promoEndDate" DATETIME,
    "minPayment" REAL NOT NULL,
    "interestFeesThisMonth" REAL NOT NULL,
    "autoPayment" TEXT,
    "paymentDue" DATETIME,
    "howAreWeTakingCareOfIt" TEXT NOT NULL,
    "rewardsAvailable" TEXT,
    "pointsAvailable" REAL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "CreditAccount_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentBalance" REAL NOT NULL,
    "minDayEndBalanceRequired" REAL NOT NULL,
    "position" INTEGER NOT NULL,
    "institutionId" TEXT,
    "nickname" TEXT,
    "lastFour" TEXT,
    "targetBalance" DECIMAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "balanceAsOf" DATETIME,
    "balanceSource" TEXT,
    CONSTRAINT "CashAccount_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashAccount_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "FinancialInstitution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialInstitution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialInstitution_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "institutionId" TEXT,
    "issuerName" TEXT NOT NULL,
    "product" TEXT,
    "brand" TEXT,
    "nickname" TEXT NOT NULL,
    "lastFour" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentBalance" DECIMAL NOT NULL DEFAULT 0,
    "statementBalance" DECIMAL,
    "minimumPaymentDue" DECIMAL,
    "creditLimit" DECIMAL,
    "purchaseApr" DECIMAL NOT NULL DEFAULT 0,
    "statementClosingDay" INTEGER,
    "paymentDueDay" INTEGER,
    "balanceAsOf" DATETIME,
    "balanceSource" TEXT,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreditCard_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreditCard_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "FinancialInstitution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutopayRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditCardId" TEXT NOT NULL,
    "fundingAccountId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "executionDay" INTEGER,
    "executionOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "fixedAmount" DECIMAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutopayRule_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutopayRule_fundingAccountId_fkey" FOREIGN KEY ("fundingAccountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromotionalOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditCardId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "promotionalApr" DECIMAL,
    "standardAprAfterPromo" DECIMAL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "originalPromoBalance" DECIMAL,
    "currentPromoBalance" DECIMAL,
    "balanceTransferFee" DECIMAL,
    "deferredInterest" BOOLEAN NOT NULL DEFAULT false,
    "targetPayoffDate" DATETIME,
    "safetyBufferDays" INTEGER NOT NULL DEFAULT 14,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromotionalOffer_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "sourceAccountId" TEXT,
    "destinationAccountId" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTransaction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransaction_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpectedPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "autopayRuleId" TEXT,
    "fundingAccountId" TEXT,
    "dueDate" DATETIME NOT NULL,
    "executionDate" DATETIME NOT NULL,
    "amount" DECIMAL,
    "unknownReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EXPECTED',
    "occurrenceKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpectedPayment_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpectedPayment_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpectedPayment_autopayRuleId_fkey" FOREIGN KEY ("autopayRuleId") REFERENCES "AutopayRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExpectedPayment_fundingAccountId_fkey" FOREIGN KEY ("fundingAccountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "source" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL,
    "setupJson" TEXT NOT NULL,
    "creditAccountsJson" TEXT NOT NULL,
    "cashAccountsJson" TEXT NOT NULL,
    "dashboardSummaryJson" TEXT NOT NULL,
    "changeDetailJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScreenshotImportArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "imageData" BLOB NOT NULL,
    "extractedText" TEXT NOT NULL,
    "extractionJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScreenshotImportArtifact_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ActivitySnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "amountDelta" REAL,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityEvent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ActivitySnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CreditAccount_portfolioId_position_idx" ON "CreditAccount"("portfolioId", "position");

-- CreateIndex
CREATE INDEX "CashAccount_portfolioId_position_idx" ON "CashAccount"("portfolioId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInstitution_portfolioId_canonicalName_key" ON "FinancialInstitution"("portfolioId", "canonicalName");

-- CreateIndex
CREATE INDEX "CreditCard_portfolioId_position_idx" ON "CreditCard"("portfolioId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AutopayRule_creditCardId_key" ON "AutopayRule"("creditCardId");

-- CreateIndex
CREATE INDEX "PromotionalOffer_creditCardId_endDate_idx" ON "PromotionalOffer"("creditCardId", "endDate");

-- CreateIndex
CREATE INDEX "RecurringTransaction_portfolioId_dayOfMonth_idx" ON "RecurringTransaction"("portfolioId", "dayOfMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ExpectedPayment_occurrenceKey_key" ON "ExpectedPayment"("occurrenceKey");

-- CreateIndex
CREATE INDEX "ExpectedPayment_portfolioId_executionDate_idx" ON "ExpectedPayment"("portfolioId", "executionDate");

-- CreateIndex
CREATE INDEX "AuditLog_portfolioId_occurredAt_idx" ON "AuditLog"("portfolioId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivitySnapshot_importedAt_idx" ON "ActivitySnapshot"("importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenshotImportArtifact_snapshotId_key" ON "ScreenshotImportArtifact"("snapshotId");

-- CreateIndex
CREATE INDEX "ScreenshotImportArtifact_createdAt_idx" ON "ScreenshotImportArtifact"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_occurredAt_idx" ON "ActivityEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_snapshotId_idx" ON "ActivityEvent"("snapshotId");
