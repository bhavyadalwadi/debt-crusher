export type StatusFlag = "danger" | "warning" | "watch" | "paid" | "ok";
export type AppView = "dashboard" | "setup" | "monthly-review" | "credit-cards" | "cash-accounts" | "bank-sync" | "utilities";
export type PayoffStrategy = "avalanche" | "snowball" | "promo-first" | "custom";

export interface CustomStrategyWeights {
  interest_now: number;
  apr_percent: number;
  utilization_percent: number;
  promo_expired: number;
  promo_end_soon: number;
  balance_size: number;
  due_soon: number;
  statement_balance_autopay_penalty: number;
}

export interface SetupConfig {
  extra_payment_budget: number;
  promo_end_soon_days: number;
  global_cash_buffer_override: number | null;
  payoff_strategy: PayoffStrategy;
  custom_strategy_weights: CustomStrategyWeights;
}

export interface CreditCardInput {
  id: string;
  institution: string;
  nickname: string;
  account_type: "credit_card";
  current_balance: number;
  credit_limit: number | null;
  apr_percent: number;
  promo_flag: boolean;
  promo_end_date: string | null;
  min_payment: number;
  interest_fees_this_month: number;
  auto_payment: string | number | null;
  payment_due: string | null;
  how_are_we_taking_care_of_it: string;
  rewards_available: string | null;
  points_available: number | null;
}

export interface CreditCardAccount extends CreditCardInput {
  utilization_percent: number;
  paying_interest_now: boolean;
  statement_balance_autopay: boolean;
  promo_end_soon: boolean;
  priority_score: number;
  priority_rank: number;
  status_flag: StatusFlag;
}

export interface CashAccountInput {
  id: string;
  institution: string;
  account_name: string;
  type: string;
  current_balance: number;
  min_day_end_balance_required: number;
}

export interface CashAccount extends CashAccountInput {
  available_above_minimum: number;
  status_flag: Exclude<StatusFlag, "paid">;
}

export interface DashboardSummary {
  recommended_target_card: CreditCardAccount | null;
  recommended_target_reasons: string[];
  payoff_strategy: PayoffStrategy;
  total_credit_balance: number;
  weighted_utilization_percent: number;
  total_cash_above_minimums: number;
  extra_payment_budget: number;
  credit_danger_items: CreditCardAccount[];
  credit_warning_items: CreditCardAccount[];
  credit_watch_items: CreditCardAccount[];
  cash_danger_items: CashAccount[];
}

export interface SnapshotDelta {
  creditBalanceChange: number;
  cashAboveMinimumChange: number;
  extraPaymentBudgetChange: number;
}

export interface SnapshotChangeSummary {
  creditAccountsAdded: number;
  creditAccountsRemoved: number;
  cashAccountsAdded: number;
  cashAccountsRemoved: number;
}

export interface NamedDelta {
  name: string;
  delta: number;
}

export interface SnapshotChangeDetail {
  creditAddedNames: string[];
  creditRemovedNames: string[];
  cashAddedNames: string[];
  cashRemovedNames: string[];
  creditBalanceChanges: NamedDelta[];
  cashBalanceChanges: NamedDelta[];
  setupChanges: string[];
}

export interface ActivityEvent {
  id: string;
  snapshotId: string;
  kind:
    | "setup_changed"
    | "credit_added"
    | "credit_removed"
    | "credit_balance_changed"
    | "cash_added"
    | "cash_removed"
    | "cash_balance_changed";
  entityType: "setup" | "credit" | "cash";
  entityId: string;
  entityName: string;
  amountDelta: number | null;
  summary: string;
  occurredAt: string;
}

export interface ScreenshotImportExtraction {
  accountKind: "cash" | "credit";
  institution: string | null;
  accountName: string | null;
  currentBalance: number;
  availableBalance: number | null;
  capturedAt: string | null;
  balanceCandidates: number;
  lowConfidence: boolean;
}

export interface ScreenshotImportArtifactSummary {
  id: string;
  fileName: string;
  mimeType: string;
  extraction: ScreenshotImportExtraction;
}

export interface PortfolioState {
  id: string;
  updatedAt: string;
  setup: SetupConfig;
  creditAccounts: CreditCardInput[];
  cashAccounts: CashAccountInput[];
}

export interface ActivitySnapshot {
  id: string;
  source: "import" | "manual_save" | "screenshot_import";
  label: string;
  filename: string;
  importedAt: string;
  setup: SetupConfig;
  creditAccounts: CreditCardAccount[];
  cashAccounts: CashAccount[];
  dashboardSummary: DashboardSummary;
  deltaFromPrevious?: SnapshotDelta | null;
  changeSummary?: SnapshotChangeSummary | null;
  changeDetail?: SnapshotChangeDetail | null;
  sourceArtifact?: ScreenshotImportArtifactSummary | null;
}

export interface ImportSnapshot extends ActivitySnapshot {}

export interface WorkbookImportResult {
  success: boolean;
  snapshot: ImportSnapshot | null;
  errors: string[];
  warnings: string[];
}

/** The original, portfolio-only JSON backup shape. */
export interface LegacyPortfolioBackup {
  portfolio: PortfolioState;
}

/**
 * Complete JSON backup format. Keep this versioned so future migrations can
 * distinguish persisted history from older portfolio-only exports.
 */
export interface PortfolioBackupV2 {
  version: 2;
  exportedAt: string;
  portfolio: PortfolioState;
  snapshots: ActivitySnapshot[];
  events: ActivityEvent[];
}

export type PortfolioBackup = LegacyPortfolioBackup | PortfolioBackupV2;

/** Canonical restore input produced from either supported backup format. */
export interface NormalizedPortfolioBackup {
  sourceVersion: 1 | 2;
  exportedAt: string | null;
  portfolio: PortfolioState;
  snapshots: ActivitySnapshot[];
  events: ActivityEvent[];
}
