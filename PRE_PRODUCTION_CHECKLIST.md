# Pre-Production Checklist

This is the release gate for moving Debt Crusher from a locally verified release candidate to a hosted production-ready application.

> **Current verdict: implementation complete — safe for Plaid Sandbox only.**
>
> Do not connect real institutions, configure Plaid Production credentials, or enable money-movement products until every applicable release blocker below is complete and a later security review explicitly returns **SAFE FOR PLAID PRODUCTION**.

## Repository gate

- [x] Owner-only Clerk authentication and resource-level authorization implemented.
- [x] Application self-service registration retired.
- [x] Plaid products restricted to the read-only Sandbox design.
- [x] Plaid Production refused by application and release-environment checks.
- [x] Plaid access tokens encrypted and excluded from browser responses, exports, and logs.
- [x] Imported financial changes require explicit review before trusted values change.
- [x] Strict reverification protects sensitive connection, deletion, export, and restore actions.
- [x] Unit, release-configuration, TypeScript, schema, production-build, dependency-audit, and public browser gates pass locally.
- [x] Production dependency audit reports zero known vulnerabilities.

## 1. Commit and deploy an isolated staging environment

- [x] Review, commit, and push the release-candidate changes.
- [ ] Create a dedicated staging branch and Vercel Preview deployment.
- [ ] Provision a dedicated Neon staging branch/database.
- [ ] Configure a Clerk development instance with separate owner and non-owner test users.
- [ ] Configure Plaid Sandbox credentials and a stable public HTTPS webhook URL.
- [ ] Scope all financial credentials to the intended Preview environment only.
- [ ] Generate independent strong values for `SECURITY_HASH_KEY` and the token-wrapping key.
- [ ] Run `npm run release:check:staging` successfully before deployment.
- [ ] Confirm Vercel Production contains no Plaid variables.

## 2. Rehearse migration and recovery

- [ ] Back up the existing application data.
- [ ] Apply the PostgreSQL schema and backfill to a disposable Neon branch first.
- [ ] Run the migration verification and foreign-key checks.
- [ ] Confirm the owner and `current` portfolio records are correct.
- [ ] Export a versioned JSON backup and restore it into an isolated database.
- [ ] Document and rehearse rollback using [`prisma/MIGRATIONS.md`](./prisma/MIGRATIONS.md).

## 3. Validate hosted Clerk authorization

- [ ] Run `npm run test:e2e:auth` against the staging URL.
- [ ] Confirm the configured owner can sign in with MFA or a passkey.
- [ ] Confirm an anonymous visitor is redirected to `/sign-in`.
- [ ] Confirm a different valid Clerk user receives dashboard `404` and protected API `403`.
- [ ] Confirm `/sign-up` cannot create a self-service account.
- [ ] Exercise strict reverification for every sensitive operation.
- [ ] Revoke the owner session and confirm access ends immediately.
- [ ] Exercise account recovery without weakening MFA or owner authorization.

## 4. Complete the Plaid Sandbox gate

- [ ] Confirm an unsigned webhook request returns `401` without a Clerk redirect.
- [ ] Confirm a valid signed Plaid Sandbox webhook returns `200`.
- [ ] Test invalid, expired, future-dated, duplicate, replayed, and concurrent webhooks.
- [ ] Connect only fake Plaid Sandbox institutions.
- [ ] Match checking, savings, and credit-card accounts explicitly.
- [ ] Sync Balance and supported Liabilities fields.
- [ ] Verify sync only stages proposals and never silently updates trusted values.
- [ ] Exercise accept, ignore, stale-data, login-required, and trusted-baseline `409` flows.
- [ ] Disconnect an Item and confirm Plaid revocation and ciphertext removal.
- [ ] Delete disconnected provider data and confirm application data follows policy.
- [ ] Complete the detailed [`PLAID_SANDBOX_RUNBOOK.md`](./PLAID_SANDBOX_RUNBOOK.md) release record.

## 5. Inspect hosted operational security

- [ ] Verify Vercel Preview and Production secret separation in the account UI.
- [ ] Restrict Neon roles, network access, exports, backups, and branch visibility.
- [ ] Inspect Vercel logs and any log drains for credentials or sensitive financial data.
- [ ] Confirm browser bundles, source maps, analytics, and deployment output contain no secrets.
- [ ] Configure GitHub branch protection and required test/build checks.
- [ ] Restrict deployment visibility and access to the staging environment.
- [ ] Configure alerts for deployment failures, application errors, webhook failures, and repeated authentication failures.
- [ ] Validate CSP, HSTS, frame denial, no-store responses, and other production headers.
- [ ] Replace the current inline-compatible CSP with a nonce-based policy after Clerk staging validation.
- [ ] Rehearse the incident-response, Clerk session-revocation, Plaid revocation, and encryption-key rotation procedures.

## 6. Product acceptance

- [ ] Complete setup and a full monthly review on desktop and mobile.
- [ ] Validate credit cards, cash accounts, autopay rules, promotions, and recurring cash flow.
- [ ] Validate forecasts and every payoff strategy using known test scenarios.
- [ ] Validate workbook import/export and screenshot-assisted entry.
- [ ] Validate history checkpoints and JSON backup export/restore.
- [ ] Exercise loading, empty, invalid-input, provider-error, and recovery states.
- [ ] Record launch approval and known limitations in [`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md).

## 7. Separate real-bank approval gate

Complete this section only after the hosted Sandbox gate passes.

- [ ] Complete Plaid Production application and approval.
- [ ] Create and review the Clerk production instance and its authentication policies.
- [ ] Finalize privacy policy, terms, consent language, retention schedule, and deletion procedure.
- [ ] Confirm incident response, breach notification ownership, monitoring, backups, and recovery objectives.
- [ ] Perform a final application and infrastructure security review.
- [ ] Obtain an explicit **SAFE FOR PLAID PRODUCTION** verdict.
- [ ] Make a separately reviewed change that removes the Plaid Production refusal.
- [ ] Add production-scoped Plaid credentials only after that reviewed change is approved.
- [ ] Connect the first real institution through a monitored limited rollout.

## Non-blocking product expansion

These features improve the product but do not block a private manual-entry or Sandbox launch:

- Dedicated payment, balance-update, and cash-transfer event ledger.
- Richer month-over-month reporting and historical comparisons.
- More detailed payoff-strategy simulation.
- Automated local-to-hosted data synchronization.
- Operational dashboard for security events and sync failures.

## Release references

- [`README.md`](./README.md) — setup, architecture, environment, deployment, and testing.
- [`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md) — threat model, test evidence, and release verdict.
- [`PLAID_SANDBOX_RUNBOOK.md`](./PLAID_SANDBOX_RUNBOOK.md) — hosted Plaid validation.
- [`CLERK_SECURITY_RUNBOOK.md`](./CLERK_SECURITY_RUNBOOK.md) — authentication and recovery validation.
- [`SECRET_KEY_MANAGEMENT.md`](./SECRET_KEY_MANAGEMENT.md) — credential and encryption-key operations.
- [`prisma/MIGRATIONS.md`](./prisma/MIGRATIONS.md) — migration, verification, and rollback.
- [`.env.e2e.example`](./.env.e2e.example) — authenticated browser-test inputs.
