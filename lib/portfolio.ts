import { buildDashboardSummary, deriveCashAccounts, deriveCreditAccounts } from "@/lib/derived";
import type {
  ActivitySnapshot,
  ActivityEvent,
  CashAccountInput,
  CreditCardInput,
  ImportSnapshot,
  NamedDelta,
  PortfolioState,
  SnapshotChangeDetail,
  SnapshotChangeSummary,
  SnapshotDelta,
  SetupConfig,
} from "@/lib/types";

export const CURRENT_PORTFOLIO_ID = "current";

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `dc-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultCustomStrategyWeights() {
  return {
    interest_now: 100_000,
    apr_percent: 100,
    utilization_percent: 20,
    promo_expired: 15_000,
    promo_end_soon: 8_000,
    balance_size: 0.4,
    due_soon: 2_500,
    statement_balance_autopay_penalty: 20_000,
  };
}

export function createEmptySetup(): SetupConfig {
  return {
    extra_payment_budget: 0,
    promo_end_soon_days: 21,
    global_cash_buffer_override: null,
    payoff_strategy: "avalanche",
    custom_strategy_weights: createDefaultCustomStrategyWeights(),
  };
}

export function createCreditCardInput(): CreditCardInput {
  return {
    id: makeId(),
    institution: "",
    nickname: "",
    account_type: "credit_card",
    current_balance: 0,
    credit_limit: null,
    apr_percent: 0,
    promo_flag: false,
    promo_end_date: null,
    min_payment: 0,
    interest_fees_this_month: 0,
    auto_payment: null,
    payment_due: null,
    how_are_we_taking_care_of_it: "",
    rewards_available: null,
    points_available: null,
  };
}

export function createCashAccountInput(): CashAccountInput {
  return {
    id: makeId(),
    institution: "",
    account_name: "",
    type: "checking",
    current_balance: 0,
    min_day_end_balance_required: 0,
  };
}

export function createEmptyPortfolio(): PortfolioState {
  return {
    id: CURRENT_PORTFOLIO_ID,
    updatedAt: nowIso(),
    setup: createEmptySetup(),
    creditAccounts: [],
    cashAccounts: [],
  };
}

export function portfolioFromImportSnapshot(snapshot: ImportSnapshot): PortfolioState {
  return {
    id: CURRENT_PORTFOLIO_ID,
    updatedAt: nowIso(),
    setup: snapshot.setup,
    creditAccounts: snapshot.creditAccounts.map((account) => ({
      id: account.id,
      institution: account.institution,
      nickname: account.nickname,
      account_type: "credit_card",
      current_balance: account.current_balance,
      credit_limit: account.credit_limit,
      apr_percent: account.apr_percent,
      promo_flag: account.promo_flag,
      promo_end_date: account.promo_end_date,
      min_payment: account.min_payment,
      interest_fees_this_month: account.interest_fees_this_month,
      auto_payment: account.auto_payment,
      payment_due: account.payment_due,
      how_are_we_taking_care_of_it: account.how_are_we_taking_care_of_it,
      rewards_available: account.rewards_available,
      points_available: account.points_available,
    })),
    cashAccounts: snapshot.cashAccounts.map((account) => ({
      id: account.id,
      institution: account.institution,
      account_name: account.account_name,
      type: account.type,
      current_balance: account.current_balance,
      min_day_end_balance_required: account.min_day_end_balance_required,
    })),
  };
}

export function buildComputedSnapshot(
  portfolio: PortfolioState,
  options?: Partial<Pick<ActivitySnapshot, "id" | "source" | "label" | "filename" | "importedAt">>,
): ActivitySnapshot {
  const importedAt = options?.importedAt ?? nowIso().slice(0, 10);
  const creditAccounts = deriveCreditAccounts(
    portfolio.creditAccounts,
    portfolio.setup,
    importedAt,
  );
  const cashAccounts = deriveCashAccounts(portfolio.cashAccounts, portfolio.setup);
  const dashboardSummary = buildDashboardSummary({
    setup: portfolio.setup,
    creditAccounts,
    cashAccounts,
    importedAt,
  });

  return {
    id: options?.id ?? "computed-current",
    source: options?.source ?? "manual_save",
    label:
      options?.label ??
      (options?.source === "import"
        ? "Workbook import"
        : options?.source === "screenshot_import"
          ? "Screenshot import"
          : "Current portfolio"),
    filename: options?.filename ?? "",
    importedAt,
    setup: portfolio.setup,
    creditAccounts,
    cashAccounts,
    dashboardSummary,
  };
}

export function buildActivitySnapshot(
  portfolio: PortfolioState,
  source: ActivitySnapshot["source"],
  options?: { label?: string; filename?: string; importedAt?: string },
): ActivitySnapshot {
  return buildComputedSnapshot(portfolio, {
    id: makeId(),
    source,
    label: options?.label,
    filename: options?.filename,
    importedAt: options?.importedAt,
  });
}

export function buildSnapshotDelta(
  current: Pick<ActivitySnapshot, "dashboardSummary">,
  previous: Pick<ActivitySnapshot, "dashboardSummary"> | null,
): SnapshotDelta | null {
  if (!previous) {
    return null;
  }

  return {
    creditBalanceChange:
      current.dashboardSummary.total_credit_balance -
      previous.dashboardSummary.total_credit_balance,
    cashAboveMinimumChange:
      current.dashboardSummary.total_cash_above_minimums -
      previous.dashboardSummary.total_cash_above_minimums,
    extraPaymentBudgetChange:
      current.dashboardSummary.extra_payment_budget -
      previous.dashboardSummary.extra_payment_budget,
  };
}

export function buildSnapshotChangeSummary(
  current: Pick<ActivitySnapshot, "creditAccounts" | "cashAccounts">,
  previous: Pick<ActivitySnapshot, "creditAccounts" | "cashAccounts"> | null,
): SnapshotChangeSummary | null {
  if (!previous) {
    return null;
  }

  const currentCreditIds = new Set(current.creditAccounts.map((account) => account.id));
  const previousCreditIds = new Set(previous.creditAccounts.map((account) => account.id));
  const currentCashIds = new Set(current.cashAccounts.map((account) => account.id));
  const previousCashIds = new Set(previous.cashAccounts.map((account) => account.id));

  return {
    creditAccountsAdded: [...currentCreditIds].filter((id) => !previousCreditIds.has(id))
      .length,
    creditAccountsRemoved: [...previousCreditIds].filter((id) => !currentCreditIds.has(id))
      .length,
    cashAccountsAdded: [...currentCashIds].filter((id) => !previousCashIds.has(id))
      .length,
    cashAccountsRemoved: [...previousCashIds].filter((id) => !currentCashIds.has(id))
      .length,
  };
}

function topNamedDeltas(entries: NamedDelta[]) {
  return [...entries]
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 4);
}

export function buildSnapshotChangeDetail(
  current: Pick<ActivitySnapshot, "creditAccounts" | "cashAccounts" | "setup">,
  previous: Pick<ActivitySnapshot, "creditAccounts" | "cashAccounts" | "setup"> | null,
): SnapshotChangeDetail | null {
  if (!previous) {
    return null;
  }

  const currentCreditMap = new Map(
    current.creditAccounts.map((account) => [account.id, account]),
  );
  const previousCreditMap = new Map(
    previous.creditAccounts.map((account) => [account.id, account]),
  );
  const currentCashMap = new Map(
    current.cashAccounts.map((account) => [account.id, account]),
  );
  const previousCashMap = new Map(
    previous.cashAccounts.map((account) => [account.id, account]),
  );

  const creditAddedNames = current.creditAccounts
    .filter((account) => !previousCreditMap.has(account.id))
    .map((account) => account.nickname || account.institution);
  const creditRemovedNames = previous.creditAccounts
    .filter((account) => !currentCreditMap.has(account.id))
    .map((account) => account.nickname || account.institution);
  const cashAddedNames = current.cashAccounts
    .filter((account) => !previousCashMap.has(account.id))
    .map((account) => account.account_name || account.institution);
  const cashRemovedNames = previous.cashAccounts
    .filter((account) => !currentCashMap.has(account.id))
    .map((account) => account.account_name || account.institution);

  const creditBalanceChanges = topNamedDeltas(
    current.creditAccounts
      .filter((account) => previousCreditMap.has(account.id))
      .map((account) => ({
        name: account.nickname || account.institution,
        delta:
          account.current_balance -
          (previousCreditMap.get(account.id)?.current_balance ?? 0),
      }))
      .filter((entry) => entry.delta !== 0),
  );

  const cashBalanceChanges = topNamedDeltas(
    current.cashAccounts
      .filter((account) => previousCashMap.has(account.id))
      .map((account) => ({
        name: account.account_name || account.institution,
        delta:
          account.current_balance -
          (previousCashMap.get(account.id)?.current_balance ?? 0),
      }))
      .filter((entry) => entry.delta !== 0),
  );

  const setupChanges: string[] = [];
  if (
    current.setup.extra_payment_budget !== previous.setup.extra_payment_budget
  ) {
    setupChanges.push("extra payment budget");
  }
  if (
    current.setup.promo_end_soon_days !== previous.setup.promo_end_soon_days
  ) {
    setupChanges.push("promo soon threshold");
  }
  if (
    current.setup.global_cash_buffer_override !==
    previous.setup.global_cash_buffer_override
  ) {
    setupChanges.push("global cash buffer");
  }
  if (current.setup.payoff_strategy !== previous.setup.payoff_strategy) {
    setupChanges.push("payoff strategy");
  }
  if (
    JSON.stringify(current.setup.custom_strategy_weights) !==
    JSON.stringify(previous.setup.custom_strategy_weights)
  ) {
    setupChanges.push("custom strategy weights");
  }

  return {
    creditAddedNames,
    creditRemovedNames,
    cashAddedNames,
    cashRemovedNames,
    creditBalanceChanges,
    cashBalanceChanges,
    setupChanges,
  };
}

export function buildActivityEvents(args: {
  snapshotId: string;
  current: PortfolioState;
  previous: PortfolioState | null;
}): ActivityEvent[] {
  const occurredAt = args.current.updatedAt || nowIso();
  const events: ActivityEvent[] = [];
  const currentCreditMap = new Map(
    args.current.creditAccounts.map((account) => [account.id, account]),
  );
  const previousCreditMap = new Map(
    (args.previous?.creditAccounts ?? []).map((account) => [account.id, account]),
  );
  const currentCashMap = new Map(
    args.current.cashAccounts.map((account) => [account.id, account]),
  );
  const previousCashMap = new Map(
    (args.previous?.cashAccounts ?? []).map((account) => [account.id, account]),
  );

  for (const account of args.current.creditAccounts) {
    const previous = previousCreditMap.get(account.id);
    if (!previous) {
      events.push({
        id: makeId(),
        snapshotId: args.snapshotId,
        kind: "credit_added",
        entityType: "credit",
        entityId: account.id,
        entityName: account.nickname || account.institution,
        amountDelta: account.current_balance,
        summary: `Added credit card ${account.nickname || account.institution}.`,
        occurredAt,
      });
      continue;
    }

    const delta = account.current_balance - previous.current_balance;
    if (delta !== 0) {
      events.push({
        id: makeId(),
        snapshotId: args.snapshotId,
        kind: "credit_balance_changed",
        entityType: "credit",
        entityId: account.id,
        entityName: account.nickname || account.institution,
        amountDelta: delta,
        summary: `${account.nickname || account.institution} balance ${delta > 0 ? "increased" : "decreased"}.`,
        occurredAt,
      });
    }
  }

  for (const account of args.previous?.creditAccounts ?? []) {
    if (!currentCreditMap.has(account.id)) {
      events.push({
        id: makeId(),
        snapshotId: args.snapshotId,
        kind: "credit_removed",
        entityType: "credit",
        entityId: account.id,
        entityName: account.nickname || account.institution,
        amountDelta: null,
        summary: `Removed credit card ${account.nickname || account.institution}.`,
        occurredAt,
      });
    }
  }

  for (const account of args.current.cashAccounts) {
    const previous = previousCashMap.get(account.id);
    if (!previous) {
      events.push({
        id: makeId(),
        snapshotId: args.snapshotId,
        kind: "cash_added",
        entityType: "cash",
        entityId: account.id,
        entityName: account.account_name || account.institution,
        amountDelta: account.current_balance,
        summary: `Added cash account ${account.account_name || account.institution}.`,
        occurredAt,
      });
      continue;
    }

    const delta = account.current_balance - previous.current_balance;
    if (delta !== 0) {
      events.push({
        id: makeId(),
        snapshotId: args.snapshotId,
        kind: "cash_balance_changed",
        entityType: "cash",
        entityId: account.id,
        entityName: account.account_name || account.institution,
        amountDelta: delta,
        summary: `${account.account_name || account.institution} cash changed.`,
        occurredAt,
      });
    }
  }

  for (const account of args.previous?.cashAccounts ?? []) {
    if (!currentCashMap.has(account.id)) {
      events.push({
        id: makeId(),
        snapshotId: args.snapshotId,
        kind: "cash_removed",
        entityType: "cash",
        entityId: account.id,
        entityName: account.account_name || account.institution,
        amountDelta: null,
        summary: `Removed cash account ${account.account_name || account.institution}.`,
        occurredAt,
      });
    }
  }

  if (
    !args.previous ||
    JSON.stringify(args.current.setup) !== JSON.stringify(args.previous.setup)
  ) {
    events.push({
      id: makeId(),
      snapshotId: args.snapshotId,
      kind: "setup_changed",
      entityType: "setup",
      entityId: "setup",
      entityName: "Setup",
      amountDelta: null,
      summary: "Updated payoff settings.",
      occurredAt,
    });
  }

  return events;
}
