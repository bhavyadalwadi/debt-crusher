import { describe, expect, it } from "vitest";
import { exportPortfolioWorkbook } from "@/lib/export-workbook";
import { importWorkbook } from "@/lib/import-workbook";
import { createCashAccountInput, createCreditCardInput, createEmptyPortfolio } from "@/lib/portfolio";

describe("workbook export", () => {
  it("round-trips trusted portfolio values through an XLSX file", async () => {
    const card = {
      ...createCreditCardInput(),
      institution: "Test Credit Union",
      nickname: "Rewards",
      current_balance: 1234.56,
      credit_limit: 8000,
      apr_percent: 19.99,
      min_payment: 45,
      interest_fees_this_month: 12.34,
      auto_payment: 45,
      payment_due: "2026-09-18",
    };
    const cash = {
      ...createCashAccountInput(),
      institution: "Test Bank",
      account_name: "Checking",
      type: "checking",
      current_balance: 4321.09,
      min_day_end_balance_required: 1000,
    };
    const portfolio = {
      ...createEmptyPortfolio(),
      creditAccounts: [card],
      cashAccounts: [cash],
    };

    const blob = await exportPortfolioWorkbook(portfolio);
    const result = await importWorkbook({
      name: "round-trip.xlsx",
      arrayBuffer: () => blob.arrayBuffer(),
    });

    expect(result.success).toBe(true);
    expect(result.snapshot?.creditAccounts[0]).toMatchObject({
      institution: card.institution,
      nickname: card.nickname,
      current_balance: card.current_balance,
      credit_limit: card.credit_limit,
      apr_percent: card.apr_percent,
      payment_due: card.payment_due,
    });
    expect(result.snapshot?.cashAccounts[0]).toMatchObject({
      institution: cash.institution,
      account_name: cash.account_name,
      current_balance: cash.current_balance,
      min_day_end_balance_required: cash.min_day_end_balance_required,
    });
  });
});
