# Debt Crusher Product Plan

## Goal

Make Debt Crusher the private, forms-first source of truth for day-to-day debt and cash operations. Manual entry is authoritative; workbook, JSON, and screenshot paths remain secondary tools for bootstrap, backup, and review.

## Current Build Status

### Done

- Next.js application with Dashboard, Credit Cards, Cash Accounts, Setup, Monthly Review, and Utilities workflows
- private sign-in and signed session-cookie protection for application and API routes
- Prisma persistence with SQLite for local development and PostgreSQL/Neon support for production
- legacy portfolio compatibility plus a normalized operations model for:
  - financial institutions
  - credit cards and cash accounts
  - autopay rules and funding-account links
  - multiple promotional offers per card
  - recurring income, expenses, transfers, and debt payments
  - financial reviews and review items
  - audit logs, expected payments, snapshots, and activity events
- additive SQLite and PostgreSQL migration baselines, stable-ID backfill, verification, and rollback guidance
- six-step manual setup that records payoff preferences, cash accounts, cards, autopay, promotions, and a final accuracy review
- resumable monthly review with confirm, update, unknown, and skip states
- explicit unknown-value handling for statement balances, minimum payments, autopay configuration, and promotion details
- review-freshness indicators on card and cash-account lists
- 35-day cash forecast with recurring activity, expected card payments, funding shortfalls, and unknown-payment warnings
- dashboard sections for Today, Next 7 Days, Cash Health, Promo Deadlines, and Recommended Actions
- cash-safe extra-payment amount compared with the configured extra-payment budget
- promotion pace and risk assessment, including safety buffers and deferred-interest warnings
- Avalanche, Snowball, Promo-first, and custom payoff strategies
- explainable ranking, status flags, dashboard totals, snapshot deltas, and trend charts
- workbook import/export, JSON backup/restore, and screenshot OCR review with stored source artifacts
- replace and merge import modes with overwrite confirmation
- inline validation, delete confirmation, unsaved-state handling, reset, and save feedback

### Partially Done

- the normalized operations console is integrated alongside legacy card, cash, snapshot, and import surfaces; compatibility fields remain during rollout
- recommendations cover cash shortfalls, promo pace, and missing data, but payoff simulation and urgency tuning can be richer
- audit records and snapshots are durable, but there is not yet a dedicated user-facing transaction ledger
- forms are usable on mobile, with room for faster keyboard-first entry and further polish

### Pending

- dedicated payment, balance-update, and cash-transfer event entry
- richer historical comparisons and a consolidated audit/event timeline
- projected payoff-date and interest-cost simulation across strategies
- import preview and conflict-by-conflict merge review
- notification grouping, dismissal, and stale-data reminders
- additional keyboard-first and mobile ergonomics
- optional Plaid integration for consent-based bank and credit-card syncing to reduce manual balance and transaction entry
- optional native iPhone wrapper / Share Sheet target for direct screenshot intake
- production Neon provisioning and end-to-end Vercel authentication validation

## Product Principles

- Manual entry is the source of current financial truth.
- Unknown values stay unknown; forecasts must not invent payment amounts.
- Workbook, JSON, and screenshot tools support the core workflow rather than define it.
- Recommendations must explain the cash, due-date, interest, or promotion pressure behind them.
- History and review state must be durable enough to support trust and comparison.
- Financial identifiers are limited to institution, nickname/product, and last four digits; full credentials and account/card numbers do not belong in the app.
- The UI should optimize for decisions and safe cash movement.

## Current Architecture

### Storage and deployment

- Local development uses SQLite through `prisma/schema.prisma`.
- Production builds use PostgreSQL through `prisma/schema.postgres.prisma`.
- Migration baselines exist for both providers.
- Backfill normalizes legacy records without importing workbook values or replacing current balances.
- Verification compares legacy and normalized account counts before rollout proceeds.

See [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md) for the exact upgrade, verification, and rollback sequence.

### Core data groups

- Portfolio and legacy compatibility: `Portfolio`, `CreditAccount`, `CashAccount`
- Operations configuration: `FinancialInstitution`, `CreditCard`, `AutopayRule`, `PromotionalOffer`, `RecurringTransaction`
- Operational history: `FinancialReview`, `FinancialReviewItem`, `ExpectedPayment`, `AuditLog`
- Existing history and utilities: `ActivitySnapshot`, `ActivityEvent`, `ScreenshotImportArtifact`

## Current Operational Logic

### Forecasting

- projects each active cash account across a 35-day window
- includes recurring income, expenses, transfers, debt payments, and autopay-derived expected payments
- clamps calendar-day rules to the last valid day of shorter months
- reports projected low and final balances plus the first required-balance shortfall
- preserves unknown expected-payment amounts as data-quality actions

### Promotions

- supports more than one promotional offer per card
- calculates required monthly payoff pace against the target or buffered end date
- compares required pace with known planned payment amounts where possible
- classifies promotion risk and elevates deferred-interest concerns

### Reviews and audit

- setup and monthly reviews are durable and resumable
- each active account, card, and recurring transaction receives a review item
- completion creates snapshots and audit records
- list views expose whether an account was reviewed this month or needs review

## Execution Phases

### Phase A: Forms-first foundation — complete

CRUD, validation, persistence, import fallback, history, authentication, and manual setup are implemented.

### Phase B: Operations data model and migration — complete

The normalized schema, dual-provider migration baselines, stable-ID backfill, verification scripts, compatibility layer, and rollback documentation are implemented.

### Phase C: Forecast and review loop — complete baseline

The 35-day forecast, recurring cash flow, autopay funding, promotion risk, cash-safe extra budget, setup review, monthly review, and freshness indicators are implemented.

Remaining work is deeper scenario modeling and UI refinement, not another core-schema redesign.

### Phase D: Event-based tracking — next

Add explicit payment, balance-update, and cash-transfer entry, then expose a consolidated timeline that connects those events to snapshots and reviews.

### Phase E: Strategy simulation and historical insight — later

Add payoff-date and interest-cost comparisons, stronger month-over-month views, and richer recommendation explanations.

### Phase F: Production rollout — operational task

Provision or select Neon, apply and verify the PostgreSQL schema on a branch, configure Vercel secrets, deploy, and validate the authenticated workflow end to end.

### Phase G: Optional bank connectivity — later / requires product review

Evaluate Plaid for read-only, user-consented connections to supported bank and credit-card accounts. The goal is to prefill balances, transactions, statement details, and account freshness so routine reviews require less manual work.

Before implementation, define:

- which Plaid products and account types are actually needed
- pricing, supported institutions, refresh frequency, and production-access requirements
- token encryption, secret rotation, webhook verification, deletion, and reconnect flows
- how imported records match existing accounts without duplicating or overwriting trusted data
- a review-before-accept workflow for synced changes and a clear manual fallback
- data-retention and privacy boundaries that keep banking credentials out of Debt Crusher

## Testing Status

### Implemented coverage

- workbook validation and normalization
- styled workbook compatibility and bad summary-row rejection
- priority, status, custom-strategy, and promo-threshold behavior
- snapshot deltas, change detail, and activity-event calculation
- normalized operations forecasting and promotion assessment
- monthly review state and audit persistence
- migration backfill and count-verification scripts

### Still valuable

- browser-level setup and monthly-review flows
- database-backed migration rehearsal against representative production data
- JSON backup restore and workbook export round trips
- browser-level forecast and unknown-value rendering

## Recommended Next Slice

1. Rehearse the documented database upgrade against a disposable copy or Neon branch.
2. Add explicit payment and cash-transfer events with audit-backed history.
3. Add a month-over-month review summary and unified timeline.
4. Add payoff-date and interest-cost strategy simulation.
5. Finish production Neon/Vercel configuration and validate private access.
6. Evaluate a read-only Plaid proof of concept after the core review and migration workflows are stable.

## Notes

- The app remains usable without Excel; spreadsheet support is utility tooling.
- Legacy fields are intentionally retained during the additive migration and compatibility period.
- Native iPhone intake is optional because screenshot upload and OCR review already work on the web.
- Plaid connectivity is a roadmap candidate, not a committed or currently implemented feature.
