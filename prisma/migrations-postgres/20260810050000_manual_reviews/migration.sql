CREATE TYPE "FinancialReviewType" AS ENUM ('SETUP', 'MONTHLY');
CREATE TYPE "FinancialReviewStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');
CREATE TYPE "FinancialReviewItemStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UPDATED', 'SKIPPED', 'UNKNOWN');

CREATE TABLE "FinancialReview" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "type" "FinancialReviewType" NOT NULL,
    "reviewMonth" TEXT NOT NULL,
    "status" "FinancialReviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "snapshotId" TEXT,
    CONSTRAINT "FinancialReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialReviewItem" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "status" "FinancialReviewItemStatus" NOT NULL DEFAULT 'PENDING',
    "asOfDate" TIMESTAMP(3),
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "warningsJson" TEXT,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "FinancialReviewItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialReview_snapshotId_key" ON "FinancialReview"("snapshotId");
CREATE UNIQUE INDEX "FinancialReview_portfolioId_type_reviewMonth_key" ON "FinancialReview"("portfolioId", "type", "reviewMonth");
CREATE INDEX "FinancialReview_portfolioId_status_idx" ON "FinancialReview"("portfolioId", "status");
CREATE UNIQUE INDEX "FinancialReviewItem_reviewId_entityType_entityId_key" ON "FinancialReviewItem"("reviewId", "entityType", "entityId");
CREATE INDEX "FinancialReviewItem_entityType_entityId_reviewedAt_idx" ON "FinancialReviewItem"("entityType", "entityId", "reviewedAt");
ALTER TABLE "FinancialReview" ADD CONSTRAINT "FinancialReview_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialReview" ADD CONSTRAINT "FinancialReview_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ActivitySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialReviewItem" ADD CONSTRAINT "FinancialReviewItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "FinancialReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
