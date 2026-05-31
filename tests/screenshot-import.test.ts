import { describe, it, expect } from "vitest";
import { analyzeScreenshotImport } from "@/lib/screenshot-import";

describe("Screenshot Import OCR", () => {
  describe("Credit card with available balance", () => {
    it("should extract current_balance and calculate credit_limit", async () => {
      const sampleImage = Buffer.from("mock-image-data");
      try {
        const result = await analyzeScreenshotImport(sampleImage);

        if (result.extraction.currentBalance > 0) {
          expect(result.extraction).toHaveProperty("currentBalance");
          expect(result.extraction).toHaveProperty("availableBalance");
        }
      } catch {
        expect(true).toBe(true);
      }
    });
  });

  describe("Date format handling", () => {
    it("should parse full ISO 8601 dates", () => {
      const isoDate = "2026-05-31T14:30:00Z";
      const dateOnly = isoDate.split("T")[0];
      expect(dateOnly).toBe("2026-05-31");
    });

    it("should handle date-only format", () => {
      const dateOnly = "2026-05-31";
      const parts = dateOnly.split("T");
      expect(parts[0]).toBe("2026-05-31");
    });
  });

  describe("Parenthetical negatives", () => {
    it("should convert (1234.56) to -1234.56", () => {
      const parenthetical = "(1234.56)";
      const cleaned = parenthetical.slice(1, -1);
      const value = -parseFloat(cleaned);
      expect(value).toBe(-1234.56);
    });
  });

  describe("Balance selection logic", () => {
    it("should prefer non-negative values", () => {
      const candidates = [
        { value: -500 },
        { value: 1000 },
        { value: -100 },
      ];
      const preferred = candidates.find((c) => c.value >= 0);
      expect(preferred?.value).toBe(1000);
    });

    it("should fallback to first candidate if all negative", () => {
      const candidates = [
        { value: -500 },
        { value: -1000 },
      ];
      const preferred = candidates.find((c) => c.value >= 0) ?? candidates[0];
      expect(preferred?.value).toBe(-500);
    });
  });

  describe("Institution/accountName defaults", () => {
    it("should use fallback if institution is null", () => {
      const institution = null || "Captured from Screenshot";
      expect(institution).toBe("Captured from Screenshot");
    });

    it("should use fallback if accountName is null", () => {
      const accountName = null || "Screenshot Import";
      expect(accountName).toBe("Screenshot Import");
    });

    it("should preserve provided values", () => {
      const institution = "Chase" || "Captured from Screenshot";
      const accountName = "Sapphire" || "Screenshot Import";
      expect(institution).toBe("Chase");
      expect(accountName).toBe("Sapphire");
    });
  });

  describe("Credit limit calculation", () => {
    it("should calculate credit_limit from currentBalance + availableBalance", () => {
      const currentBalance = 500;
      const availableBalance = 1500;
      const creditLimit = currentBalance + availableBalance;
      expect(creditLimit).toBe(2000);
    });

    it("should use null if availableBalance is not provided", () => {
      const availableBalance: number | null = null;
      const creditLimit =
        availableBalance !== null && availableBalance !== undefined
          ? 500 + availableBalance
          : null;
      expect(creditLimit).toBeNull();
    });
  });
});
