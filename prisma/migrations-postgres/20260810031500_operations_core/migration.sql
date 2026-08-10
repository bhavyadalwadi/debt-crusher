-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CashAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'MONEY_MARKET', 'OTHER');

-- CreateEnum
CREATE TYPE "CreditCardStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'CLOSED', 'TRANSFERRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AutopayMode" AS ENUM ('STATEMENT_BALANCE', 'MINIMUM_PAYMENT', 'FIXED_AMOUNT', 'PROMO_TARGET', 'CUSTOM', 'DISABLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PromoType" AS ENUM ('BALANCE_TRANSFER', 'PURCHASE_PROMO', 'APR_PROMO', 'DEFERRED_INTEREST', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RecurringTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'DEBT_PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('EXPECTED', 'SCHEDULED', 'POSTED', 'CLEARED', 'FAILED', 'CANCELLED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "PromoRiskStatus" AS ENUM ('SAFE', 'WATCH', 'AT_RISK', 'URGENT', 'EXPIRED', 'PAID_OFF', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "extraPaymentBudget" DOUBLE PRECISION NOT NULL,
    "promoEndSoonDays" INTEGER NOT NULL,
    "globalCashBufferOverride" DOUBLE PRECISION,
    "payoffStrategy" TEXT NOT NULL DEFAULT 'avalanche',
    "customStrategyJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAccount" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "creditLimit" DOUBLE PRECISION,
    "aprPercent" DOUBLE PRECISION NOT NULL,
    "promoFlag" BOOLEAN NOT NULL,
    "promoEndDate" TIMESTAMP(3),
    "minPayment" DOUBLE PRECISION NOT NULL,
    "interestFeesThisMonth" DOUBLE PRECISION NOT NULL,
    "autoPayment" TEXT,
    "paymentDue" TIMESTAMP(3),
    "howAreWeTakingCareOfIt" TEXT NOT NULL,
    "rewardsAvailable" TEXT,
    "pointsAvailable" DOUBLE PRECISION,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "minDayEndBalanceRequired" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL,
    "institutionId" TEXT,
    "nickname" TEXT,
    "lastFour" TEXT,
    "targetBalance" DECIMAL(65,30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "balanceAsOf" TIMESTAMP(3),
    "balanceSource" TEXT,

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialInstitution" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "institutionId" TEXT,
    "issuerName" TEXT NOT NULL,
    "product" TEXT,
    "brand" TEXT,
    "nickname" TEXT NOT NULL,
    "lastFour" TEXT,
    "status" "CreditCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "statementBalance" DECIMAL(65,30),
    "minimumPaymentDue" DECIMAL(65,30),
    "creditLimit" DECIMAL(65,30),
    "purchaseApr" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "statementClosingDay" INTEGER,
    "paymentDueDay" INTEGER,
    "balanceAsOf" TIMESTAMP(3),
    "balanceSource" TEXT,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopayRule" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "fundingAccountId" TEXT,
    "mode" "AutopayMode" NOT NULL DEFAULT 'UNKNOWN',
    "executionDay" INTEGER,
    "executionOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "fixedAmount" DECIMAL(65,30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutopayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionalOffer" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "type" "PromoType" NOT NULL DEFAULT 'UNKNOWN',
    "promotionalApr" DECIMAL(65,30),
    "standardAprAfterPromo" DECIMAL(65,30),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "originalPromoBalance" DECIMAL(65,30),
    "currentPromoBalance" DECIMAL(65,30),
    "balanceTransferFee" DECIMAL(65,30),
    "deferredInterest" BOOLEAN NOT NULL DEFAULT false,
    "targetPayoffDate" TIMESTAMP(3),
    "safetyBufferDays" INTEGER NOT NULL DEFAULT 14,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionalOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RecurringTransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "sourceAccountId" TEXT,
    "destinationAccountId" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpectedPayment" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "autopayRuleId" TEXT,
    "fundingAccountId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "executionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30),
    "unknownReason" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'EXPECTED',
    "occurrenceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpectedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL,
    "setupJson" TEXT NOT NULL,
    "creditAccountsJson" TEXT NOT NULL,
    "cashAccountsJson" TEXT NOT NULL,
    "dashboardSummaryJson" TEXT NOT NULL,
    "changeDetailJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenshotImportArtifact" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "imageData" BYTEA NOT NULL,
    "extractedText" TEXT NOT NULL,
    "extractionJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenshotImportArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "amountDelta" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "FinancialInstitution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInstitution" ADD CONSTRAINT "FinancialInstitution_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "FinancialInstitution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopayRule" ADD CONSTRAINT "AutopayRule_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopayRule" ADD CONSTRAINT "AutopayRule_fundingAccountId_fkey" FOREIGN KEY ("fundingAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionalOffer" ADD CONSTRAINT "PromotionalOffer_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_autopayRuleId_fkey" FOREIGN KEY ("autopayRuleId") REFERENCES "AutopayRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_fundingAccountId_fkey" FOREIGN KEY ("fundingAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotImportArtifact" ADD CONSTRAINT "ScreenshotImportArtifact_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ActivitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ActivitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
