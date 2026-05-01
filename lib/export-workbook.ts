import * as XLSX from "xlsx";
import type { PortfolioState } from "@/lib/types";

function toExcelDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : "";
}

export function exportPortfolioWorkbook(portfolio: PortfolioState): Blob {
  const workbook = XLSX.utils.book_new();

  const setupRows = [
    ["Setting", "Value"],
    ["Today", new Date().toISOString().slice(0, 10)],
    ["Monthly Extra Payment Budget", portfolio.setup.extra_payment_budget],
    ["Promo End Soon Days", portfolio.setup.promo_end_soon_days],
    ["Global Cash Buffer Override", portfolio.setup.global_cash_buffer_override ?? ""],
    ["Payoff Strategy", portfolio.setup.payoff_strategy],
    ["Custom Interest Now Weight", portfolio.setup.custom_strategy_weights.interest_now],
    ["Custom APR Weight", portfolio.setup.custom_strategy_weights.apr_percent],
    [
      "Custom Utilization Weight",
      portfolio.setup.custom_strategy_weights.utilization_percent,
    ],
    [
      "Custom Promo Expired Weight",
      portfolio.setup.custom_strategy_weights.promo_expired,
    ],
    ["Custom Promo Soon Weight", portfolio.setup.custom_strategy_weights.promo_end_soon],
    ["Custom Balance Size Weight", portfolio.setup.custom_strategy_weights.balance_size],
    ["Custom Due Soon Weight", portfolio.setup.custom_strategy_weights.due_soon],
    [
      "Custom Autopay Penalty Weight",
      portfolio.setup.custom_strategy_weights.statement_balance_autopay_penalty,
    ],
  ];

  const creditRows = [
    [
      "Institution",
      "Nickname",
      "Current Balance",
      "Credit Limit",
      "APR %",
      "0% Promo? (Y/N)",
      "Promo End Date",
      "Min Payment",
      "Interest/Fees This Month",
      "How are we Taking Care of it",
      "Rewards Available?",
      "Points Available?",
      "Auto payment",
      "Payment Due",
    ],
    ...portfolio.creditAccounts.map((account) => [
      account.institution,
      account.nickname,
      account.current_balance,
      account.credit_limit ?? "",
      account.apr_percent,
      account.promo_flag ? "Y" : "N",
      toExcelDate(account.promo_end_date),
      account.min_payment,
      account.interest_fees_this_month,
      account.how_are_we_taking_care_of_it,
      account.rewards_available ?? "",
      account.points_available ?? "",
      account.auto_payment ?? "",
      toExcelDate(account.payment_due),
    ]),
  ];

  const cashRows = [
    [
      "Institution",
      "Account Name",
      "Type (Checking/Savings)",
      "Current Balance",
      "Min Day-End Balance Required",
    ],
    ...portfolio.cashAccounts.map((account) => [
      account.institution,
      account.account_name,
      account.type,
      account.current_balance,
      account.min_day_end_balance_required,
    ]),
  ];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(setupRows), "Setup");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(creditRows),
    "Credit_Cards",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(cashRows),
    "Cash_Accounts",
  );

  const arrayBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;

  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
