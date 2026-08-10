# Repo Semantic Summary - debt-crusher

Generated: 2026-08-09

## What This Repo Is For

Debt Crusher is a private, forms-first financial operations console for managing cash accounts, credit cards, autopay funding, promotional balances, recurring cash flow, payoff priorities, forecasts, and review history.

## Snapshot

- Domains: finance, decision support, web app, devops
- Tech stack: Node.js, Next.js, React, TypeScript, Prisma, SQLite, PostgreSQL
- Pending state: documented
- Status confidence: high
- Current work: normalized operations foundation and migration/review rollout
- Graph stats: 632 nodes · 1096 edges · 40 communities

## Features

- Dashboard, Credit Cards, Cash Accounts, Setup, Monthly Review, and Utilities workflows
- private session authentication
- Prisma persistence with local SQLite and production PostgreSQL schemas
- normalized institutions, cards, cash accounts, autopay rules, promotions, recurring transactions, reviews, expected payments, and audit logs
- additive migration baselines, stable-ID backfill, verification, and rollback guidance
- six-step manual setup and resumable monthly review
- 35-day cash forecasts, promotion pace, funding shortfall warnings, and cash-safe extra-payment guidance
- workbook import/export, JSON backup/restore, and screenshot OCR review

## Pending

- production Neon/Vercel rollout and authenticated end-to-end validation
- explicit payment, balance-update, and cash-transfer event entry
- richer historical comparison and unified timeline views
- payoff-date and interest-cost strategy simulation
- import preview, notification polish, and faster mobile entry
- optional read-only Plaid connectivity to reduce manual updates
- optional native iPhone Share Sheet intake

## Read First

- `README.md`
- `Plan.md`
- `STATUS.md`
- `USER_GUIDE.md`
- `prisma/MIGRATIONS.md`
- `graphify-out/GRAPH_REPORT.md`

## Likely Entrypoints

- `app/page.tsx`
- `components/debt-crusher-app.tsx`
- `components/dashboard-view.tsx`
- `components/manual-workflow.tsx`
- `components/operations-panel.tsx`
- `lib/operations-store.ts`
- `lib/review-store.ts`
- `package.json`

## Main Modules

- `app`
- `components`
- `lib`
- `prisma`
- `scripts`
- `tests`

## Conservative Suggestions

- rehearse migration on a disposable database or Neon branch before production
- keep unknown statement and payment amounts explicit
- add explicit financial events before relying on snapshots as a ledger

## Evidence Files

- `README.md`
- `Plan.md`
- `STATUS.md`
- `USER_GUIDE.md`
- `prisma/MIGRATIONS.md`

## Graph Signals

- Major communities include the product plan, user guide, operations logic, review store, manual workflow, migration scripts, authentication, imports, and shared types.
