import { describe, expect, it } from "vitest";
import {
  assessPromotion,
  buildCashForecast,
  occurrenceDate,
  resolveAutopayAmount,
} from "../lib/operations";

describe("operations core", () => {
  it("clamps monthly occurrences to the final day of short months", () => {
    expect(occurrenceDate(2027, 1, 31).toISOString().slice(0, 10)).toBe("2027-02-28");
    expect(occurrenceDate(2028, 1, 31).toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("resolves authoritative autopay amounts and preserves unknowns", () => {
    const card = { id: "card", nickname: "Card", currentBalance: "1000", statementBalance: "500", minimumPaymentDue: "35", purchaseApr: "20", paymentDueDay: 17 };
    expect(resolveAutopayAmount(card, { id: "rule", cardId: "card", mode: "STATEMENT_BALANCE", executionOffsetDays: 0, active: true }, [], "2026-08-01").amount).toBe("500.00");
    expect(resolveAutopayAmount({ ...card, statementBalance: null }, { id: "rule", cardId: "card", mode: "STATEMENT_BALANCE", executionOffsetDays: 0, active: true }, [], "2026-08-01").unknownReason).toContain("unknown");
  });

  it("models mortgage competition and reports the first buffer breach", () => {
    const [forecast] = buildCashForecast({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      accounts: [{ id: "chase", name: "Chase checking", currentBalance: "5000", minimumRequiredBalance: "500" }],
      cards: [{ id: "card", nickname: "Card", currentBalance: "1000", statementBalance: "1000", purchaseApr: "20", paymentDueDay: 12 }],
      autopayRules: [{ id: "rule", cardId: "card", fundingAccountId: "chase", mode: "STATEMENT_BALANCE", executionDay: 12, executionOffsetDays: 0, active: true }],
      promotions: [],
      recurringTransactions: [{ id: "mortgage", name: "Mortgage", type: "EXPENSE", amount: "3718.11", dayOfMonth: 10, sourceAccountId: "chase", active: true }],
    });
    expect(forecast.projectedFinalBalance).toBe("281.89");
    expect(forecast.firstShortfallDate).toBe("2026-08-12");
    expect(forecast.shortfallAmount).toBe("218.11");
  });

  it("treats transfers as paired movements", () => {
    const forecasts = buildCashForecast({
      startDate: "2026-08-01", endDate: "2026-08-31",
      accounts: [
        { id: "checking", name: "Checking", currentBalance: "1000", minimumRequiredBalance: "0" },
        { id: "savings", name: "Savings", currentBalance: "0", minimumRequiredBalance: "0" },
      ], cards: [], autopayRules: [], promotions: [],
      recurringTransactions: [{ id: "transfer", name: "Savings transfer", type: "TRANSFER", amount: "250", dayOfMonth: 5, sourceAccountId: "checking", destinationAccountId: "savings", active: true }],
    });
    expect(forecasts.map((item) => item.projectedFinalBalance)).toEqual(["750.00", "250.00"]);
  });

  it("marks an underfunded promo plan at risk", () => {
    const result = assessPromotion({ id: "promo", cardId: "card", currentPromoBalance: "12000", endDate: "2027-06-01", targetPayoffDate: "2027-06-01", safetyBufferDays: 14, deferredInterest: true, active: true }, "2026-12-01", "1000");
    expect(Number(result.requiredMonthlyPayment)).toBeGreaterThan(1000);
    expect(result.riskStatus).toBe("AT_RISK");
    expect(result.reasons.join(" ")).toContain("Deferred interest");
  });
});
