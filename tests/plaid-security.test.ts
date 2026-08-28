import { afterEach, describe, expect, it } from "vitest";
import { Products } from "plaid";
import {
  assertPlaidSandboxConfiguration,
  FORBIDDEN_PLAID_PRODUCTS,
  PLAID_INITIAL_PRODUCTS,
  PLAID_REQUIRED_IF_SUPPORTED_PRODUCTS,
  plaidClientUserId,
} from "@/lib/plaid-client";

const previous = { ...process.env };

afterEach(() => {
  process.env = { ...previous };
});

describe("Plaid security boundary", () => {
  it("allows only Transactions plus optionally supported Liabilities", () => {
    expect(PLAID_INITIAL_PRODUCTS).toEqual([Products.Transactions]);
    expect(PLAID_REQUIRED_IF_SUPPORTED_PRODUCTS).toEqual([Products.Liabilities]);
    expect([...PLAID_INITIAL_PRODUCTS, ...PLAID_REQUIRED_IF_SUPPORTED_PRODUCTS].some((product) => FORBIDDEN_PLAID_PRODUCTS.has(product))).toBe(false);
    for (const product of [Products.Auth, Products.Transfer, Products.Identity, Products.PaymentInitiation, Products.Signal, Products.Assets]) {
      expect(FORBIDDEN_PLAID_PRODUCTS.has(product)).toBe(true);
    }
  });

  it("refuses a production environment even when credentials exist", () => {
    process.env.PLAID_ENV = "production";
    process.env.PLAID_CLIENT_ID = "sandbox-client";
    process.env.PLAID_SECRET = "sandbox-secret";
    expect(() => assertPlaidSandboxConfiguration()).toThrow(/production is blocked/i);
  });

  it("uses an opaque stable client user id", () => {
    process.env.SECURITY_HASH_KEY = "independent-test-hmac-key";
    const opaque = plaidClientUserId("owner");
    expect(opaque).toMatch(/^[a-f0-9]{64}$/);
    expect(opaque).not.toContain("owner");
    expect(plaidClientUserId("owner")).toBe(opaque);
  });
});
