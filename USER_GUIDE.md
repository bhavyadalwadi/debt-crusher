# Debt Crusher User Guide

## What This App Is

Debt Crusher is a private financial operations workspace. Enter current values manually, review them on a regular cadence, and use the dashboard to see upcoming activity, cash pressure, promotion risk, and payoff priorities.

Manual entry is the source of current financial truth. Workbook, JSON, and screenshot tools are for bootstrap, backup, portability, or review; imported values should not be assumed current until confirmed.

## What the App Saves

- payoff preferences and cash-buffer settings
- cash accounts and current balances
- credit cards, statement details, APRs, limits, and due days
- card autopay rules and their funding accounts
- multiple promotional balances per card
- recurring income, expenses, transfers, and debt payments
- setup and monthly-review progress
- snapshots, activity events, audit records, and screenshot artifacts

Local development stores this data in SQLite. Production is designed for PostgreSQL/Neon.

Never enter full account numbers, routing numbers, card numbers, CVVs, or banking credentials. Store only institution, nickname/product, and last four digits.

## First-Time Local Setup

From the project folder:

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Set `DATABASE_URL`, `PRIVATE_ACCESS_USERNAME`, `PRIVATE_ACCESS_PASSWORD`, and `SESSION_SECRET` in `.env`, then open [http://localhost:3000](http://localhost:3000) and sign in.

If the local database already contains financial history, do not recreate it. Follow [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md).

## Recommended First Setup

On an empty portfolio, open **Setup** and complete the six steps:

1. Enter the extra-payment budget, promotion warning window, cash-buffer preference, and payoff strategy.
2. Add every active cash account, including its current balance, required minimum, optional target, and as-of date.
3. Add every active credit card, including current and statement balances, minimum due, APR, credit limit, due day, and as-of date.
4. Confirm each card's autopay mode, funding account, and execution day.
5. Add each known promotional balance. A card may have more than one promotion.
6. Review warnings and finish setup.

Enter cash accounts before cards so each card's funding account can be selected. Use **Save and add another** when entering several records.

Statement balance, minimum payment, autopay, or promotion terms may be left unknown. The final review flags missing values instead of inventing them.

## Main Screens

### Dashboard

Use the dashboard as the decision screen. It includes:

- immediate payoff focus, portfolio totals, utilization, and trend history
- **Today** and **Next 7 Days** expected account activity
- **Cash Health**, a 35-day forecast for each active cash account
- funding shortfall and missing-payment-data warnings
- **Promo Deadlines** with required payoff pace and risk reasons
- planned extra-payment budget compared with the currently cash-safe amount
- quick statement, minimum, due-date, autopay, promotion, and recurring-cash-flow configuration

The forecast includes configured recurring transactions and expected card payments. If a required payment amount is unknown, the app reports it as unknown and does not reduce projected cash by a guessed amount.

### Credit Cards

Use this screen for the existing card list and detail editor. It includes sorting, institution search, ranking/status feedback, and a review-freshness label:

- **Reviewed this month**
- **Needs review**
- the last review date

### Cash Accounts

Use this screen for checking and savings account details, required cash minimums, safe-cash calculations, institution search, and review freshness.

### Utilities

Use Utilities for workbook import/export, JSON backup/restore, templates, and screenshot-assisted entry. These remain secondary to the manual workflow.

### History and Trends

Recorded updates appear in portfolio and per-account trend charts. Use the `30d`, `90d`, `1y`, and `All` ranges to review total credit balance, safe cash, weighted utilization, or an individual account's balance and utilization. Autosaves do not create trend points.

## Important Save Behavior

Valid edits autosave after a short pause. Autosave updates the current portfolio
without creating a history entry for every keystroke.

What happens:

- typing in a form updates the draft immediately
- after about 800 ms, valid values are persisted to the app database
- the header shows `Autosave queued`, `Saving`, `Autosaved`, or `Save failed`
- click `Record Update` when the current values should become a historical checkpoint

Invalid form values wait in the draft until fixed. Autosaved edits survive a
refresh, but only recorded updates and imports appear in historical trends.

## How To Add A Credit Card

1. Click `Add Card`.
2. Select the new row in the card list if needed.
3. Fill in the card form on the right.
4. Use the `Institution` field search to find a known issuer.
   It supports aliases like `Amex`, `BofA`, and `US Bank`.
5. Enter your own `Nickname`.
   This is your label for the card.
6. Fill in balance, APR, due date, promo details, autopay details, and notes.
7. Wait for `Autosaved`; click `Record Update` when this balance should enter history.

## How To Add A Cash Account

1. Click `Add Cash Account` or `Add Account`.
2. Select the new account if needed.
3. Fill in the account form.
4. Use the `Institution` search to find a known bank, or type your own.
5. Set the real day-end minimum you do not want to breach.
6. Wait for `Autosaved`; click `Record Update` when this balance should enter history.

## Monthly Review

Run **Monthly Review** once per calendar month.

The review includes every active cash account, credit card, and recurring transaction. For each item you can:

- update current values and their as-of date
- confirm that the saved values are unchanged
- mark unavailable values as unknown
- skip the item for this review

Progress is saved, so an interrupted review can resume. Completing the review creates durable review/audit history and a portfolio snapshot. Card and cash lists then show the updated review date.

## Fast Operational Updates

The dashboard operations console lets you update a card's statement balance, minimum due, due day, autopay mode, funding account, execution day, and as-of date without opening the full legacy editor.

You can also add:

- recurring income
- recurring expenses
- transfers between cash accounts
- recurring debt payments
- card-specific promotional offers, including deferred-interest terms and safety days

Recurring rules use a day of month. In shorter months, the forecast uses the last valid calendar day.

## Payoff Strategies and Status

- **Avalanche** emphasizes higher-interest balances.
- **Snowball** emphasizes smaller balances.
- **Promo-first** elevates promotional balances approaching their deadlines.
- **Custom** lets you tune the ranking weights.

Legacy card status labels are:

- **Danger** — urgent interest, expired promotion, severe utilization, or cash pressure
- **Warning** — near-term promotion, due-date, or utilization pressure
- **Watch** — worth monitoring, often because statement-balance autopay reduces immediate urgency
- **OK** — stable and not notable
- **Paid** — zero balance

Promotion risk is assessed separately using the balance, deadline or target date, safety buffer, deferred-interest flag, and known planned payment pace.

## Import, Backup, and Export

### Workbook

- **Replace** overwrites the working portfolio after confirmation.
- **Merge** keeps existing records and adds or updates matching records.
- the importer validates required sheets, columns, and bad summary rows
- workbook import becomes part of saved history

The template is available at [public/debt-crusher-import-template.xlsx](./public/debt-crusher-import-template.xlsx).

### JSON backup

- **Export Backup** downloads a versioned backup containing the current portfolio, checkpoints, and activity events.
- **Restore Backup** replaces the app-owned portfolio and history after confirmation. Restore is transactional, so a malformed backup cannot leave partially replaced data.
- Older portfolio-only JSON backups remain supported.
- Local SQLite and hosted Neon are separate datasets; backup export/restore is the supported way to move data between them.

### Screenshot-assisted entry

Upload a screenshot for OCR extraction, review and correct the extracted fields, then save with replace or merge behavior. The source screenshot is retained as an artifact linked from history.

Do not upload screenshots containing full account/card numbers, routing numbers, credentials, or other unnecessary secrets.

## Recommended Ongoing Workflow

1. Check Today, Next 7 Days, cash warnings, and promotion warnings.
2. Correct missing statement or autopay details when a data-quality action appears.
3. Keep recurring cash flow and funding-account links current.
4. Run Monthly Review once per month and confirm every active record.
5. Use the lower of the planned extra-payment budget and cash-safe amount when deciding what can leave cash accounts.
6. Export a JSON backup before major imports, restores, or database upgrades.

## Current Limits

- no automatic bank sync
- optional Plaid-based bank connectivity is on the future roadmap but is not implemented
- no dedicated payment/cash-transfer ledger entry yet
- no projected payoff-date and interest-cost simulator yet
- historical comparison is primarily snapshot- and audit-based
- no native iPhone Share Sheet target; screenshot intake starts with web upload

## Related Documentation

- [README](./README.md)
- [Local database notes](./LOCAL_DB.md)
- [Product plan](./Plan.md)
- [Current status](./STATUS.md)
- [Migration and rollback guide](./prisma/MIGRATIONS.md)
