# Debt Crusher Project Status

- Review state: Reviewed
- Source type: project_status
- Confidence: High
- Last updated: 2026-08-12
- Status: Working

## Purpose

Debt Crusher is a private, forms-first financial operations console for managing credit cards, cash accounts, autopay funding, promotional balances, recurring cash flow, payoff priorities, forecasts, and review history.

## Implemented

- app-owned manual entry with workbook, JSON, and screenshot utilities as secondary paths
- local SQLite persistence and production PostgreSQL/Neon schema support
- debounced autosave for current values, separated from explicit historical checkpoints
- portfolio and per-account historical trends across selectable time ranges
- versioned, transactional full-history backups with legacy import compatibility
- private sign-in and signed session-cookie protection
- normalized operations entities with legacy compatibility
- additive migration baselines, stable-ID backfill, verification, and rollback documentation
- six-step setup and resumable monthly review
- explicit unknown-value and data-quality handling
- multiple promotions per card and autopay-to-funding-account relationships
- recurring income, expense, transfer, and debt-payment configuration
- 35-day cash forecasts, account shortfall warnings, promo pace, and cash-safe extra-payment guidance
- audit logs, review records, snapshots, activity events, and review-freshness indicators
- explainable payoff ranking and Avalanche, Snowball, Promo-first, and custom strategies
- workbook import/export, JSON backup/restore, and screenshot OCR review

## Remaining

- production Neon/Vercel provisioning and authenticated end-to-end validation
- dedicated payment, balance-update, and cash-transfer event entry
- richer month-over-month comparisons and a unified event timeline
- payoff-date and interest-cost simulation
- import conflict preview, notification polish, and faster mobile entry
- optional read-only Plaid connectivity to reduce manual account updates, subject to security, pricing, and data-matching review
- optional native iPhone Share Sheet integration

## Current Priority

Rehearse and validate the additive migration path against a disposable database copy or Neon branch, then complete the production rollout. Product development should next focus on explicit financial events and richer historical comparisons.

## Main Risk

There is no known daily-use architecture blocker. The material operational risk is applying schema and backfill changes to real financial history without first completing the documented backup, rehearsal, and count-verification steps.

## Evidence

- [README.md](./README.md)
- [Plan.md](./Plan.md)
- [USER_GUIDE.md](./USER_GUIDE.md)
- [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md)
