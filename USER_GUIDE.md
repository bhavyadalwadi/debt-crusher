# Debt Crusher User Guide

## What This App Is
Debt Crusher is a local debt payoff workspace.

The main workflow is:
- enter your data directly in the app
- save your portfolio locally
- use the dashboard to decide what needs attention next

Workbook import exists as a backup or starting point, not as the main way to operate the app.

## What The App Saves
The app stores:
- your current portfolio
- saved snapshots of that portfolio over time
- change history and recent save-driven events

For local development, this data is stored in SQLite through Prisma.

## First-Time Setup
From the project folder:

```bash
cp .env.example .env
npm run prisma:generate
npm run db:push
npm run dev
```

Then open:

[http://localhost:3000](http://localhost:3000)

## Main Screens
### Dashboard
Use this as the decision screen.

It shows:
- immediate payoff focus
- total credit balance
- weighted utilization
- cash above minimums
- danger, warning, and watch items
- trend charts
- setup controls

### Credit Cards
Use this to add, edit, save, or remove cards.

It includes:
- sortable card table
- detail form for the selected card
- institution search picker
- ranking and status feedback

### Cash Accounts
Use this to add, edit, save, or remove checking and savings accounts.

It includes:
- account table
- detail form for the selected account
- institution search picker
- safe cash calculations

## Important Save Behavior
Edits are **not** saved automatically to the database on every keystroke.

What happens:
- typing in a form updates the local draft immediately
- the app marks the portfolio as having unsaved changes
- nothing is persisted until you click:
  - `Save Cards`
  - `Save Accounts`
  - `Save Settings`

If you leave without saving, the draft changes are not part of saved history.

## How To Add A Credit Card
1. Click `Add Card`.
2. Select the new row in the card list if needed.
3. Fill in the card form on the right.
4. Use the `Institution` field search to find a known issuer.
   It supports aliases like `Amex`, `BofA`, and `US Bank`.
5. Enter your own `Nickname`.
   This is your label for the card.
6. Fill in balance, APR, due date, promo details, autopay details, and notes.
7. Click `Save Cards`.

## How To Add A Cash Account
1. Click `Add Cash Account` or `Add Account`.
2. Select the new account if needed.
3. Fill in the account form.
4. Use the `Institution` search to find a known bank, or type your own.
5. Set the real day-end minimum you do not want to breach.
6. Click `Save Accounts`.

## Institution Search
The institution picker is searchable and still allows custom text.

It works like this:
- type part of a bank or issuer name
- type a common alias like `Amex`, `BofA`, `Schwab`, or `SoFi`
- choose the suggested canonical institution name
- or ignore suggestions and type your own institution

The `Nickname` or `Account Name` remains fully user-defined.

## Setup And Strategy
Open the `Dashboard` and use the setup panel to control how the app prioritizes cards.

### Setup fields
- `Extra payment budget`
- `Promo soon days`
- `Global cash buffer override`
- `Payoff strategy`

### Payoff strategies
- `Avalanche`
  Focuses more on expensive debt first.
- `Snowball`
  Pushes smaller balances higher for faster wins.
- `Promo-first`
  Pushes expiring promotional balances higher.
- `Custom`
  Lets you set your own weighting values.

If you choose `Custom`, extra weight inputs appear. Higher values make that factor matter more in ranking.

## Status Meaning
### Danger
Needs urgent attention.

Common reasons:
- active interest pressure
- expired promo
- very high utilization
- cash below minimum buffer

### Warning
Needs attention soon.

Common reasons:
- promo ending soon
- due date close
- elevated utilization

### Watch
Not urgent, but still worth monitoring.

Common case:
- statement-balance autopay is active, so the card is not treated like immediate danger

### OK
Stable enough for now.

### Paid
Zero-balance account.

## Importing A Workbook
Workbook import is secondary.

Use it when:
- you already track data in a spreadsheet
- you want to seed the app
- you want to restore from a workbook-style snapshot

### Import steps
1. Use the `Import Backup Workbook` area.
2. Choose `Replace current portfolio` or `Merge into current portfolio`.
3. Upload your workbook.

### Template
If you need the expected structure, download:

[public/debt-crusher-import-template.xlsx](/Users/basho00/_github/_personal/debt-crusher/public/debt-crusher-import-template.xlsx)

### Import notes
- replace mode overwrites the working portfolio
- merge mode keeps existing records and adds or updates matching ones
- the app validates required sheets and columns
- workbook import becomes part of saved history

## Backup And Export
### Export Backup
Downloads a JSON backup of the app-owned portfolio and snapshot history.

Use this for:
- local backups
- portability
- later restore

### Restore Backup
Loads a previously exported JSON backup into the app.

This replaces the current working portfolio after confirmation.

### Export Workbook
Downloads the current app-owned data as an Excel workbook.

Use this when:
- you want a spreadsheet copy
- you want to archive a workbook snapshot
- you want to move data back into an Excel-based process

## History Panel
The history rail shows:
- saved snapshots
- balance deltas
- added/removed accounts
- setup changes
- recent save-driven events

This helps answer:
- what changed since the last save
- which balances moved
- when setup or accounts changed

## Reset Unsaved
`Reset Unsaved` discards the current draft and restores the last saved portfolio.

Use it if:
- you edited a lot of fields and want to back out
- you imported or typed something incorrectly

## Recommended User Workflow
1. Add your cash accounts.
2. Add your credit cards.
3. Set your payoff strategy and cash rules in `Dashboard`.
4. Save everything.
5. Use the `Immediate Focus` card on the dashboard.
6. Update balances and cash periodically.
7. Save after each meaningful update so history stays useful.

## Known Limits In The Current Version
- no automatic bank sync
- no write-back to your original workbook
- no explicit payment-entry workflow yet
- no projected payoff date simulator yet
- comparisons are snapshot-based, not a full ledger

## Related Docs
- Local DB setup: [LOCAL_DB.md](/Users/basho00/_github/_personal/debt-crusher/LOCAL_DB.md)
- Product plan: [Plan.md](/Users/basho00/_github/_personal/debt-crusher/Plan.md)
