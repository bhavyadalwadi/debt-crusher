import "server-only";

import { Configuration, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { createHmac } from "node:crypto";

export const PLAID_INITIAL_PRODUCTS = [Products.Transactions] as const;
export const PLAID_REQUIRED_IF_SUPPORTED_PRODUCTS = [Products.Liabilities] as const;
export const FORBIDDEN_PLAID_PRODUCTS = new Set([
  Products.Auth,
  Products.Transfer,
  Products.Identity,
  Products.PaymentInitiation,
  Products.Signal,
  Products.Assets,
]);

export function assertPlaidSandboxConfiguration() {
  if ((process.env.PLAID_ENV || "sandbox").toLowerCase() !== "sandbox") {
    throw new Error("Plaid production is blocked pending a separate security approval.");
  }
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    throw new Error("Plaid Sandbox credentials are not configured.");
  }
  if (PLAID_INITIAL_PRODUCTS.some((product) => FORBIDDEN_PLAID_PRODUCTS.has(product))) {
    throw new Error("Forbidden Plaid product configured.");
  }
}

export function getPlaidClient() {
  assertPlaidSandboxConfiguration();
  return new PlaidApi(new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  }));
}

export function plaidClientUserId(ownerId: string) {
  const key = process.env.SECURITY_HASH_KEY;
  if (!key) throw new Error("Security hashing is not configured.");
  return createHmac("sha256", key).update(`plaid-owner:${ownerId}`).digest("hex");
}
