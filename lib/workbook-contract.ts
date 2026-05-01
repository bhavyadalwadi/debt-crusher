export const WORKBOOK_SHEETS = {
  setup: "Setup",
  creditCards: "Credit_Cards",
  cashAccounts: "Cash_Accounts",
} as const;

export const REQUIRED_HEADERS = {
  Setup: ["extra_payment_budget", "promo_end_soon_days"],
  Credit_Cards: [
    "institution",
    "nickname",
    "current_balance",
    "credit_limit",
    "apr_percent",
    "min_payment",
    "interest_fees_this_month",
    "auto_payment",
    "payment_due",
    "how_are_we_taking_care_of_it",
  ],
  Cash_Accounts: [
    "institution",
    "account_name",
    "type",
    "current_balance",
    "min_day_end_balance_required",
  ],
} as const;

export const OPTIONAL_HEADERS = {
  Setup: [
    "global_cash_buffer_override",
    "payoff_strategy",
    "custom_interest_now_weight",
    "custom_apr_weight",
    "custom_utilization_weight",
    "custom_promo_expired_weight",
    "custom_promo_soon_weight",
    "custom_balance_size_weight",
    "custom_due_soon_weight",
    "custom_autopay_penalty_weight",
  ],
  Credit_Cards: [
    "promo_flag",
    "promo_end_date",
    "rewards_available",
    "points_available",
  ],
  Cash_Accounts: [],
} as const;
