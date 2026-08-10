CREATE TABLE "FinancialReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reviewMonth" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "snapshotId" TEXT,
    CONSTRAINT "FinancialReview_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancialReview_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ActivitySnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "FinancialReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "asOfDate" DATETIME,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "warningsJson" TEXT,
    "reviewedAt" DATETIME,
    CONSTRAINT "FinancialReviewItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "FinancialReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FinancialReview_snapshotId_key" ON "FinancialReview"("snapshotId");
CREATE UNIQUE INDEX "FinancialReview_portfolioId_type_reviewMonth_key" ON "FinancialReview"("portfolioId", "type", "reviewMonth");
CREATE INDEX "FinancialReview_portfolioId_status_idx" ON "FinancialReview"("portfolioId", "status");
CREATE UNIQUE INDEX "FinancialReviewItem_reviewId_entityType_entityId_key" ON "FinancialReviewItem"("reviewId", "entityType", "entityId");
CREATE INDEX "FinancialReviewItem_entityType_entityId_reviewedAt_idx" ON "FinancialReviewItem"("entityType", "entityId", "reviewedAt");
