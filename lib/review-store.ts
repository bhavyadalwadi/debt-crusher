import { prisma } from "@/lib/prisma";
import { CURRENT_PORTFOLIO_ID, buildActivitySnapshot, createEmptyPortfolio } from "@/lib/portfolio";
import { activitySnapshotToDb, dbRowToPortfolioState, portfolioStateToDb } from "@/lib/persistence";

export type ReviewKind = "SETUP" | "MONTHLY";
export type ReviewItemStatus = "PENDING" | "CONFIRMED" | "UPDATED" | "SKIPPED" | "UNKNOWN";

export function currentReviewMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

async function ensurePortfolio() {
  const empty = createEmptyPortfolio();
  await prisma.portfolio.upsert({
    where: { id: CURRENT_PORTFOLIO_ID },
    create: portfolioStateToDb(empty),
    update: {},
  });
}

function warningsFor(entityType: string, value: Record<string, unknown>) {
  const warnings: string[] = [];
  if (!value.balanceAsOf) warnings.push("Balance as-of date is missing.");
  if (entityType === "credit_card") {
    if (value.statementBalance == null) warnings.push("Statement balance is unknown.");
    if (value.minimumPaymentDue == null) warnings.push("Minimum payment is unknown.");
    if (value.paymentDueDay == null) warnings.push("Payment due day is unknown.");
    if (!value.autopayRule) warnings.push("Autopay has not been confirmed.");
  }
  return warnings;
}

export async function startOrResumeReview(type: ReviewKind, reviewMonth = type === "SETUP" ? "setup" : currentReviewMonth()) {
  await ensurePortfolio();
  return prisma.$transaction(async (tx) => {
    const review = await tx.financialReview.upsert({
      where: { portfolioId_type_reviewMonth: { portfolioId: CURRENT_PORTFOLIO_ID, type, reviewMonth } },
      create: { portfolioId: CURRENT_PORTFOLIO_ID, type, reviewMonth },
      update: {},
    });
    const [cash, cards, recurring] = await Promise.all([
      tx.cashAccount.findMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, active: true } }),
      tx.creditCard.findMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, status: { not: "CLOSED" } }, include: { autopayRule: true } }),
      tx.recurringTransaction.findMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, active: true } }),
    ]);
    const entities = [
      ...cash.map((item) => ({ entityType: "cash_account", entityId: item.id, entityName: item.nickname ?? item.accountName, before: item, warnings: warningsFor("cash_account", item as unknown as Record<string, unknown>) })),
      ...cards.map((item) => ({ entityType: "credit_card", entityId: item.id, entityName: item.nickname, before: item, warnings: warningsFor("credit_card", item as unknown as Record<string, unknown>) })),
      ...recurring.map((item) => ({ entityType: "recurring_transaction", entityId: item.id, entityName: item.name, before: item, warnings: [] })),
    ];
    for (const entity of entities) {
      await tx.financialReviewItem.upsert({
        where: { reviewId_entityType_entityId: { reviewId: review.id, entityType: entity.entityType, entityId: entity.entityId } },
        create: { reviewId: review.id, entityType: entity.entityType, entityId: entity.entityId, entityName: entity.entityName, beforeJson: JSON.stringify(entity.before), warningsJson: JSON.stringify(entity.warnings) },
        update: { entityName: entity.entityName },
      });
    }
    return review;
  }).then((review) => getReviewState(review.id));
}

export async function getReviewState(reviewId?: string) {
  const month = currentReviewMonth();
  const [review, completedThisMonth, lastCompleted, cashCount, cardCount] = await Promise.all([
    reviewId
      ? prisma.financialReview.findFirst({ where: { id: reviewId, portfolioId: CURRENT_PORTFOLIO_ID }, include: { items: { orderBy: [{ entityType: "asc" }, { entityName: "asc" }] } } })
      : prisma.financialReview.findFirst({ where: { portfolioId: CURRENT_PORTFOLIO_ID, status: "IN_PROGRESS" }, orderBy: { startedAt: "desc" }, include: { items: { orderBy: [{ entityType: "asc" }, { entityName: "asc" }] } } }),
    prisma.financialReview.findUnique({ where: { portfolioId_type_reviewMonth: { portfolioId: CURRENT_PORTFOLIO_ID, type: "MONTHLY", reviewMonth: month } } }),
    prisma.financialReview.findFirst({ where: { portfolioId: CURRENT_PORTFOLIO_ID, status: "COMPLETED" }, orderBy: { completedAt: "desc" } }),
    prisma.cashAccount.count({ where: { portfolioId: CURRENT_PORTFOLIO_ID, active: true } }),
    prisma.creditCard.count({ where: { portfolioId: CURRENT_PORTFOLIO_ID, status: { not: "CLOSED" } } }),
  ]);
  const items = review?.items.map((item) => ({ ...item, warnings: item.warningsJson ? JSON.parse(item.warningsJson) as string[] : [], before: item.beforeJson ? JSON.parse(item.beforeJson) : null, after: item.afterJson ? JSON.parse(item.afterJson) : null })) ?? [];
  const reviewed = items.filter((item) => item.status !== "PENDING").length;
  return {
    review: review ? { id: review.id, type: review.type, reviewMonth: review.reviewMonth, status: review.status, currentStep: review.currentStep, warningCount: review.warningCount, startedAt: review.startedAt.toISOString(), completedAt: review.completedAt?.toISOString() ?? null, items } : null,
    progress: { reviewed, total: items.length, percent: items.length ? Math.round((reviewed / items.length) * 100) : 0 },
    setupNeeded: cashCount === 0 || cardCount === 0,
    monthlyReviewDue: completedThisMonth?.status !== "COMPLETED" && cashCount + cardCount > 0,
    lastCompletedAt: lastCompleted?.completedAt?.toISOString() ?? null,
  };
}

export async function saveReviewItem(args: { reviewId: string; entityType: string; entityId: string; status: ReviewItemStatus; asOfDate?: string | null; after?: unknown; warnings?: string[] }) {
  const item = await prisma.financialReviewItem.findFirst({
    where: { reviewId: args.reviewId, entityType: args.entityType, entityId: args.entityId, review: { portfolioId: CURRENT_PORTFOLIO_ID } },
  });
  if (!item) throw new Error("Review item not found.");
  return prisma.financialReviewItem.update({
    where: { id: item.id },
    data: { status: args.status, asOfDate: args.asOfDate ? new Date(args.asOfDate) : null, afterJson: args.after === undefined ? undefined : JSON.stringify(args.after), warningsJson: args.warnings ? JSON.stringify(args.warnings) : undefined, reviewedAt: new Date() },
  });
}

export async function saveReviewStep(reviewId: string, currentStep: number) {
  const updated = await prisma.financialReview.updateMany({ where: { id: reviewId, portfolioId: CURRENT_PORTFOLIO_ID }, data: { currentStep } });
  if (updated.count !== 1) throw new Error("Review not found.");
  return updated;
}

export async function completeReview(reviewId: string) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.financialReview.findFirstOrThrow({ where: { id: reviewId, portfolioId: CURRENT_PORTFOLIO_ID }, include: { items: true } });
    if (review.status === "COMPLETED") return review;
    for (const item of review.items.filter((value) => value.status === "PENDING")) {
      const warnings = item.warningsJson ? JSON.parse(item.warningsJson) as string[] : [];
      if (!warnings.includes("Not reviewed during this cycle.")) warnings.push("Not reviewed during this cycle.");
      await tx.financialReviewItem.update({ where: { id: item.id }, data: { status: "UNKNOWN", warningsJson: JSON.stringify(warnings), reviewedAt: new Date() } });
      item.warningsJson = JSON.stringify(warnings);
    }
    const portfolio = await tx.portfolio.findUniqueOrThrow({ where: { id: CURRENT_PORTFOLIO_ID }, include: { creditAccounts: true, cashAccounts: { where: { active: true } } } });
    const state = dbRowToPortfolioState({ portfolio, creditAccounts: portfolio.creditAccounts, cashAccounts: portfolio.cashAccounts });
    const snapshot = buildActivitySnapshot(state, "manual_save", { label: review.type === "SETUP" ? "Initial manual setup" : `Monthly review ${review.reviewMonth}` });
    await tx.activitySnapshot.create({ data: { ...activitySnapshotToDb(snapshot), portfolioId: CURRENT_PORTFOLIO_ID } });
    const warningCount = review.items.reduce((sum, item) => sum + (item.warningsJson ? (JSON.parse(item.warningsJson) as unknown[]).length : 0), 0);
    const completed = await tx.financialReview.update({ where: { id: reviewId }, data: { status: "COMPLETED", completedAt: new Date(), warningCount, snapshotId: snapshot.id, currentStep: 6 } });
    await tx.auditLog.createMany({ data: review.items.map((item) => ({ portfolioId: CURRENT_PORTFOLIO_ID, entityType: item.entityType, entityId: item.entityId, action: `REVIEW_${item.status === "PENDING" ? "UNKNOWN" : item.status}`, beforeJson: item.beforeJson, afterJson: item.afterJson, source: "manual_review" })) });
    await tx.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "financial_review", entityId: reviewId, action: "COMPLETE", afterJson: JSON.stringify({ type: review.type, reviewMonth: review.reviewMonth, warningCount }), source: "manual_review" } });
    return completed;
  });
}

export async function latestReviewMetadata() {
  const rows = await prisma.financialReviewItem.findMany({ where: { review: { portfolioId: CURRENT_PORTFOLIO_ID, status: "COMPLETED" } }, orderBy: { reviewedAt: "desc" } });
  const byEntity: Record<string, { lastReviewedAt: string | null; status: ReviewItemStatus }> = {};
  for (const row of rows) {
    const key = `${row.entityType}:${row.entityId}`;
    if (!byEntity[key]) byEntity[key] = { lastReviewedAt: row.reviewedAt?.toISOString() ?? null, status: row.status };
  }
  return byEntity;
}
