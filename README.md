# Debt Crusher

Debt Crusher is a private, forms-first financial operations console for managing cash accounts, credit cards, autopay rules, promotional balances, recurring cash flow, payoff strategies, and account forecasts.

## What the app does

- Tracks cash accounts, required minimums, credit cards, statement balances, and minimum payments.
- Associates each card's autopay rule with its funding account.
- Supports multiple promotional balances per card, including deferred-interest warnings and target payoff calculations.
- Forecasts 35 days of recurring income, expenses, transfers, and expected card payments.
- Warns when a funding account is projected to fall below its required balance.
- Compares the planned extra-payment budget with the amount currently safe to spend.
- Supports Avalanche, Snowball, Promo-first, and custom payoff strategies.
- Preserves activity snapshots, audit history, workbook import/export, JSON backups, and screenshot-assisted updates.

Manual entry is the source of current financial truth. Workbook values and imports should be reviewed as historical or unconfirmed data rather than assumed to be current.

## Technology

- Next.js 15, React 19, and TypeScript
- Prisma
- SQLite for local development
- PostgreSQL/Neon for production
- Vitest

## Prerequisites

- Node.js 20 or newer
- npm
- A local SQLite database for development
- A PostgreSQL/Neon database for production deployment

## First-time local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

3. Set the required values in `.env`:

   ```env
   DATABASE_URL="file:./dev.db"
   PRIVATE_ACCESS_USERNAME="your-private-username"
   PRIVATE_ACCESS_PASSWORD="use-a-strong-password"
   SESSION_SECRET="use-a-long-random-secret"
   ```

   With this relative URL, Prisma creates the database at `prisma/dev.db`.

4. Create a new local database from the committed migration:

   ```bash
   npm run db:migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) and sign in with `PRIVATE_ACCESS_USERNAME` and `PRIVATE_ACCESS_PASSWORD`.

## Upgrading an existing local database

Do not replace or recreate an existing database containing financial history.

1. Stop the app and make a backup:

   ```bash
   cp prisma/dev.db prisma/dev.db.backup
   ```

2. Mark the operations-core baseline for the previously unversioned database:

   ```bash
   npx prisma migrate resolve --applied 20260810031500_operations_core
   ```

3. Apply the additive schema changes:

   ```bash
   npm run db:push
   ```

4. Backfill normalized institutions, cards, autopay rules, and legacy promotions while preserving stable IDs and current balances:

   ```bash
   npm run db:backfill:operations
   ```

5. Verify that legacy and normalized account counts agree:

   ```bash
   npm run db:verify:operations
   ```

Do not continue deployment if verification reports mismatched counts. See [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md) for rollout and rollback notes.

## Daily development commands

```bash
npm run dev                       # Generate the SQLite client and start Next.js
npm test                          # Run the test suite once
npx tsc --noEmit                  # Type-check without writing build output
npm run build                     # Generate the PostgreSQL client and create a production build
npm start                         # Generate the PostgreSQL client and start a production build
npm run prisma:generate           # Generate the local SQLite Prisma client
npm run prisma:generate:postgres  # Generate the PostgreSQL Prisma client
npm run db:push                   # Synchronize the local SQLite schema
npm run db:push:postgres          # Synchronize the configured PostgreSQL schema
```

`npm run build` expects `DATABASE_URL` to be a PostgreSQL connection string because production uses `prisma/schema.postgres.prisma`.

## Using the operations console

1. On an empty portfolio, open **Setup** and follow the six-step manual checklist.
2. Enter payoff preferences, then every active cash account before entering cards so autopay funding can be selected.
3. Add each card with its current and statement balances, minimum due, APR, limit, due day, autopay, funding account, as-of date, and any known promotion. Use **Save and add another** for bulk entry.
4. Unknown statement, autopay, and promotion values may be left blank; the final review lists them as accuracy warnings rather than inventing values.
5. Use **Monthly Review** once per calendar month to confirm or update each active account, card, and recurring transaction. Progress is saved so an interrupted review can resume.
6. Completing setup or a monthly review creates a durable snapshot and audit records. Card and cash lists show **Reviewed this month**, **Needs review**, or the last review date.
7. Review **Today**, **Next 7 Days**, **Cash Health**, **Promo Deadlines**, and **Recommended Actions** on the dashboard.
8. Use **Utilities** for XLSX import/export, JSON backup/restore, templates, and screenshot-assisted entry. These are secondary to manual entry.

Unknown statement balances or minimum payments remain explicitly unknown. The forecast does not invent an expected payment amount.

## Authentication and security

- The middleware protects the application and API routes.
- Successful sign-in creates a signed `HttpOnly`, `SameSite=Lax` session cookie.
- Changing `SESSION_SECRET` invalidates existing sessions.
- Missing authentication variables produce the configuration-error sign-in state.
- Never store full account numbers, routing numbers, card numbers, CVVs, or banking credentials in the app, source code, imports, or logs.
- Use institution, nickname/product, and last four digits only.
- Keep `.env`, SQLite database files, and backups out of Git.

## Production setup with Vercel and Neon

1. Create or select a Neon PostgreSQL database and take a branch/backup before changing an existing database.
2. Configure these Vercel environment variables:

   - `DATABASE_URL` — the Neon PostgreSQL connection string
   - `PRIVATE_ACCESS_USERNAME`
   - `PRIVATE_ACCESS_PASSWORD`
   - `SESSION_SECRET`

3. For a new or existing Neon database, synchronize the PostgreSQL schema from a trusted local environment:

   ```bash
   DATABASE_URL="your-neon-url" npm run db:push:postgres
   ```

4. If upgrading existing production data, backfill and verify with the PostgreSQL client:

   ```bash
   DATABASE_URL="your-neon-url" npm run db:backfill:operations:postgres
   DATABASE_URL="your-neon-url" npm run db:verify:operations:postgres
   ```

   Test the entire backup → schema push → backfill → verification workflow on a Neon branch before production.
5. Deploy through Vercel. The production build generates Prisma Client from `prisma/schema.postgres.prisma`.

The repository includes a PostgreSQL migration baseline under `prisma/migrations-postgres/` for review and controlled database administration. The application currently uses `db:push:postgres` for production synchronization because the local and production providers use separate Prisma schemas.

## Data migration and rollback

The operations-core rollout is additive:

- Legacy credit and cash fields remain available for compatibility.
- Existing activity snapshots and screenshot artifacts are retained.
- Backfill does not import workbook values or replace current balances.
- Cash accounts referenced by autopay or recurring rules are archived instead of destructively deleted.
- Rollback is application-first: restore the prior application version while retaining the additive tables.

For detailed commands, see [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md).

## Project documentation

- [Migration and rollback guide](./prisma/MIGRATIONS.md)
- [Local database notes](./LOCAL_DB.md)
- [Current product status](./STATUS.md)
- [Product plan](./Plan.md)
