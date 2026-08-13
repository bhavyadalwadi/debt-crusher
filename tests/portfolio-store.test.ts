import { describe, expect, it } from "vitest";
import { portfoliosMatchCheckpoint } from "@/lib/portfolio-store";
import { createEmptyPortfolio } from "@/lib/portfolio";

describe("checkpoint duplicate detection", () => {
  it("ignores timestamps while matching the same financial state", () => {
    const previous = createEmptyPortfolio();
    const current = {
      ...previous,
      updatedAt: new Date(Date.now() + 1_000).toISOString(),
    };

    expect(portfoliosMatchCheckpoint(previous, current)).toBe(true);
  });

  it("detects a changed setup value", () => {
    const previous = createEmptyPortfolio();
    const current = {
      ...previous,
      setup: { ...previous.setup, extra_payment_budget: 125 },
    };

    expect(portfoliosMatchCheckpoint(previous, current)).toBe(false);
  });
});
