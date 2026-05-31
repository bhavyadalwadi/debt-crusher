# Debt Crusher Product Plan

## Goal
Turn Debt Crusher into a forms-first finance console where the app is the primary source of truth, workbook import is a secondary bootstrap/backup path, and saved history supports payoff decisions and progress tracking.

## Current Build Status
### Done
- Next.js app with `Dashboard`, `Credit Cards`, and `Cash Accounts` views
- Prisma-based persistence
- local SQLite development database
- forms-first workflow for:
  - setup values
  - credit cards
  - cash accounts
- add, edit, remove, and save flows for app-owned records
- workbook import as a secondary path
- downloadable workbook template in-app
- import support for the current styled workbook format
- protection against bad import rows like unlabeled summary rows
- computed dashboard metrics:
  - total credit balance
  - weighted utilization
  - cash above minimums
  - recommended target card
- activity snapshot history on every import/save
- trend charts based on saved snapshots
- statement-balance autopay downgrade to `watch`
- inline form validation
- save/import success feedback
- delete confirmation
- recommendation reason list for the top-ranked card
- selectable payoff strategy modes:
  - avalanche
  - snowball
  - promo-first
- custom payoff strategy with editable weighting fields
- `since last save` deltas for:
  - credit balance
  - cash above minimums
  - extra payment budget
- JSON backup export
- JSON backup restore
- workbook export from app-owned data
- import mode selection:
  - replace
  - merge
- overwrite confirmation for import and backup restore
- reset unsaved changes
- last-saved and unsaved-state indicator
- denser top-level shell with a smaller header and less static chrome
- toast-style save/export/import feedback
- account-level change summaries inside saved snapshot history
- event trail for save-driven account and setup changes
- searchable institution picker with alias-aware typeahead for card and cash forms
- screenshot OCR import with:
  - image upload
  - OCR extraction
  - review-before-save editing
  - replace or merge save behavior
  - stored screenshot artifacts linked from history

### Partially Done
- recommendation engine is explainable, but still fairly simple
- form UX is improved, but still has room for polish

### Pending
- native iPhone wrapper / true Share Sheet target for direct screenshot intake
- richer recommendation engine:
  - due-date pressure explanation improvements
  - promo-pressure explanation improvements
  - more nuanced status thresholds
- richer activity insights:
  - stronger historical comparison views
- event-level tracking beyond snapshots:
  - explicit payment events
  - explicit balance update events
  - cash transfer events
  - note history
- better notification UX:
  - dismiss controls
  - grouping/reducing repeated toasts
- keyboard-first and faster-entry form improvements
- optional hosted persistence migration to Neon

## Product Principles
- User input is the main workflow.
- Workbook import/export exists for convenience, not as the core operating model.
- Recommendations must be explainable.
- History must be durable enough to support graphs, comparisons, and trust.
- The UI should optimize for decisions, not bookkeeping theater.

## Data Model
Use Prisma as the persistence layer.

### Current storage
- local SQLite for development
- app code designed so datasource can later switch to Postgres/Neon

### Current core entities
- `portfolio`
  - single active working set
  - setup config
- `credit_accounts`
  - identity, balance, limit, APR, promo, payment behavior, notes, rewards
- `cash_accounts`
  - identity, type, balance, required minimum
- `activity_snapshots`
  - append-only snapshots created on import and manual save

### Planned later entities
- `account_events`
  - payment made
  - balance updated
  - cash transfer
  - note/status changes

## Current Status Model
### Implemented statuses
- `danger`
  - expired promo with balance
  - severe utilization
  - true urgent attention
- `warning`
  - promo ending soon
  - due soon
  - elevated utilization
- `watch`
  - statement-balance autopay cards that still deserve attention
- `paid`
  - zero balance
- `ok`
  - stable and not notable

## Current Derived Logic
### Implemented
- `utilization_percent`
- `paying_interest_now`
- `statement_balance_autopay`
- `promo_end_soon`
- `priority_score`
- `priority_rank`
- `status_flag`
- dashboard summary totals
- recommendation reasons for the top-ranked card
- snapshot deltas against the previous save

### Pending improvements
- better threshold tuning
- stronger explanation detail for due date and promo timing

## Import / Export
### Implemented
- workbook import
- workbook template download
- workbook export
- JSON app-state export
- JSON app-state restore
- screenshot OCR import
- replace vs merge import behavior
- overwrite confirmation before destructive restore/import

### Pending
- import preview before overwrite
- native iPhone Share Sheet target / Shortcut-native entrypoint

## UX Roadmap
### Completed baseline
- forms-first shell
- top-level add/edit actions
- validation and destructive confirmation
- secondary import lane
- history panel
- trend charts
- explanation layer for top recommendation
- compact top chrome and save-state visibility
- searchable institution lookup for manual entry

### Remaining UX work
- denser/faster-entry forms
- stronger mobile form ergonomics
- richer historical comparison views
- native iPhone capture handoff if we want first-class iOS intake

## Execution Phases
## Phase A: Forms-first Foundation
### Status
- largely complete

### Done
- forms-first CRUD workflow
- validation
- save feedback
- delete confirmation
- import as fallback

### Remaining
- better notification presentation
- faster-entry ergonomics

## Phase B: History That Explains Change
### Status
- partially complete

### Done
- activity snapshots
- trend chart
- `since last save` summary deltas

### Remaining
- richer comparison views

## Phase C: Recommendation Engine Upgrade
### Status
- partially complete

### Done
- recommendation reasons for rank #1
- autopay-safe `watch` behavior
- strategy modes:
  - avalanche
  - snowball
  - promo-first
- custom weighting mode

### Remaining
- more nuanced urgency model
- better explanation coverage for due dates and promos

## Phase D: Import / Export Reliability
### Status
- partially complete

### Done
- template help path
- JSON backup export/import
- workbook import validation

### Remaining
- workbook export
- import replace confirmation
- import merge mode

## Phase E: Event-based Tracking
### Status
- partially complete

### Remaining
- explicit payment events
- explicit balance update events
- cash transfer events
- note/event timeline

## Testing Status
### Implemented coverage
- import validation
- styled workbook compatibility
- unlabeled summary row rejection
- date normalization edge cases
- priority and status behavior
- custom strategy behavior
- statement-balance autopay `watch` classification
- snapshot delta calculation
- snapshot change detail calculation
- save-driven activity event calculation

### Pending coverage
- JSON backup restore flow
- UI-level save/delete flows
- workbook export round-trip coverage

## Recommended Next Slice
1. Add explicit payment and cash-transfer events.
2. Add richer historical comparison views between snapshots.
3. Improve recommendation explanations around due dates and promo pressure.
4. Tighten keyboard-first entry flows and mobile form ergonomics.

## Next-Level Suggestions
1. Add a dedicated payment log so users record actual payments instead of only editing balances; that would make progress charts and payoff velocity far more trustworthy.
2. Add a monthly review mode with snapshot compare, “what changed since last month,” and a rollover checklist for balances, promos, and cash buffers.
3. Add an upcoming-calendar layer that groups due dates, promo expirations, and autopay checkpoints into a single timeline.
4. Add strategy simulation so users can compare avalanche, snowball, promo-first, and custom plans against projected payoff dates and interest cost.
5. Add a recurring habits surface: weekly check-in prompts, stale-account warnings, and reminders when balances or cash buffers have not been updated recently.
6. Add portfolio export/backup polish with import preview, conflict review, and side-by-side merge summaries before overwrite.
5. Add strategy modes for payoff ranking.

## Notes
- Local development currently uses SQLite through Prisma.
- A later move to Neon/Postgres is still possible, but it is not required for current progress.
- The app is already usable without Excel; Excel is now support tooling, not the main operating surface.
