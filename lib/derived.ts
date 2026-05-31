import type {
  CashAccount,
  CashAccountInput,
  CreditCardAccount,
  CreditCardInput,
  DashboardSummary,
  PayoffStrategy,
  SetupConfig,
  StatusFlag,
} from "@/lib/types";

type CreditBaseRow = Omit<
  CreditCardInput,
  | "utilization_percent"
  | "paying_interest_now"
  | "statement_balance_autopay"
  | "promo_end_soon"
  | "priority_score"
  | "priority_rank"
  | "status_flag"
>;

type CashBaseRow = Omit<CashAccountInput, "available_above_minimum" | "status_flag">;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function diffInDays(targetDate: string, referenceDate: string): number {
  const target = new Date(`${targetDate}T00:00:00`);
  const reference = new Date(`${referenceDate}T00:00:00`);
  return Math.ceil((target.getTime() - reference.getTime()) / MS_PER_DAY);
}

function hasStatementBalanceAutopay(value: CreditCardInput["auto_payment"]): boolean {
  return typeof value === "string"
    ? value.toLowerCase().includes("statement balance")
    : false;
}

function resolveCreditStatus(args: {
  current_balance: number;
  paying_interest_now: boolean;
  statement_balance_autopay: boolean;
  utilization_percent: number;
  promo_flag: boolean;
  promo_end_date: string | null;
  promo_end_soon: boolean;
  payment_due: string | null;
  importedAt: string;
}): StatusFlag {
  if (args.current_balance <= 0) {
    return "paid";
  }

  const promoExpired =
    Boolean(args.promo_flag && args.promo_end_date) &&
    diffInDays(args.promo_end_date as string, args.importedAt) < 0;

  if (args.paying_interest_now && args.statement_balance_autopay && !promoExpired) {
    return "watch";
  }

  if (args.paying_interest_now) {
    return "danger";
  }

  if (promoExpired) {
    return "danger";
  }

  if (args.utilization_percent >= 90) {
    return "danger";
  }

  if (args.promo_end_soon || args.utilization_percent >= 70) {
    return "warning";
  }

  if (args.payment_due) {
    const daysUntilDue = diffInDays(args.payment_due, args.importedAt);
    if (daysUntilDue >= 0 && daysUntilDue <= 5) {
      return "warning";
    }
  }

  return "ok";
}

function computePriorityScore(card: {
  current_balance: number;
  paying_interest_now: boolean;
  statement_balance_autopay: boolean;
  apr_percent: number;
  promo_flag: boolean;
  promo_end_date: string | null;
  promo_end_soon: boolean;
  utilization_percent: number;
  importedAt: string;
  payment_due: string | null;
  strategy: PayoffStrategy;
  customWeights: SetupConfig["custom_strategy_weights"];
}): number {
  if (card.current_balance <= 0) {
    return -1_000_000;
  }

  const promoExpired =
    Boolean(card.promo_flag && card.promo_end_date) &&
    diffInDays(card.promo_end_date as string, card.importedAt) < 0;
  const dueSoon =
    card.payment_due !== null &&
    diffInDays(card.payment_due, card.importedAt) >= 0 &&
    diffInDays(card.payment_due, card.importedAt) <= 5;
  let score = 0;

  if (card.paying_interest_now) {
    score += 100_000;
  }

  if (card.statement_balance_autopay && card.paying_interest_now && !promoExpired) {
    score -=
      card.strategy === "custom"
        ? card.customWeights.statement_balance_autopay_penalty
        : 20_000;
  }

  if (card.strategy === "snowball") {
    score += Math.max(0, 15_000 - card.current_balance * 4);
    score += card.apr_percent * 45;
    score += Math.min(card.utilization_percent, 100) * 12;
  } else if (card.strategy === "promo-first") {
    score += card.apr_percent * 65;
    score += Math.min(card.utilization_percent, 100) * 14;
    if (promoExpired) {
      score += 28_000;
    } else if (card.promo_end_soon) {
      score += 18_000;
    }
  } else if (card.strategy === "custom") {
    score += card.paying_interest_now ? card.customWeights.interest_now : 0;
    score += card.apr_percent * card.customWeights.apr_percent;
    score +=
      Math.min(card.utilization_percent, 100) *
      card.customWeights.utilization_percent;
    score += promoExpired ? card.customWeights.promo_expired : 0;
    score += card.promo_end_soon ? card.customWeights.promo_end_soon : 0;
    score += Math.max(0, 20_000 - card.current_balance) * card.customWeights.balance_size;
    score += dueSoon ? card.customWeights.due_soon : 0;
  } else {
    score += card.apr_percent * 100;
    score += Math.min(card.utilization_percent, 100) * 20;
    if (promoExpired) {
      score += 15_000;
    } else if (card.promo_end_soon) {
      score += 8_000;
    }
  }

  if (dueSoon && card.strategy !== "custom") {
    score += 2_500;
  }

  return score;
}

function buildRecommendedTargetReasons(
  card: CreditCardAccount | null,
  strategy: PayoffStrategy,
  importedAt: string,
): string[] {
  if (!card) {
    return [];
  }

  if (card.current_balance <= 0) {
    return ["Account is paid off — no payment action needed"];
  }

  const reasons: string[] = [];

  if (strategy === "snowball") {
    reasons.push("Snowball mode is favoring a faster balance elimination path.");
  } else if (strategy === "promo-first") {
    reasons.push("Promo-first mode is pulling expiring promotional balances higher.");
  } else if (strategy === "custom") {
    reasons.push("Custom mode is using your manual weighting profile.");
  } else {
    reasons.push("Avalanche mode is prioritizing the most expensive balances first.");
  }

  if (card.paying_interest_now && !card.statement_balance_autopay) {
    reasons.push("It is actively charging interest right now.");
  } else if (card.statement_balance_autopay) {
    reasons.push("It is still worth watching, but autopay is covering the statement balance.");
  }

  if (card.apr_percent >= 25) {
    reasons.push("Its APR is among the most expensive balances in the portfolio.");
  } else if (card.apr_percent > 0) {
    reasons.push("Its APR still adds meaningful payoff pressure.");
  }

  if (card.promo_flag && card.promo_end_soon && card.promo_end_date) {
    const promoDays = diffInDays(card.promo_end_date, importedAt);
    reasons.push(`Promo expires in ${promoDays} day${promoDays === 1 ? "" : "s"}.`);
  }

  if (card.promo_flag && card.promo_end_date && !card.promo_end_soon) {
    const promoEnd = new Date(`${card.promo_end_date}T00:00:00`);
    if (promoEnd.getTime() < Date.now()) {
      reasons.push("Its promo period has already expired.");
    }
  }

  if (card.utilization_percent >= 70) {
    reasons.push("Its utilization is elevated and worth bringing down.");
  }

  if (card.payment_due) {
    const daysUntilDue = diffInDays(card.payment_due, importedAt);
    if (daysUntilDue === 0) {
      reasons.push("Due today.");
    } else if (daysUntilDue < 0) {
      reasons.push(`${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"} overdue.`);
    } else if (card.status_flag === "warning") {
      reasons.push(`Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}.`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("It currently ranks highest once balances, APR, and promo timing are combined.");
  }

  return reasons;
}

export function deriveCreditAccounts(
  baseRows: CreditBaseRow[],
  setup: SetupConfig,
  importedAt: string,
): CreditCardAccount[] {
  const enriched = baseRows.map((card) => {
    const utilization_percent =
      card.credit_limit && card.credit_limit > 0
        ? (card.current_balance / card.credit_limit) * 100
        : 0;
    const paying_interest_now =
      card.current_balance > 0 && card.interest_fees_this_month > 0;
    const statement_balance_autopay = hasStatementBalanceAutopay(card.auto_payment);
    const promo_end_soon =
      Boolean(card.promo_flag && card.promo_end_date) &&
      diffInDays(card.promo_end_date as string, importedAt) >= 0 &&
      diffInDays(card.promo_end_date as string, importedAt) <=
        setup.promo_end_soon_days;
    const status_flag = resolveCreditStatus({
      current_balance: card.current_balance,
      paying_interest_now,
      statement_balance_autopay,
      utilization_percent,
      promo_flag: card.promo_flag,
      promo_end_date: card.promo_end_date,
      promo_end_soon,
      payment_due: card.payment_due,
      importedAt,
    });
    const priority_score = computePriorityScore({
      current_balance: card.current_balance,
      paying_interest_now,
      statement_balance_autopay,
      apr_percent: card.apr_percent,
      promo_flag: card.promo_flag,
      promo_end_date: card.promo_end_date,
      promo_end_soon,
      utilization_percent,
      importedAt,
      payment_due: card.payment_due,
      strategy: setup.payoff_strategy,
      customWeights: setup.custom_strategy_weights,
    });

    return {
      ...card,
      utilization_percent,
      paying_interest_now,
      statement_balance_autopay,
      promo_end_soon,
      priority_score,
      priority_rank: 0,
      status_flag,
    };
  });

  const ranked = [...enriched].sort((left, right) => {
    if (left.current_balance <= 0 && right.current_balance > 0) {
      return 1;
    }

    if (right.current_balance <= 0 && left.current_balance > 0) {
      return -1;
    }

    const scoreDiff = right.priority_score - left.priority_score;
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    const aprDiff = right.apr_percent - left.apr_percent;
    if (aprDiff !== 0) {
      return aprDiff;
    }

    return right.current_balance - left.current_balance;
  });

  const rankMap = new Map(ranked.map((card, index) => [card.id, index + 1]));
  return enriched.map((card) => ({
    ...card,
    priority_rank: rankMap.get(card.id) ?? enriched.length,
  }));
}

export function deriveCashAccounts(
  baseRows: CashBaseRow[],
  setup: SetupConfig,
): CashAccount[] {
  return baseRows.map((account) => {
    const effectiveMinimum =
      setup.global_cash_buffer_override ?? account.min_day_end_balance_required;
    const available_above_minimum =
      account.current_balance - effectiveMinimum;

    return {
      ...account,
      available_above_minimum,
      status_flag: available_above_minimum < 0 ? "danger" : "ok",
    };
  });
}

export function buildDashboardSummary(args: {
  setup: SetupConfig;
  creditAccounts: CreditCardAccount[];
  cashAccounts: CashAccount[];
  importedAt?: string;
}): DashboardSummary {
  const sortedCreditAccounts = [...args.creditAccounts].sort(
    (left, right) => left.priority_rank - right.priority_rank,
  );
  const recommended_target_card =
    sortedCreditAccounts.find((card) => card.current_balance > 0) ?? null;
  const total_credit_balance = args.creditAccounts.reduce(
    (sum, account) => sum + account.current_balance,
    0,
  );
  const totalCreditLimit = args.creditAccounts.reduce(
    (sum, account) => sum + (account.credit_limit ?? 0),
    0,
  );
  const weighted_utilization_percent =
    totalCreditLimit > 0 ? (total_credit_balance / totalCreditLimit) * 100 : 0;
  const total_cash_above_minimums = args.cashAccounts.reduce(
    (sum, account) => sum + account.available_above_minimum,
    0,
  );

  return {
    recommended_target_card,
    recommended_target_reasons: buildRecommendedTargetReasons(
      recommended_target_card,
      args.setup.payoff_strategy,
      args.importedAt ?? new Date().toISOString().slice(0, 10),
    ),
    payoff_strategy: args.setup.payoff_strategy,
    total_credit_balance,
    weighted_utilization_percent,
    total_cash_above_minimums,
    extra_payment_budget: args.setup.extra_payment_budget,
    credit_danger_items: sortedCreditAccounts.filter(
      (account) => account.status_flag === "danger",
    ),
    credit_warning_items: sortedCreditAccounts.filter(
      (account) => account.status_flag === "warning",
    ),
    credit_watch_items: sortedCreditAccounts.filter(
      (account) => account.status_flag === "watch",
    ),
    cash_danger_items: args.cashAccounts.filter(
      (account) => account.status_flag === "danger",
    ),
  };
}
