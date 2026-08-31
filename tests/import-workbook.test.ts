import { describe, expect, it } from "vitest";
import { buildDashboardSummary, deriveCashAccounts, deriveCreditAccounts } from "@/lib/derived";
import { importWorkbook } from "@/lib/import-workbook";
import {
  buildActivityEvents,
  buildSnapshotChangeDetail,
  buildSnapshotChangeSummary,
  buildSnapshotDelta,
  createDefaultCustomStrategyWeights,
} from "@/lib/portfolio";
import type { SetupConfig } from "@/lib/types";
import { writeWorkbookSheets } from "@/lib/workbook-file";

function workbookFileFromSheets(
  sheets: Record<string, Record<string, unknown>[]>,
  name = "snapshot.xlsx",
) {
  const matrices = Object.fromEntries(Object.entries(sheets).map(([sheetName, rows]) => {
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return [sheetName, [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]];
  }));

  return {
    name,
    arrayBuffer: async () => writeWorkbookSheets(matrices),
  };
}

function workbookFileFromMatrixSheets(
  sheets: Record<string, unknown[][]>,
  name = "matrix-snapshot.xlsx",
) {
  return {
    name,
    arrayBuffer: async () => writeWorkbookSheets(sheets),
  };
}

const baseSetup: SetupConfig = {
  extra_payment_budget: 600,
  promo_end_soon_days: 21,
  global_cash_buffer_override: null,
  payoff_strategy: "avalanche",
  custom_strategy_weights: createDefaultCustomStrategyWeights(),
};

describe("importWorkbook", () => {
  it("imports a valid workbook with safe optional defaults", async () => {
    const result = await importWorkbook(
      workbookFileFromSheets({
        Setup: [
          {
            extra_payment_budget: 600,
            promo_end_soon_days: 21,
          },
        ],
        Credit_Cards: [
          {
            institution: "Chase",
            nickname: "Freedom",
            current_balance: 2400,
            credit_limit: 5000,
            apr_percent: 24.99,
            min_payment: 75,
            interest_fees_this_month: 24.12,
            auto_payment: 75,
            payment_due: "2026-05-07",
            how_are_we_taking_care_of_it: "Focus card",
          },
        ],
        Cash_Accounts: [
          {
            institution: "Ally",
            account_name: "Emergency",
            type: "savings",
            current_balance: 9000,
            min_day_end_balance_required: 3000,
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.snapshot?.setup.payoff_strategy).toBe("avalanche");
    expect(result.snapshot?.creditAccounts[0].promo_flag).toBe(false);
    expect(result.snapshot?.creditAccounts[0].rewards_available).toBeNull();
    expect(result.snapshot?.cashAccounts[0].available_above_minimum).toBe(6000);
  });

  it("returns actionable sheet and column validation errors", async () => {
    const result = await importWorkbook(
      workbookFileFromSheets({
        Setup: [
          {
            extra_payment_budget: 600,
            promo_end_soon_days: 21,
          },
        ],
        Credit_Cards: [
          {
            institution: "Amex",
            nickname: "Blue",
            current_balance: 1000,
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Missing required sheet: Cash_Accounts");
    expect(
      result.errors.some((error) =>
        error.includes("Credit_Cards is missing required columns"),
      ),
    ).toBe(true);
  });

  it("imports the styled workbook layout with key value setup rows", async () => {
    const result = await importWorkbook(
      workbookFileFromMatrixSheets(
        {
        Setup: [
          ["Setting", "Value"],
          ["Today", "2026-03-17"],
          ["Monthly Extra Payment Budget", 450],
          ["Minimum Cash Buffer (Checking)", 125],
          ["Minimum Cash Buffer (Savings)", 300],
        ],
        Credit_Cards: [
          [
            "Card (Nickname)",
            "Current Balance",
            "Credit Limit",
            "Utilization %",
            "APR %",
            "0% Promo? (Y/N)",
            "Promo End Date",
            "Promo End soon",
            "Min Payment",
            "Interest/Fees This Month",
            "Paying Interest Now?",
            "Priority Score",
            "Priority Rank",
            "How are we Talking Care of it",
            "Rewards Available?",
            "Points Available?",
            "Auto payment",
            "Payment Due",
          ],
          [
            "Citi 1",
            4088.99,
            5000,
            0.8178,
            25.24,
            "Y",
            46157,
            "DANGER",
            "",
            0,
            "NO",
            1032.06,
            2,
            "Minimum bal due $41",
            0,
            0,
            "Minimum Payment due",
            "May 21st",
          ],
        ],
        Cash_Accounts: [
          [
            "Institution",
            "Account Name",
            "Type (Checking/Savings)",
            "Current Balance",
            "Min Day-End Balance Required",
            "",
          ],
          ["BMO", "", "Checking", 100, "No Requirement but keep $100 just for sake of it.", ""],
          ["CapitalOne", "", "Savings", 200, "", ""],
        ],
        },
        "styled.xlsx",
      ),
    );

    expect(result.success).toBe(true);
    expect(result.snapshot?.setup.extra_payment_budget).toBe(450);
    expect(result.warnings[0]).toContain('Promo End Soon Days');
    expect(result.snapshot?.creditAccounts[0].institution).toBe("Citi 1");
    expect(result.snapshot?.creditAccounts[0].nickname).toBe("Citi 1");
    expect(result.snapshot?.creditAccounts[0].auto_payment).toBe(
      "Minimum Payment due",
    );
    expect(result.snapshot?.creditAccounts[0].payment_due).toBe("2026-05-21");
    expect(result.snapshot?.cashAccounts[0].min_day_end_balance_required).toBe(100);
    expect(result.snapshot?.cashAccounts[1].min_day_end_balance_required).toBe(300);
  });

  it("ignores unlabeled summary rows in the credit sheet", async () => {
    const result = await importWorkbook(
      workbookFileFromMatrixSheets(
        {
          Setup: [
            ["Setting", "Value"],
            ["Today", "2026-03-17"],
            ["Monthly Extra Payment Budget", 450],
          ],
          Credit_Cards: [
            [
              "Card (Nickname)",
              "Current Balance",
              "Credit Limit",
              "APR %",
              "0% Promo? (Y/N)",
              "Promo End Date",
              "Min Payment",
              "Interest/Fees This Month",
              "How are we Talking Care of it",
              "Rewards Available?",
              "Points Available?",
              "Auto payment",
              "Payment Due",
            ],
            [
              "Amex",
              183,
              74400,
              26.49,
              "N",
              "",
              "",
              4.04,
              "Autopay",
              78.05,
              0,
              "Statement Balance",
              "May 16th",
            ],
            ["", 183, "", "", "", "", "", "", "", "", "", "", ""],
          ],
          Cash_Accounts: [
            [
              "Institution",
              "Account Name",
              "Type (Checking/Savings)",
              "Current Balance",
              "Min Day-End Balance Required",
            ],
            ["BMO", "", "Checking", 100, 100],
          ],
        },
        "summary-row.xlsx",
      ),
    );

    expect(result.success).toBe(true);
    expect(result.snapshot?.creditAccounts).toHaveLength(1);
    expect(result.snapshot?.dashboardSummary.total_credit_balance).toBe(183);
  });
});

describe("derived logic", () => {
  it("marks paying_interest_now only when balance and fees are positive", () => {
    const cards = deriveCreditAccounts(
      [
        {
          id: "a",
          institution: "Bank A",
          nickname: "Interest",
          account_type: "credit_card",
          current_balance: 1200,
          credit_limit: 4000,
          apr_percent: 25,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 40,
          interest_fees_this_month: 12,
          auto_payment: 40,
          payment_due: "2026-05-06",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
        {
          id: "b",
          institution: "Bank B",
          nickname: "No Interest",
          account_type: "credit_card",
          current_balance: 1200,
          credit_limit: 4000,
          apr_percent: 29,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 40,
          interest_fees_this_month: 0,
          auto_payment: 40,
          payment_due: "2026-05-06",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      baseSetup,
      "2026-04-30",
    );

    expect(cards[0].paying_interest_now).toBe(true);
    expect(cards[1].paying_interest_now).toBe(false);
    expect(cards[0].priority_rank).toBe(1);
  });

  it("handles missing credit limits safely and sends zero-balance cards to the bottom", () => {
    const cards = deriveCreditAccounts(
      [
        {
          id: "a",
          institution: "Zero",
          nickname: "Paid Card",
          account_type: "credit_card",
          current_balance: 0,
          credit_limit: null,
          apr_percent: 18,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 0,
          interest_fees_this_month: 0,
          auto_payment: 0,
          payment_due: null,
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
        {
          id: "b",
          institution: "Live",
          nickname: "Active Card",
          account_type: "credit_card",
          current_balance: 500,
          credit_limit: null,
          apr_percent: 15,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 20,
          interest_fees_this_month: 0,
          auto_payment: 20,
          payment_due: null,
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      baseSetup,
      "2026-04-30",
    );

    const paidCard = cards.find((card) => card.id === "a");
    const activeCard = cards.find((card) => card.id === "b");

    expect(activeCard?.utilization_percent).toBe(0);
    expect(paidCard?.status_flag).toBe("paid");
    expect((paidCard?.priority_rank ?? 0) > (activeCard?.priority_rank ?? 0)).toBe(
      true,
    );
  });

  it("flips promo urgency around the configured threshold", () => {
    const cards = deriveCreditAccounts(
      [
        {
          id: "promo",
          institution: "Promo Bank",
          nickname: "Promo Card",
          account_type: "credit_card",
          current_balance: 3000,
          credit_limit: 6000,
          apr_percent: 9.99,
          promo_flag: true,
          promo_end_date: "2026-05-10",
          min_payment: 50,
          interest_fees_this_month: 0,
          auto_payment: 50,
          payment_due: "2026-05-14",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      { ...baseSetup, promo_end_soon_days: 10 },
      "2026-04-30",
    );

    expect(cards[0].promo_end_soon).toBe(true);
    expect(cards[0].status_flag).toBe("warning");
  });

  it("prefers smaller balances in snowball mode when no card is charging interest", () => {
    const cards = deriveCreditAccounts(
      [
        {
          id: "small",
          institution: "Bank A",
          nickname: "Small Balance",
          account_type: "credit_card",
          current_balance: 700,
          credit_limit: 4000,
          apr_percent: 12,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 25,
          interest_fees_this_month: 0,
          auto_payment: 25,
          payment_due: "2026-05-12",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
        {
          id: "apr",
          institution: "Bank B",
          nickname: "High APR",
          account_type: "credit_card",
          current_balance: 4200,
          credit_limit: 6000,
          apr_percent: 29,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 70,
          interest_fees_this_month: 0,
          auto_payment: 70,
          payment_due: "2026-05-12",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      { ...baseSetup, payoff_strategy: "snowball" },
      "2026-04-30",
    );

    expect(cards.find((card) => card.id === "small")?.priority_rank).toBe(1);
  });

  it("prefers expiring promo balances in promo-first mode", () => {
    const cards = deriveCreditAccounts(
      [
        {
          id: "promo",
          institution: "Bank A",
          nickname: "Promo Card",
          account_type: "credit_card",
          current_balance: 3800,
          credit_limit: 8000,
          apr_percent: 9,
          promo_flag: true,
          promo_end_date: "2026-05-04",
          min_payment: 40,
          interest_fees_this_month: 0,
          auto_payment: 40,
          payment_due: "2026-05-20",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
        {
          id: "apr",
          institution: "Bank B",
          nickname: "High APR",
          account_type: "credit_card",
          current_balance: 3800,
          credit_limit: 8000,
          apr_percent: 24,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 40,
          interest_fees_this_month: 0,
          auto_payment: 40,
          payment_due: "2026-05-20",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      { ...baseSetup, payoff_strategy: "promo-first" },
      "2026-04-30",
    );

    expect(cards.find((card) => card.id === "promo")?.priority_rank).toBe(1);
  });

  it("uses custom strategy weights when custom mode is selected", () => {
    const cards = deriveCreditAccounts(
      [
        {
          id: "small",
          institution: "Bank A",
          nickname: "Small Balance",
          account_type: "credit_card",
          current_balance: 500,
          credit_limit: 5000,
          apr_percent: 10,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 25,
          interest_fees_this_month: 0,
          auto_payment: 25,
          payment_due: "2026-05-12",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
        {
          id: "apr",
          institution: "Bank B",
          nickname: "High APR",
          account_type: "credit_card",
          current_balance: 5000,
          credit_limit: 6000,
          apr_percent: 29,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 75,
          interest_fees_this_month: 0,
          auto_payment: 75,
          payment_due: "2026-05-12",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      {
        ...baseSetup,
        payoff_strategy: "custom",
        custom_strategy_weights: {
          ...baseSetup.custom_strategy_weights,
          balance_size: 10,
          apr_percent: 1,
          utilization_percent: 0,
        },
      },
      "2026-04-30",
    );

    expect(cards.find((card) => card.id === "small")?.priority_rank).toBe(1);
  });

  it("downgrades statement-balance autopay cards from danger to watch", () => {
    const cards = deriveCreditAccounts(
      [
        {
          id: "watch-card",
          institution: "Chase",
          nickname: "Freedom",
          account_type: "credit_card",
          current_balance: 900,
          credit_limit: 5000,
          apr_percent: 24.99,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 40,
          interest_fees_this_month: 18,
          auto_payment: "Statement Balance",
          payment_due: "2026-05-16",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      baseSetup,
      "2026-04-30",
    );

    expect(cards[0].paying_interest_now).toBe(true);
    expect(cards[0].statement_balance_autopay).toBe(true);
    expect(cards[0].status_flag).toBe("watch");
  });

  it("computes cash buffer using the global override when present", () => {
    const cashAccounts = deriveCashAccounts(
      [
        {
          id: "cash-1",
          institution: "Ally",
          account_name: "Checking",
          type: "checking",
          current_balance: 2000,
          min_day_end_balance_required: 500,
        },
      ],
      {
        ...baseSetup,
        global_cash_buffer_override: 1800,
      },
    );

    expect(cashAccounts[0].available_above_minimum).toBe(200);
  });

  it("builds dashboard totals from imported rows", () => {
    const creditAccounts = deriveCreditAccounts(
      [
        {
          id: "1",
          institution: "Bank A",
          nickname: "Card A",
          account_type: "credit_card",
          current_balance: 2000,
          credit_limit: 4000,
          apr_percent: 20,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 40,
          interest_fees_this_month: 10,
          auto_payment: 40,
          payment_due: "2026-05-08",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
        {
          id: "2",
          institution: "Bank B",
          nickname: "Card B",
          account_type: "credit_card",
          current_balance: 1000,
          credit_limit: 2000,
          apr_percent: 10,
          promo_flag: false,
          promo_end_date: null,
          min_payment: 20,
          interest_fees_this_month: 0,
          auto_payment: 20,
          payment_due: "2026-05-18",
          how_are_we_taking_care_of_it: "",
          rewards_available: null,
          points_available: null,
        },
      ],
      baseSetup,
      "2026-04-30",
    );
    const cashAccounts = deriveCashAccounts(
      [
        {
          id: "cash",
          institution: "Ally",
          account_name: "Savings",
          type: "savings",
          current_balance: 4000,
          min_day_end_balance_required: 1000,
        },
      ],
      baseSetup,
    );
    const summary = buildDashboardSummary({
      setup: baseSetup,
      creditAccounts,
      cashAccounts,
    });

    expect(summary.total_credit_balance).toBe(3000);
    expect(summary.weighted_utilization_percent).toBe(50);
    expect(summary.total_cash_above_minimums).toBe(3000);
    expect(summary.payoff_strategy).toBe("avalanche");
    expect(summary.recommended_target_card?.id).toBe("1");
    expect(summary.recommended_target_reasons.length).toBeGreaterThan(0);
  });

  it("computes snapshot deltas against the previous save", () => {
    const delta = buildSnapshotDelta(
      {
        dashboardSummary: {
          recommended_target_card: null,
          recommended_target_reasons: [],
          payoff_strategy: "avalanche",
          total_credit_balance: 1500,
          weighted_utilization_percent: 0,
          total_cash_above_minimums: 1200,
          extra_payment_budget: 300,
          credit_danger_items: [],
          credit_warning_items: [],
          credit_watch_items: [],
          cash_danger_items: [],
        },
      },
      {
        dashboardSummary: {
          recommended_target_card: null,
          recommended_target_reasons: [],
          payoff_strategy: "avalanche",
          total_credit_balance: 1800,
          weighted_utilization_percent: 0,
          total_cash_above_minimums: 900,
          extra_payment_budget: 250,
          credit_danger_items: [],
          credit_warning_items: [],
          credit_watch_items: [],
          cash_danger_items: [],
        },
      },
    );

    expect(delta).toEqual({
      creditBalanceChange: -300,
      cashAboveMinimumChange: 300,
      extraPaymentBudgetChange: 50,
    });
  });

  it("computes snapshot change summaries for added and removed accounts", () => {
    const summary = buildSnapshotChangeSummary(
      {
        creditAccounts: [{ id: "card-1" }, { id: "card-2" }] as never,
        cashAccounts: [{ id: "cash-1" }] as never,
      },
      {
        creditAccounts: [{ id: "card-2" }, { id: "card-3" }] as never,
        cashAccounts: [{ id: "cash-2" }] as never,
      },
    );

    expect(summary).toEqual({
      creditAccountsAdded: 1,
      creditAccountsRemoved: 1,
      cashAccountsAdded: 1,
      cashAccountsRemoved: 1,
    });
  });

  it("builds named change details for account movement", () => {
    const detail = buildSnapshotChangeDetail(
      {
        setup: baseSetup,
        creditAccounts: [
          { id: "card-1", nickname: "Freedom", institution: "Chase", current_balance: 400 } as never,
          { id: "card-2", nickname: "Citi", institution: "Citi", current_balance: 900 } as never,
        ],
        cashAccounts: [
          { id: "cash-1", account_name: "Checking", institution: "BMO", current_balance: 1200 } as never,
        ],
      },
      {
        setup: { ...baseSetup, extra_payment_budget: 500 },
        creditAccounts: [
          { id: "card-1", nickname: "Freedom", institution: "Chase", current_balance: 650 } as never,
        ],
        cashAccounts: [
          { id: "cash-2", account_name: "Savings", institution: "Ally", current_balance: 800 } as never,
        ],
      },
    );

    expect(detail?.creditAddedNames).toContain("Citi");
    expect(detail?.cashRemovedNames).toContain("Savings");
    expect(detail?.setupChanges).toContain("extra payment budget");
    expect(detail?.creditBalanceChanges[0]?.name).toBe("Freedom");
  });

  it("builds activity events from portfolio changes", () => {
    const events = buildActivityEvents({
      snapshotId: "snap-1",
      current: {
        id: "current",
        updatedAt: "2026-05-01T12:00:00.000Z",
        setup: baseSetup,
        creditAccounts: [
          {
            id: "card-1",
            institution: "Chase",
            nickname: "Freedom",
            account_type: "credit_card",
            current_balance: 400,
            credit_limit: 5000,
            apr_percent: 10,
            promo_flag: false,
            promo_end_date: null,
            min_payment: 25,
            interest_fees_this_month: 0,
            auto_payment: 25,
            payment_due: null,
            how_are_we_taking_care_of_it: "",
            rewards_available: null,
            points_available: null,
          },
        ],
        cashAccounts: [],
      },
      previous: {
        id: "current",
        updatedAt: "2026-04-30T12:00:00.000Z",
        setup: { ...baseSetup, extra_payment_budget: 500 },
        creditAccounts: [
          {
            id: "card-1",
            institution: "Chase",
            nickname: "Freedom",
            account_type: "credit_card",
            current_balance: 650,
            credit_limit: 5000,
            apr_percent: 10,
            promo_flag: false,
            promo_end_date: null,
            min_payment: 25,
            interest_fees_this_month: 0,
            auto_payment: 25,
            payment_due: null,
            how_are_we_taking_care_of_it: "",
            rewards_available: null,
            points_available: null,
          },
        ],
        cashAccounts: [],
      },
    });

    expect(events.some((event) => event.kind === "credit_balance_changed")).toBe(true);
    expect(events.some((event) => event.kind === "setup_changed")).toBe(true);
  });
});
