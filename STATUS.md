# Project Status

## Current Phase

Active development. The normalized financial-operations foundation and a secure, read-only Plaid Sandbox staging integration are implemented. Real-bank/Production Plaid access remains blocked.

## Key Metrics

- Status: Working
- Last update: 2026-08-28
- Owner: Bhavya Dalwadi
- Local database: SQLite
- Production database target: PostgreSQL/Neon

## Completed Locally

- Added normalized institutions, credit cards, cash accounts, autopay rules, promotional offers, recurring transactions, reviews, expected payments, and audit logs.
- Added additive SQLite and PostgreSQL migration baselines plus stable-ID backfill and verification scripts.
- Added a six-step manual setup and resumable monthly review that keep unknown financial values explicit.
- Added review-freshness indicators to credit-card and cash-account lists.
- Added a 35-day account forecast, recurring cash-flow configuration, autopay funding, promotion risk, cash-shortfall warnings, and cash-safe extra-payment guidance.
- Retained legacy records, activity snapshots, imports, screenshot artifacts, and compatibility fields during rollout.
- Expanded local and production setup, migration, verification, security, and rollback documentation.
- Made local SQLite persistence turnkey while keeping Neon as the separate hosted database
- Added current-state autosave without noisy history points
- Added intentional checkpoints for activity history and trends
- Expanded trends across portfolio totals and individual accounts
- Versioned JSON backups so current data, checkpoints, and events restore together
- Validated autosave and checkpoints against real SQLite through the browser
- Passed the full test suite, TypeScript check, and production build
- Replaced shared-password authentication with owner-only Clerk v7 and strict reverification for sensitive operations.
- Added encrypted Plaid Sandbox account/balance/liability sync, explicit account matching, field-level review-before-accept, verified webhooks, disconnect, deletion, rate limiting, and security events.
- Added equivalent additive SQLite/PostgreSQL migrations, a key-rewrap command, a security review, and a Sandbox staging runbook.
- Verified the live Clerk development security baseline and added dedicated Clerk, local webhook tunnel, and secret/key-management runbooks.

## Known Issues and Limits

- Real Neon and Vercel credentials still need to be configured and validated in production.
- The migration workflow should be rehearsed against a disposable copy or Neon branch before touching production data.
- Explicit payment and cash-transfer entry are not yet a dedicated user-facing ledger.
- Historical comparison remains primarily snapshot- and audit-based.
- Plaid is Sandbox-only; live Clerk/Plaid/Vercel/Neon staging exercises are still required.
- The currently deployed webhook still redirects to the legacy sign-in route; after the next deployment, an unsigned probe must return `401` and a signed Plaid Sandbox webhook must return `200`.
- Seven high-severity dependency advisories remain under review; forced breaking upgrades were intentionally not applied.
- Unknown statement or minimum-payment values intentionally produce data-quality warnings instead of forecast estimates.
- Local and hosted data do not synchronize automatically; use JSON backup export/restore

## Next Steps

1. Back up existing data and rehearse schema push, backfill, and verification using [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md).
2. Provision or select the Neon production database and configure Vercel environment variables.
3. Deploy and validate sign-in, setup, monthly review, forecasts, imports, and backups end to end.
4. Add explicit payment, balance-update, and cash-transfer events.
5. Add richer month-over-month comparisons and payoff strategy simulation.
6. Complete the live Sandbox release gate in `SECURITY_REVIEW.md`; do not enable real institutions.

## Documentation

- [README](./README.md)
- [Product plan](./Plan.md)
- [User guide](./USER_GUIDE.md)
- [Migration and rollback guide](./prisma/MIGRATIONS.md)
- [Financial integration security review](./SECURITY_REVIEW.md)
- [Plaid Sandbox staging runbook](./PLAID_SANDBOX_RUNBOOK.md)
- [Clerk security runbook](./CLERK_SECURITY_RUNBOOK.md)
- [Local Plaid webhook tunnel](./LOCAL_PLAID_WEBHOOK_TUNNEL.md)
- [Secret and key management](./SECRET_KEY_MANAGEMENT.md)
