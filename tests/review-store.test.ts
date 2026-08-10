import { describe, expect, it } from "vitest";
import { currentReviewMonth } from "../lib/review-store";

describe("monthly review periods", () => {
  it("uses a stable calendar-month key", () => {
    expect(currentReviewMonth(new Date("2026-08-31T23:59:59.000Z"))).toBe("2026-08");
    expect(currentReviewMonth(new Date("2026-09-01T00:00:00.000Z"))).toBe("2026-09");
  });
});
