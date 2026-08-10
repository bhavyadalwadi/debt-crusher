export type Money = string;
export type AutopayMode =
  | "STATEMENT_BALANCE"
  | "MINIMUM_PAYMENT"
  | "FIXED_AMOUNT"
  | "PROMO_TARGET"
  | "CUSTOM"
  | "DISABLED"
  | "UNKNOWN";
export type RecurringTransactionType =
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "DEBT_PAYMENT";
export type PromoRiskStatus =
  | "SAFE"
  | "WATCH"
  | "AT_RISK"
  | "URGENT"
  | "EXPIRED"
  | "PAID_OFF"
  | "UNKNOWN";

export interface OperationalCashAccount {
  id: string;
  name: string;
  currentBalance: Money;
  minimumRequiredBalance: Money;
  targetBalance?: Money | null;
}

export interface OperationalCard {
  id: string;
  nickname: string;
  currentBalance: Money;
  statementBalance?: Money | null;
  minimumPaymentDue?: Money | null;
  purchaseApr: Money;
  paymentDueDay?: number | null;
}

export interface OperationalAutopayRule {
  id: string;
  cardId: string;
  fundingAccountId?: string | null;
  mode: AutopayMode;
  executionDay?: number | null;
  executionOffsetDays: number;
  fixedAmount?: Money | null;
  active: boolean;
}

export interface OperationalPromotion {
  id: string;
  cardId: string;
  currentPromoBalance?: Money | null;
  endDate?: string | null;
  targetPayoffDate?: string | null;
  safetyBufferDays: number;
  deferredInterest: boolean;
  active: boolean;
}

export interface OperationalRecurringTransaction {
  id: string;
  name: string;
  type: RecurringTransactionType;
  amount: Money;
  dayOfMonth: number;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  active: boolean;
}

export interface ForecastEvent {
  id: string;
  date: string;
  accountId: string;
  label: string;
  kind: "STARTING_BALANCE" | "INCOME" | "TRANSFER_IN" | "EXPENSE" | "TRANSFER_OUT" | "CARD_PAYMENT";
  amount: Money | null;
  runningBalance: Money | null;
  unknownReason?: string;
}

export interface AccountForecast {
  accountId: string;
  accountName: string;
  startingBalance: Money;
  minimumRequiredBalance: Money;
  projectedLowBalance: Money;
  projectedFinalBalance: Money;
  firstShortfallDate: string | null;
  shortfallAmount: Money;
  events: ForecastEvent[];
}

export interface PromoAssessment {
  promotionId: string;
  cardId: string;
  riskStatus: PromoRiskStatus;
  daysRemaining: number | null;
  monthsRemaining: number | null;
  targetPayoffDate: string | null;
  requiredMonthlyPayment: Money | null;
  plannedMonthlyPayment: Money | null;
  monthlyShortfall: Money | null;
  reasons: string[];
}

const CENTS = 100;

export function moneyToCents(value: Money | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`Invalid monetary value: ${value}`);
  return Math.round(numeric * CENTS);
}

export function centsToMoney(value: number): Money {
  return (value / CENTS).toFixed(2);
}

export function validateDayOfMonth(day: number): void {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("Day of month must be an integer between 1 and 31.");
  }
}

export function occurrenceDate(year: number, monthIndex: number, day: number): Date {
  validateDayOfMonth(day);
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

function occurrences(startDate: string, endDate: string, day: number): string[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (end < start) throw new Error("endDate must be on or after startDate.");
  const result: string[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  while (year < end.getUTCFullYear() || (year === end.getUTCFullYear() && month <= end.getUTCMonth())) {
    const date = occurrenceDate(year, month, day);
    if (date >= start && date <= end) result.push(isoDate(date));
    month += 1;
    if (month === 12) { month = 0; year += 1; }
  }
  return result;
}

export function resolveAutopayAmount(
  card: OperationalCard,
  rule: OperationalAutopayRule,
  promotions: OperationalPromotion[],
  asOfDate: string,
): { amount: Money | null; unknownReason?: string } {
  if (!rule.active || rule.mode === "DISABLED") return { amount: null, unknownReason: "Autopay is disabled." };
  if (rule.mode === "STATEMENT_BALANCE") {
    return card.statementBalance == null
      ? { amount: null, unknownReason: "Statement balance is unknown — update the latest statement." }
      : { amount: centsToMoney(moneyToCents(card.statementBalance)) };
  }
  if (rule.mode === "MINIMUM_PAYMENT") {
    return card.minimumPaymentDue == null
      ? { amount: null, unknownReason: "Minimum payment is unknown — update the latest statement." }
      : { amount: centsToMoney(moneyToCents(card.minimumPaymentDue)) };
  }
  if (rule.mode === "FIXED_AMOUNT" || rule.mode === "CUSTOM") {
    return rule.fixedAmount == null
      ? { amount: null, unknownReason: "A fixed payment amount has not been configured." }
      : { amount: centsToMoney(moneyToCents(rule.fixedAmount)) };
  }
  if (rule.mode === "PROMO_TARGET") {
    const activePromo = promotions.find((promo) => promo.cardId === card.id && promo.active);
    const assessment = activePromo ? assessPromotion(activePromo, asOfDate, null) : null;
    return assessment?.requiredMonthlyPayment
      ? { amount: assessment.requiredMonthlyPayment }
      : { amount: null, unknownReason: "Promo balance or payoff deadline is unknown." };
  }
  return { amount: null, unknownReason: "Autopay amount rule is unknown." };
}

export function assessPromotion(
  promotion: OperationalPromotion,
  asOfDate: string,
  plannedMonthlyPayment: Money | null,
): PromoAssessment {
  const reasons: string[] = [];
  if (!promotion.currentPromoBalance || !promotion.endDate) {
    return { promotionId: promotion.id, cardId: promotion.cardId, riskStatus: "UNKNOWN", daysRemaining: null, monthsRemaining: null, targetPayoffDate: null, requiredMonthlyPayment: null, plannedMonthlyPayment, monthlyShortfall: null, reasons: ["Promo balance or expiration date is missing."] };
  }
  const balance = moneyToCents(promotion.currentPromoBalance);
  if (balance <= 0) {
    return { promotionId: promotion.id, cardId: promotion.cardId, riskStatus: "PAID_OFF", daysRemaining: null, monthsRemaining: null, targetPayoffDate: promotion.targetPayoffDate ?? promotion.endDate, requiredMonthlyPayment: "0.00", plannedMonthlyPayment, monthlyShortfall: "0.00", reasons: ["Promotional balance is paid off."] };
  }
  const asOf = parseDate(asOfDate);
  const end = parseDate(promotion.endDate);
  const target = promotion.targetPayoffDate
    ? parseDate(promotion.targetPayoffDate)
    : new Date(end.getTime() - promotion.safetyBufferDays * 86_400_000);
  const daysRemaining = Math.ceil((target.getTime() - asOf.getTime()) / 86_400_000);
  if (daysRemaining < 0) {
    return { promotionId: promotion.id, cardId: promotion.cardId, riskStatus: "EXPIRED", daysRemaining, monthsRemaining: 0, targetPayoffDate: isoDate(target), requiredMonthlyPayment: centsToMoney(balance), plannedMonthlyPayment, monthlyShortfall: centsToMoney(Math.max(0, balance - moneyToCents(plannedMonthlyPayment))), reasons: ["The promotional payoff target date has passed."] };
  }
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30.4375));
  const required = Math.ceil(balance / monthsRemaining);
  const planned = plannedMonthlyPayment == null ? null : moneyToCents(plannedMonthlyPayment);
  const shortfall = planned == null ? null : Math.max(0, required - planned);
  let riskStatus: PromoRiskStatus = daysRemaining < 30 ? "URGENT" : daysRemaining < 90 ? "AT_RISK" : daysRemaining < 180 ? "WATCH" : "SAFE";
  if (shortfall && shortfall > 0) { riskStatus = daysRemaining < 90 ? "URGENT" : "AT_RISK"; reasons.push("The current monthly plan is below the required promo payoff pace."); }
  if (promotion.deferredInterest) reasons.push("Deferred interest may be charged if the balance is not paid in full.");
  return { promotionId: promotion.id, cardId: promotion.cardId, riskStatus, daysRemaining, monthsRemaining, targetPayoffDate: isoDate(target), requiredMonthlyPayment: centsToMoney(required), plannedMonthlyPayment, monthlyShortfall: shortfall == null ? null : centsToMoney(shortfall), reasons };
}

export function buildCashForecast(args: {
  startDate: string;
  endDate: string;
  accounts: OperationalCashAccount[];
  cards: OperationalCard[];
  autopayRules: OperationalAutopayRule[];
  promotions: OperationalPromotion[];
  recurringTransactions: OperationalRecurringTransaction[];
}): AccountForecast[] {
  parseDate(args.startDate); parseDate(args.endDate);
  const rawEvents: Array<Omit<ForecastEvent, "runningBalance"> & { cents: number | null; order: number }> = [];
  for (const tx of args.recurringTransactions.filter((item) => item.active)) {
    for (const date of occurrences(args.startDate, args.endDate, tx.dayOfMonth)) {
      const cents = moneyToCents(tx.amount);
      if (tx.type === "INCOME" && tx.destinationAccountId) rawEvents.push({ id: `${tx.id}:${date}:in`, date, accountId: tx.destinationAccountId, label: tx.name, kind: "INCOME", amount: centsToMoney(cents), cents, order: 0 });
      if (tx.type === "TRANSFER" && tx.destinationAccountId) rawEvents.push({ id: `${tx.id}:${date}:in`, date, accountId: tx.destinationAccountId, label: tx.name, kind: "TRANSFER_IN", amount: centsToMoney(cents), cents, order: 1 });
      if (tx.sourceAccountId && tx.type !== "INCOME") rawEvents.push({ id: `${tx.id}:${date}:out`, date, accountId: tx.sourceAccountId, label: tx.name, kind: tx.type === "TRANSFER" ? "TRANSFER_OUT" : "EXPENSE", amount: centsToMoney(-cents), cents: -cents, order: tx.type === "TRANSFER" ? 2 : 3 });
    }
  }
  for (const rule of args.autopayRules.filter((item) => item.active && item.fundingAccountId)) {
    const card = args.cards.find((item) => item.id === rule.cardId);
    if (!card) continue;
    const day = rule.executionDay ?? card.paymentDueDay;
    if (!day) continue;
    for (const date of occurrences(args.startDate, args.endDate, day)) {
      const resolved = resolveAutopayAmount(card, rule, args.promotions, date);
      const cents = resolved.amount == null ? null : -moneyToCents(resolved.amount);
      rawEvents.push({ id: `${rule.id}:${date}`, date, accountId: rule.fundingAccountId as string, label: `${card.nickname} payment`, kind: "CARD_PAYMENT", amount: cents == null ? null : centsToMoney(cents), cents, unknownReason: resolved.unknownReason, order: 4 });
    }
  }
  return args.accounts.map((account) => {
    let running = moneyToCents(account.currentBalance);
    let low = running;
    const minimum = moneyToCents(account.minimumRequiredBalance);
    let firstShortfallDate: string | null = running < minimum ? args.startDate : null;
    const events: ForecastEvent[] = [{ id: `${account.id}:start`, date: args.startDate, accountId: account.id, label: "Starting balance", kind: "STARTING_BALANCE", amount: account.currentBalance, runningBalance: centsToMoney(running) }];
    const accountEvents = rawEvents.filter((event) => event.accountId === account.id).sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.id.localeCompare(b.id));
    for (const event of accountEvents) {
      if (event.cents !== null) running += event.cents;
      low = Math.min(low, running);
      if (!firstShortfallDate && running < minimum) firstShortfallDate = event.date;
      events.push({ id: event.id, date: event.date, accountId: event.accountId, label: event.label, kind: event.kind, amount: event.amount, runningBalance: event.cents === null ? null : centsToMoney(running), unknownReason: event.unknownReason });
    }
    return { accountId: account.id, accountName: account.name, startingBalance: centsToMoney(moneyToCents(account.currentBalance)), minimumRequiredBalance: centsToMoney(minimum), projectedLowBalance: centsToMoney(low), projectedFinalBalance: centsToMoney(running), firstShortfallDate, shortfallAmount: centsToMoney(Math.max(0, minimum - low)), events };
  });
}
