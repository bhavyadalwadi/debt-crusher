import assert from "node:assert/strict";
import test from "node:test";
import { validateReleaseEnvironment } from "../scripts/release-environment.mjs";

const base = {
  DATABASE_URL: "postgresql://user:password@ep-safe.us-west-2.aws.neon.tech/debt_crusher",
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL: "https://safe-clerk.accounts.dev",
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
  DEBT_CRUSHER_OWNER_CLERK_USER_ID: "user_owner123",
  SECURITY_HASH_KEY: "a".repeat(64),
};

test("accepts a production environment only when Plaid is absent", () => {
  const errors = validateReleaseEnvironment("production", {
    ...base,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_valid",
    CLERK_SECRET_KEY: "sk_live_valid",
  });
  assert.deepEqual(errors, []);
});

test("rejects Plaid credentials in production", () => {
  const errors = validateReleaseEnvironment("production", {
    ...base,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_valid",
    CLERK_SECRET_KEY: "sk_live_valid",
    PLAID_ENV: "sandbox",
    PLAID_SECRET: "secret-value",
  });
  assert.ok(errors.some((error) => error.includes("PLAID_ENV must be absent")));
  assert.ok(errors.some((error) => error.includes("PLAID_SECRET must be absent")));
});

test("accepts a complete isolated Sandbox staging environment", () => {
  const errors = validateReleaseEnvironment("staging", {
    ...base,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_valid",
    CLERK_SECRET_KEY: "sk_test_valid",
    PLAID_ENV: "sandbox",
    PLAID_CLIENT_ID: "client-id",
    PLAID_SECRET: "sandbox-secret",
    PLAID_WEBHOOK_URL: "https://staging.debt-crusher.test/api/plaid/webhook",
    FINANCIAL_TOKEN_KEY_VERSION: "v1",
    FINANCIAL_TOKEN_KEK_V1: Buffer.alloc(32, 7).toString("base64"),
  });
  assert.deepEqual(errors, []);
});

test("rejects placeholders, non-Neon-style local URLs, weak keys, and partial Plaid setup", () => {
  const errors = validateReleaseEnvironment("staging", {
    ...base,
    DATABASE_URL: "file:./dev.db",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_replace-me",
    CLERK_SECRET_KEY: "sk_test_valid",
    SECURITY_HASH_KEY: "short",
    PLAID_ENV: "sandbox",
  });
  assert.ok(errors.some((error) => error.includes("DATABASE_URL")));
  assert.ok(errors.some((error) => error.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")));
  assert.ok(errors.some((error) => error.includes("SECURITY_HASH_KEY")));
  assert.ok(errors.some((error) => error.includes("PLAID_CLIENT_ID")));
});
