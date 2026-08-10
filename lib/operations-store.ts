import { prisma } from "@/lib/prisma";
import { CURRENT_PORTFOLIO_ID } from "@/lib/portfolio";
import { assessPromotion, buildCashForecast, type Money } from "@/lib/operations";
import { latestReviewMetadata } from "@/lib/review-store";

const money = (value: { toFixed(digits: number): string } | number | null): Money | null =>
  value == null ? null : typeof value === "number" ? value.toFixed(2) : value.toFixed(2);

export async function loadOperationsData() {
  const [cashRows, cards, recurringTransactions, reviewMetadata] = await Promise.all([
    prisma.cashAccount.findMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, active: true }, orderBy: { position: "asc" } }),
    prisma.creditCard.findMany({
      where: { portfolioId: CURRENT_PORTFOLIO_ID, status: { not: "CLOSED" } },
      orderBy: { position: "asc" },
      include: { autopayRule: true, promotions: { where: { active: true } } },
    }),
    prisma.recurringTransaction.findMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, active: true }, orderBy: { dayOfMonth: "asc" } }),
    latestReviewMetadata(),
  ]);
  return {
    accounts: cashRows.map((row) => ({ id: row.id, name: row.nickname ?? row.accountName, currentBalance: row.currentBalance.toFixed(2), minimumRequiredBalance: row.minDayEndBalanceRequired.toFixed(2), targetBalance: money(row.targetBalance), balanceAsOf: row.balanceAsOf?.toISOString().slice(0, 10) ?? null, review: reviewMetadata[`cash_account:${row.id}`] ?? null, completenessWarnings: row.balanceAsOf ? [] : ["Balance as-of date is missing."] })),
    cards: cards.map((card) => ({ id: card.id, nickname: card.nickname, issuerName: card.issuerName, lastFour: card.lastFour, currentBalance: money(card.currentBalance) as Money, statementBalance: money(card.statementBalance), minimumPaymentDue: money(card.minimumPaymentDue), purchaseApr: money(card.purchaseApr) as Money, creditLimit: money(card.creditLimit), paymentDueDay: card.paymentDueDay, statementClosingDay: card.statementClosingDay, balanceAsOf: card.balanceAsOf?.toISOString().slice(0, 10) ?? null, status: card.status, notes: card.notes, review: reviewMetadata[`credit_card:${card.id}`] ?? null, completenessWarnings: [card.statementBalance == null ? "Statement balance is unknown." : null, card.minimumPaymentDue == null ? "Minimum payment is unknown." : null, card.paymentDueDay == null ? "Payment due day is unknown." : null, !card.autopayRule ? "Autopay has not been confirmed." : null].filter(Boolean) })),
    autopayRules: cards.flatMap((card) => card.autopayRule ? [{ id: card.autopayRule.id, cardId: card.id, fundingAccountId: card.autopayRule.fundingAccountId, mode: card.autopayRule.mode, executionDay: card.autopayRule.executionDay, executionOffsetDays: card.autopayRule.executionOffsetDays, fixedAmount: money(card.autopayRule.fixedAmount), active: card.autopayRule.active }] : []),
    promotions: cards.flatMap((card) => card.promotions.map((promo) => ({ id: promo.id, cardId: card.id, currentPromoBalance: money(promo.currentPromoBalance), endDate: promo.endDate?.toISOString().slice(0, 10) ?? null, targetPayoffDate: promo.targetPayoffDate?.toISOString().slice(0, 10) ?? null, safetyBufferDays: promo.safetyBufferDays, deferredInterest: promo.deferredInterest, active: promo.active }))),
    recurringTransactions: recurringTransactions.map((tx) => ({ id: tx.id, name: tx.name, type: tx.type, amount: money(tx.amount) as Money, dayOfMonth: tx.dayOfMonth, sourceAccountId: tx.sourceAccountId, destinationAccountId: tx.destinationAccountId, active: tx.active })),
  };
}

export async function loadForecast(startDate: string, endDate: string, accountId?: string) {
  const data = await loadOperationsData();
  return buildCashForecast({ ...data, startDate, endDate }).filter((forecast) => !accountId || forecast.accountId === accountId);
}

export async function loadActionSummary(asOfDate: string, endDate: string, upcomingEndDate: string) {
  const [data, portfolio] = await Promise.all([
    loadOperationsData(),
    prisma.portfolio.findUnique({ where: { id: CURRENT_PORTFOLIO_ID }, select: { extraPaymentBudget: true, payoffStrategy: true } }),
  ]);
  const forecasts = buildCashForecast({ ...data, startDate: asOfDate, endDate });
  const promos = data.promotions.map((promo) => {
    const rule = data.autopayRules.find((item) => item.cardId === promo.cardId);
    const planned = rule?.mode === "FIXED_AMOUNT" || rule?.mode === "CUSTOM" ? rule.fixedAmount ?? null : null;
    return assessPromotion(promo, asOfDate, planned);
  });
  const todayEvents = forecasts.flatMap((item) => item.events.filter((event) => event.date === asOfDate && event.kind !== "STARTING_BALANCE"));
  const upcomingEvents = forecasts.flatMap((item) => item.events.filter((event) => event.date > asOfDate && event.date <= upcomingEndDate && event.kind !== "STARTING_BALANCE"));
  const cashWarnings = forecasts.filter((item) => item.firstShortfallDate).map((item) => ({ accountId: item.accountId, accountName: item.accountName, date: item.firstShortfallDate, shortfallAmount: item.shortfallAmount }));
  const dataQualityActions = forecasts.flatMap((item) => item.events.filter((event) => event.amount === null).map((event) => ({ code: "UNKNOWN_PAYMENT_AMOUNT", message: `${event.label}: ${event.unknownReason ?? "Amount unknown."}` })));
  const safeCents = forecasts.reduce((sum, item) => sum + Math.max(0, Math.round((Number(item.projectedLowBalance) - Number(item.minimumRequiredBalance)) * 100)), 0);
  const plannedCents = Math.round((portfolio?.extraPaymentBudget ?? 0) * 100);
  const cashSafeExtraAmount = (Math.min(plannedCents, safeCents) / 100).toFixed(2);
  const promoWarnings = promos.filter((promo) => promo.riskStatus !== "SAFE" && promo.riskStatus !== "PAID_OFF");
  const recommendedActions = [
    ...cashWarnings.map((warning) => ({ code: "FUNDING_SHORTFALL", priority: "URGENT", message: `Move at least $${warning.shortfallAmount} to ${warning.accountName} before ${warning.date}.` })),
    ...promoWarnings.map((promo) => ({ code: "PROMO_PACE", priority: promo.riskStatus, message: promo.monthlyShortfall && Number(promo.monthlyShortfall) > 0 ? `Increase the promotional payoff by $${promo.monthlyShortfall} per month.` : `Review the ${promo.riskStatus.toLowerCase().replace("_", " ")} promotional balance.` })),
    ...dataQualityActions.map((action) => ({ ...action, priority: "DATA" })),
  ];
  return { asOfDate, throughDate: endDate, todayEvents, upcomingEvents, forecasts, promoWarnings, cashWarnings, dataQualityActions, recommendedActions, payoffStrategy: portfolio?.payoffStrategy ?? "avalanche", plannedExtraPaymentBudget: (plannedCents / 100).toFixed(2), cashSafeExtraAmount };
}
