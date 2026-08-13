import { describe, expect, it } from "vitest";
import {
  autosaveRequestSchema,
  checkpointRequestSchema,
} from "@/app/api/portfolio/validation";
import { createDefaultCustomStrategyWeights } from "@/lib/portfolio";

const portfolio = {
  id: "default",
  updatedAt: "2026-08-12T12:00:00.000Z",
  setup: {
    extra_payment_budget: 500,
    promo_end_soon_days: 21,
    global_cash_buffer_override: null,
    payoff_strategy: "avalanche" as const,
    custom_strategy_weights: createDefaultCustomStrategyWeights(),
  },
  creditAccounts: [],
  cashAccounts: [],
};

describe("portfolio persistence API validation", () => {
  it("accepts a null first-save version", () => {
    const parsed = autosaveRequestSchema.parse({
      portfolio,
      persistenceVersion: null,
    });

    expect(parsed.expectedUpdatedAt).toBeNull();
  });

  it("accepts the expectedUpdatedAt compatibility name", () => {
    const parsed = autosaveRequestSchema.parse({
      portfolio,
      expectedUpdatedAt: portfolio.updatedAt,
    });

    expect(parsed.expectedUpdatedAt).toBe(portfolio.updatedAt);
  });

  it("rejects autosaves without an optimistic concurrency version", () => {
    expect(() => autosaveRequestSchema.parse({ portfolio })).toThrow();
  });

  it("rejects malformed numeric account data before it reaches Prisma", () => {
    expect(() =>
      checkpointRequestSchema.parse({
        portfolio: {
          ...portfolio,
          cashAccounts: [
            {
              id: "cash-1",
              institution: "Bank",
              account_name: "Checking",
              type: "checking",
              current_balance: "not-a-number",
              min_day_end_balance_required: 100,
            },
          ],
        },
        source: "manual_save",
      }),
    ).toThrow();
  });
});
