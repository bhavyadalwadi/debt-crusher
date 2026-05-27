# debt-crusher Project Context

Generated: 2026-05-27 01:50 UTC

## Business Purpose
Debt Crusher is a forms-first finance workspace for managing credit cards, cash accounts, payoff priorities, and progress history.

## System Overview
This repo centers on Next.js forms-first finance workspace, Prisma persistence layer, local workbook and JSON import/export tools.

## Major Applications
- Next.js forms-first finance workspace
- Prisma persistence layer
- local workbook and JSON import/export tools

## Environments
- local development
- production-like deployment only when explicitly documented in README/infra files

## Tech Stack
- Node.js
- Next.js
- React
- TypeScript
- CSS
- JavaScript

## Critical Dependencies
- `@prisma/client`
- `@tanstack/react-table`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `next`
- `prisma`
- `react`
- `react-dom`
- `recharts`
- `typescript`
- `vitest`

## Major Workflows
- Next.js app with `Dashboard`, `Credit Cards`, and `Cash Accounts` views
- Prisma-based persistence
- local SQLite development database
- forms-first workflow for - setup values
- forms-first workflow for - credit cards
- forms-first workflow for - cash accounts

## Operational Constraints
- workbook import is secondary and should not be allowed to override the forms-first source-of-truth direction
- snapshot history exists, but event-level financial events are still pending
- heuristic ranking is explainable but still intentionally simple

## Scaling Constraints
- This repo has active product or operational intent; changes should assume future iteration rather than a one-off snapshot.

## Deployment Model
Local Next.js app today; data model is intentionally shaped so the datasource can later switch to hosted Postgres/Neon.

## Important APIs
- server actions or route handlers behind the app-owned save/import/export flows

## Important Databases
- Prisma-managed relational database
- SQLite or file-backed local data store

## Important Queues / Events
- snapshot history creation on import/save
- import/export generation

## Known Technical Debt
- richer recommendation engine - due-date pressure explanation improvements
- richer recommendation engine - promo-pressure explanation improvements
- richer recommendation engine - more nuanced status thresholds
- richer activity insights - stronger historical comparison views
- event-level tracking beyond snapshots - explicit payment events
- event-level tracking beyond snapshots - explicit balance update events

## Current Architecture Themes
- Tier A repo under the `_personal` workspace
- Graphify-first repository discovery
- preserve current architecture instead of speculative rewrites
