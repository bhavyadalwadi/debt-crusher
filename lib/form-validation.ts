import type {
  CashAccountInput,
  CreditCardInput,
  PortfolioState,
  SetupConfig,
} from "@/lib/types";

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export function validateSetup(
  setup: SetupConfig,
): FieldErrors<
  | "extra_payment_budget"
  | "promo_end_soon_days"
  | "global_cash_buffer_override"
  | "payoff_strategy"
  | "custom_strategy_weights"
> {
  const errors: FieldErrors<
    | "extra_payment_budget"
    | "promo_end_soon_days"
    | "global_cash_buffer_override"
    | "payoff_strategy"
    | "custom_strategy_weights"
  > = {};

  if (setup.extra_payment_budget < 0) {
    errors.extra_payment_budget = "Extra payment budget cannot be negative.";
  }

  if (setup.promo_end_soon_days < 1 || setup.promo_end_soon_days > 365) {
    errors.promo_end_soon_days = "Promo threshold should be between 1 and 365 days.";
  }

  if (
    setup.global_cash_buffer_override !== null &&
    setup.global_cash_buffer_override < 0
  ) {
    errors.global_cash_buffer_override = "Cash buffer override cannot be negative.";
  }

  if (
    setup.payoff_strategy !== "avalanche" &&
    setup.payoff_strategy !== "snowball" &&
    setup.payoff_strategy !== "promo-first" &&
    setup.payoff_strategy !== "custom"
  ) {
    errors.payoff_strategy = "Choose a valid payoff strategy.";
  }

  const weightValues = Object.values(setup.custom_strategy_weights);
  if (weightValues.some((value) => value < 0 || !Number.isFinite(value))) {
    errors.custom_strategy_weights =
      "Custom strategy weights must be non-negative numbers.";
  }

  return errors;
}

export function validateCreditAccounts(accounts: CreditCardInput[]) {
  const errorsById: Record<string, FieldErrors> = {};
  const messages: string[] = [];

  for (const account of accounts) {
    const errors: FieldErrors = {};

    if (!account.institution.trim()) {
      errors.institution = "Institution is required.";
    }

    if (!account.nickname.trim()) {
      errors.nickname = "Nickname is required.";
    }

    if (account.current_balance < 0) {
      errors.current_balance = "Balance cannot be negative.";
    }

    if (account.credit_limit !== null && account.credit_limit < 0) {
      errors.credit_limit = "Credit limit cannot be negative.";
    }

    if (account.apr_percent < 0 || account.apr_percent > 99.99) {
      errors.apr_percent = "APR should be between 0 and 99.99.";
    }

    if (account.min_payment < 0) {
      errors.min_payment = "Minimum payment cannot be negative.";
    }

    if (account.interest_fees_this_month < 0) {
      errors.interest_fees_this_month =
        "Interest and fees this month cannot be negative.";
    }

    if (account.credit_limit !== null && account.current_balance > account.credit_limit) {
      errors.credit_limit = "Balance is above the credit limit entered.";
    }

    if (account.promo_flag && !account.promo_end_date) {
      errors.promo_end_date = "Promo cards should include a promo end date.";
    }

    if (
      typeof account.auto_payment === "string" &&
      account.auto_payment.trim().length > 120
    ) {
      errors.auto_payment = "Auto payment note is too long.";
    }

    if (Object.keys(errors).length > 0) {
      errorsById[account.id] = errors;
      messages.push(account.nickname.trim() || account.institution.trim() || "Unnamed card");
    }
  }

  return {
    errorsById,
    hasErrors: messages.length > 0,
    message:
      messages.length > 0
        ? `${messages.length} card${messages.length === 1 ? "" : "s"} need attention before saving.`
        : null,
  };
}

export function validateCashAccounts(accounts: CashAccountInput[]) {
  const errorsById: Record<string, FieldErrors> = {};
  const messages: string[] = [];

  for (const account of accounts) {
    const errors: FieldErrors = {};

    if (!account.institution.trim()) {
      errors.institution = "Institution is required.";
    }

    if (!account.account_name.trim()) {
      errors.account_name = "Account name is required.";
    }

    if (account.current_balance < 0) {
      errors.current_balance = "Balance cannot be negative.";
    }

    if (account.min_day_end_balance_required < 0) {
      errors.min_day_end_balance_required =
        "Minimum required balance cannot be negative.";
    }

    if (Object.keys(errors).length > 0) {
      errorsById[account.id] = errors;
      messages.push(
        account.account_name.trim() || account.institution.trim() || "Unnamed account",
      );
    }
  }

  return {
    errorsById,
    hasErrors: messages.length > 0,
    message:
      messages.length > 0
        ? `${messages.length} cash account${messages.length === 1 ? "" : "s"} need attention before saving.`
        : null,
  };
}

export function validatePortfolio(portfolio: PortfolioState) {
  const setupErrors = validateSetup(portfolio.setup);
  const credit = validateCreditAccounts(portfolio.creditAccounts);
  const cash = validateCashAccounts(portfolio.cashAccounts);

  return {
    hasErrors:
      Object.keys(setupErrors).length > 0 || credit.hasErrors || cash.hasErrors,
    setupErrors,
    credit,
    cash,
  };
}
