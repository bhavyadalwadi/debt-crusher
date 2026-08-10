# Project Status

## Current Phase

Active development. The normalized financial-operations foundation and its manual setup/monthly-review workflow are implemented; production rollout and event-ledger depth are the next major slices.

## Key Metrics

- Status: Working
- Last update: 2026-08-09
- Owner: Bhavya Dalwadi
- Local database: SQLite
- Production database target: PostgreSQL/Neon

## Recent Changes

- Added normalized institutions, credit cards, cash accounts, autopay rules, promotional offers, recurring transactions, reviews, expected payments, and audit logs.
- Added additive SQLite and PostgreSQL migration baselines plus stable-ID backfill and verification scripts.
- Added a six-step manual setup and resumable monthly review that keep unknown financial values explicit.
- Added review-freshness indicators to credit-card and cash-account lists.
- Added a 35-day account forecast, recurring cash-flow configuration, autopay funding, promotion risk, cash-shortfall warnings, and cash-safe extra-payment guidance.
- Retained legacy records, activity snapshots, imports, screenshot artifacts, and compatibility fields during rollout.
- Expanded local and production setup, migration, verification, security, and rollback documentation.

## Known Issues and Limits

- Real Neon and Vercel credentials still need to be configured and validated in production.
- The migration workflow should be rehearsed against a disposable copy or Neon branch before touching production data.
- Explicit payment and cash-transfer entry are not yet a dedicated user-facing ledger.
- Historical comparison remains primarily snapshot- and audit-based.
- There is no automatic bank sync; an optional read-only Plaid integration is a future evaluation item.
- Unknown statement or minimum-payment values intentionally produce data-quality warnings instead of forecast estimates.

## Next Steps

1. Back up existing data and rehearse schema push, backfill, and verification using [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md).
2. Provision or select the Neon production database and configure Vercel environment variables.
3. Deploy and validate sign-in, setup, monthly review, forecasts, imports, and backups end to end.
4. Add explicit payment, balance-update, and cash-transfer events.
5. Add richer month-over-month comparisons and payoff strategy simulation.
6. Evaluate Plaid pricing, coverage, security, and a review-before-accept sync workflow to reduce manual updates.

## Documentation

- [README](./README.md)
- [Product plan](./Plan.md)
- [User guide](./USER_GUIDE.md)
- [Migration and rollback guide](./prisma/MIGRATIONS.md)
