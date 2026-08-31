import type {
  ActivityEvent,
  ActivitySnapshot,
  CashAccountInput,
  CustomStrategyWeights,
  CreditCardInput,
  DashboardSummary,
  PortfolioState,
  ScreenshotImportArtifactSummary,
  ScreenshotImportExtraction,
  SetupConfig,
} from "@/lib/types";
import {
  createDefaultCustomStrategyWeights,
  CURRENT_PORTFOLIO_ID,
} from "@/lib/portfolio";

function normalizeCustomStrategyWeights(
  weights: Partial<CustomStrategyWeights> | null | undefined,
): CustomStrategyWeights {
  const defaults = createDefaultCustomStrategyWeights();
  return {
    interest_now: weights?.interest_now ?? defaults.interest_now,
    apr_percent: weights?.apr_percent ?? defaults.apr_percent,
    utilization_percent:
      weights?.utilization_percent ?? defaults.utilization_percent,
    promo_expired: weights?.promo_expired ?? defaults.promo_expired,
    promo_end_soon: weights?.promo_end_soon ?? defaults.promo_end_soon,
    balance_size: weights?.balance_size ?? defaults.balance_size,
    due_soon: weights?.due_soon ?? defaults.due_soon,
    statement_balance_autopay_penalty:
      weights?.statement_balance_autopay_penalty ??
      defaults.statement_balance_autopay_penalty,
  };
}

function normalizeSetup(setup: Partial<SetupConfig>): SetupConfig {
  return {
    extra_payment_budget: setup.extra_payment_budget ?? 0,
    promo_end_soon_days: setup.promo_end_soon_days ?? 21,
    global_cash_buffer_override: setup.global_cash_buffer_override ?? null,
    payoff_strategy:
      setup.payoff_strategy === "snowball" ||
      setup.payoff_strategy === "promo-first" ||
      setup.payoff_strategy === "custom"
        ? setup.payoff_strategy
        : "avalanche",
    custom_strategy_weights: normalizeCustomStrategyWeights(
      setup.custom_strategy_weights,
    ),
  };
}

function normalizeDashboardSummary(
  summary: Partial<DashboardSummary>,
  setup: SetupConfig,
): DashboardSummary {
  return {
    recommended_target_card: summary.recommended_target_card ?? null,
    recommended_target_reasons: summary.recommended_target_reasons ?? [],
    payoff_strategy: summary.payoff_strategy ?? setup.payoff_strategy,
    total_credit_balance: summary.total_credit_balance ?? 0,
    weighted_utilization_percent: summary.weighted_utilization_percent ?? 0,
    total_cash_above_minimums: summary.total_cash_above_minimums ?? 0,
    extra_payment_budget: summary.extra_payment_budget ?? setup.extra_payment_budget,
    credit_danger_items: summary.credit_danger_items ?? [],
    credit_warning_items: summary.credit_warning_items ?? [],
    credit_watch_items: summary.credit_watch_items ?? [],
    cash_danger_items: summary.cash_danger_items ?? [],
  };
}

export function portfolioStateToDb(portfolio: PortfolioState) {
  return {
    id: CURRENT_PORTFOLIO_ID,
    extraPaymentBudget: portfolio.setup.extra_payment_budget,
    promoEndSoonDays: portfolio.setup.promo_end_soon_days,
    globalCashBufferOverride: portfolio.setup.global_cash_buffer_override,
    payoffStrategy: portfolio.setup.payoff_strategy,
    customStrategyJson: JSON.stringify(portfolio.setup.custom_strategy_weights),
    updatedAt: new Date(portfolio.updatedAt),
  };
}

export function creditAccountToDb(
  account: CreditCardInput,
  position: number,
) {
  return {
    id: account.id,
    portfolioId: CURRENT_PORTFOLIO_ID,
    institution: account.institution,
    nickname: account.nickname,
    accountType: account.account_type,
    currentBalance: account.current_balance,
    creditLimit: account.credit_limit,
    aprPercent: account.apr_percent,
    promoFlag: account.promo_flag,
    promoEndDate: account.promo_end_date ? new Date(account.promo_end_date) : null,
    minPayment: account.min_payment,
    interestFeesThisMonth: account.interest_fees_this_month,
    autoPayment:
      account.auto_payment === null || account.auto_payment === undefined
        ? null
        : String(account.auto_payment),
    paymentDue: account.payment_due ? new Date(account.payment_due) : null,
    howAreWeTakingCareOfIt: account.how_are_we_taking_care_of_it,
    rewardsAvailable: account.rewards_available,
    pointsAvailable: account.points_available,
    position,
  };
}

export function cashAccountToDb(
  account: CashAccountInput,
  position: number,
) {
  return {
    id: account.id,
    portfolioId: CURRENT_PORTFOLIO_ID,
    institution: account.institution,
    accountName: account.account_name,
    type: account.type,
    currentBalance: account.current_balance,
    minDayEndBalanceRequired: account.min_day_end_balance_required,
    position,
  };
}

export function dbRowToPortfolioState(args: {
  portfolio: {
    id: string;
    updatedAt: Date;
    extraPaymentBudget: number;
    promoEndSoonDays: number;
    globalCashBufferOverride: number | null;
    payoffStrategy: string;
    customStrategyJson: string | null;
  };
  creditAccounts: Array<{
    id: string;
    institution: string;
    nickname: string;
    accountType: string;
    currentBalance: number;
    creditLimit: number | null;
    aprPercent: number;
    promoFlag: boolean;
    promoEndDate: Date | null;
    minPayment: number;
    interestFeesThisMonth: number;
    autoPayment: string | null;
    paymentDue: Date | null;
    howAreWeTakingCareOfIt: string;
    rewardsAvailable: string | null;
    pointsAvailable: number | null;
    position: number;
  }>;
  cashAccounts: Array<{
    id: string;
    institution: string;
    accountName: string;
    type: string;
    currentBalance: number;
    minDayEndBalanceRequired: number;
    position: number;
  }>;
}): PortfolioState {
  return {
    id: args.portfolio.id,
    updatedAt: args.portfolio.updatedAt.toISOString(),
    setup: {
      ...normalizeSetup({
        extra_payment_budget: args.portfolio.extraPaymentBudget,
        promo_end_soon_days: args.portfolio.promoEndSoonDays,
        global_cash_buffer_override: args.portfolio.globalCashBufferOverride,
        payoff_strategy: args.portfolio.payoffStrategy as SetupConfig["payoff_strategy"],
        custom_strategy_weights: normalizeCustomStrategyWeights(
          args.portfolio.customStrategyJson
            ? (JSON.parse(args.portfolio.customStrategyJson) as Partial<CustomStrategyWeights>)
            : undefined,
        ),
      }),
    },
    creditAccounts: args.creditAccounts
      .sort((a, b) => a.position - b.position)
      .map((account) => ({
        id: account.id,
        institution: account.institution,
        nickname: account.nickname,
        account_type: "credit_card",
        current_balance: account.currentBalance,
        credit_limit: account.creditLimit,
        apr_percent: account.aprPercent,
        promo_flag: account.promoFlag,
        promo_end_date: account.promoEndDate?.toISOString().slice(0, 10) ?? null,
        min_payment: account.minPayment,
        interest_fees_this_month: account.interestFeesThisMonth,
        auto_payment: account.autoPayment,
        payment_due: account.paymentDue?.toISOString().slice(0, 10) ?? null,
        how_are_we_taking_care_of_it: account.howAreWeTakingCareOfIt,
        rewards_available: account.rewardsAvailable,
        points_available: account.pointsAvailable,
      })),
    cashAccounts: args.cashAccounts
      .sort((a, b) => a.position - b.position)
      .map((account) => ({
        id: account.id,
        institution: account.institution,
        account_name: account.accountName,
        type: account.type,
        current_balance: account.currentBalance,
        min_day_end_balance_required: account.minDayEndBalanceRequired,
      })),
  };
}

export function activitySnapshotToDb(
  snapshot: ActivitySnapshot,
){
  return {
    id: snapshot.id,
    source: snapshot.source,
    label: snapshot.label,
    filename: snapshot.filename,
    importedAt: new Date(snapshot.importedAt),
    setupJson: JSON.stringify(snapshot.setup),
    creditAccountsJson: JSON.stringify(snapshot.creditAccounts),
    cashAccountsJson: JSON.stringify(snapshot.cashAccounts),
    dashboardSummaryJson: JSON.stringify(snapshot.dashboardSummary),
    changeDetailJson: snapshot.changeDetail
      ? JSON.stringify(snapshot.changeDetail)
      : null,
  };
}

export function screenshotImportArtifactToDb(args: {
  fileName: string;
  mimeType: string;
  imageData: Uint8Array;
  extractedText: string;
  extraction: ScreenshotImportExtraction;
}) {
  return {
    fileName: args.fileName,
    mimeType: args.mimeType,
    imageData: args.imageData,
    extractedText: args.extractedText,
    extractionJson: JSON.stringify(args.extraction),
  };
}

export function dbRowToActivitySnapshot(row: {
  id: string;
  source: string;
  label: string;
  filename: string;
  importedAt: Date;
  setupJson: string;
  creditAccountsJson: string;
  cashAccountsJson: string;
  dashboardSummaryJson: string;
  changeDetailJson?: string | null;
  importArtifact?: {
    id: string;
    fileName: string;
    mimeType: string;
    extractionJson: string;
  } | null;
}): ActivitySnapshot {
  const setup = normalizeSetup(JSON.parse(row.setupJson) as Partial<SetupConfig>);
  const dashboardSummary = normalizeDashboardSummary(
    JSON.parse(row.dashboardSummaryJson) as Partial<DashboardSummary>,
    setup,
  );

  return {
    id: row.id,
    source: row.source as ActivitySnapshot["source"],
    label: row.label,
    filename: row.filename,
    importedAt: row.importedAt.toISOString(),
    setup,
    creditAccounts: JSON.parse(
      row.creditAccountsJson,
    ) as ActivitySnapshot["creditAccounts"],
    cashAccounts: JSON.parse(
      row.cashAccountsJson,
    ) as ActivitySnapshot["cashAccounts"],
    dashboardSummary,
    changeDetail: row.changeDetailJson
      ? (JSON.parse(row.changeDetailJson) as ActivitySnapshot["changeDetail"])
      : null,
    sourceArtifact: row.importArtifact
      ? ({
          id: row.importArtifact.id,
          fileName: row.importArtifact.fileName,
          mimeType: row.importArtifact.mimeType,
          extraction: JSON.parse(
            row.importArtifact.extractionJson,
          ) as ScreenshotImportArtifactSummary["extraction"],
        })
      : null,
  };
}

export function activityEventToDb(event: ActivityEvent) {
  return {
    id: event.id,
    snapshotId: event.snapshotId,
    kind: event.kind,
    entityType: event.entityType,
    entityId: event.entityId,
    entityName: event.entityName,
    amountDelta: event.amountDelta,
    summary: event.summary,
    occurredAt: new Date(event.occurredAt),
  };
}

export function dbRowToActivityEvent(row: {
  id: string;
  snapshotId: string;
  kind: string;
  entityType: string;
  entityId: string;
  entityName: string;
  amountDelta: number | null;
  summary: string;
  occurredAt: Date;
}): ActivityEvent {
  return {
    id: row.id,
    snapshotId: row.snapshotId,
    kind: row.kind as ActivityEvent["kind"],
    entityType: row.entityType as ActivityEvent["entityType"],
    entityId: row.entityId,
    entityName: row.entityName,
    amountDelta: row.amountDelta,
    summary: row.summary,
    occurredAt: row.occurredAt.toISOString(),
  };
}
