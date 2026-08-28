# Local Database Setup

This app uses SQLite locally and a separate Neon Postgres database in Vercel
production. Both databases persist portfolio values and recorded history, but
they are independent: changes made locally do not automatically appear in the
hosted app, and hosted changes do not sync back to the local database.

## 1. Set local env
Copy the example env if you have not already:

```bash
cp .env.example .env
```

Then keep the local SQLite path and configure a Clerk development instance plus Sandbox-only financial secrets as shown in `.env.example`:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
DEBT_CRUSHER_OWNER_CLERK_USER_ID="user_..."
PLAID_ENV="sandbox"
SECURITY_HASH_KEY="..."
FINANCIAL_TOKEN_KEY_VERSION="v1"
FINANCIAL_TOKEN_KEK_V1="32-byte-base64-key"
```

Generate and validate the independent keys with [SECRET_KEY_MANAGEMENT.md](./SECRET_KEY_MANAGEMENT.md). Use [CLERK_SECURITY_RUNBOOK.md](./CLERK_SECURITY_RUNBOOK.md) for the required owner/MFA/session configuration and [LOCAL_PLAID_WEBHOOK_TUNNEL.md](./LOCAL_PLAID_WEBHOOK_TUNNEL.md) when Plaid needs to reach the local webhook.

## 2. Generate Prisma client and push the schema

```bash
npm run prisma:generate
npm run db:push
```

This creates or updates your local SQLite database at `prisma/dev.db`.

`file:./dev.db` is resolved relative to `prisma/schema.prisma`, which is why the
file lives under `prisma/` rather than the repository root. The database file
contains private financial data and is ignored by Git; do not commit it.

## 3. Start the app

```bash
npm run dev
```

The app redirects unauthenticated users to `/sign-in`. Configure MFA or passkeys as required in Clerk.

After signing in, saved values should survive both a browser refresh and a
local dev-server restart. Autosaves update the current portfolio. Explicit
checkpoints and supported imports additionally create history used by the
activity and trend views.

## 4. Vercel

Set these values in Vercel project env vars:
- `DATABASE_URL`
- the Clerk development keys, exact frontend API origin, and owner user ID
- Plaid Sandbox credentials and the fixed staging webhook URL
- `SECURITY_HASH_KEY` and the versioned financial-token wrapping key

For private staging, `DATABASE_URL` should point to a dedicated Neon branch. Vercel Production must not receive Plaid credentials.

Initialize Neon before the first hosted request, and repeat the schema push
after Prisma schema changes:

```bash
DATABASE_URL="postgresql://..." npm run db:push:postgres
```

Do not point local development at Neon unless you intentionally want to work
against hosted data. The normal configuration is:

| Environment | Database | `DATABASE_URL` example |
| --- | --- | --- |
| Local development | SQLite | `file:./dev.db` |
| Vercel | Neon Postgres | `postgresql://...` |

## Moving data between environments

There is no automatic synchronization. Export a JSON backup from the source
environment, then restore it in the destination environment. Version 2 backups
contain the current portfolio, checkpoints, and activity events. Legacy JSON
files containing only `{ "portfolio": ... }` remain importable, but naturally
have no history to restore.

Restore is an all-or-nothing database operation: malformed or unsupported
backup data must not partially replace the destination portfolio or history.
Keep a backup until the restored portfolio and trends have been verified.

## Troubleshooting

- **Missing or invalid `DATABASE_URL`:** fix `.env` (local) or the Vercel
  environment variable, then restart/redeploy the app.
- **Schema/table errors:** run `npm run prisma:generate` and `npm run db:push`
  locally, or `npm run db:push:postgres` with the Neon URL for production.
- **Local data is absent in Vercel:** this is expected; SQLite and Neon do not
  sync. Move the data using JSON backup export/restore.
- **Do not delete `prisma/dev.db` to troubleshoot** unless you intend to erase
  the local dataset. Export a backup first.
