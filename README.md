# Debt Crusher

Debt Crusher is a private, single-owner financial operations console for managing cash accounts, credit cards, autopay rules, promotional balances, recurring cash flow, payoff strategies, reviews, forecasts, and financial history.

It includes a security-reviewed, read-only Plaid Sandbox integration. Plaid data is treated as an untrusted proposal: connected accounts must be matched to existing Debt Crusher accounts, and every changed field must be accepted explicitly before trusted data is updated.

> **Security status: Sandbox only**
>
> The current verdict is **IMPLEMENTATION COMPLETE — SAFE FOR SANDBOX ONLY**. Use fake Plaid Sandbox institutions and credentials only. Do not connect real institutions, configure Plaid Production credentials, or add money-movement products. The application intentionally refuses `PLAID_ENV=production` at startup and when constructing the Plaid client.

**Next release steps:** follow the [Pre-Production Checklist](./PRE_PRODUCTION_CHECKLIST.md) from staging deployment through the separate real-bank approval gate.

## Contents

- [Product behavior](#product-behavior)
- [Security boundaries](#security-boundaries)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Step-by-step local setup](#step-by-step-local-setup)
- [Upgrading an existing SQLite database](#upgrading-an-existing-sqlite-database)
- [Using Plaid Sandbox](#using-plaid-sandbox)
- [Step-by-step Vercel and Neon staging setup](#step-by-step-vercel-and-neon-staging-setup)
- [Migrations and data movement](#migrations-and-data-movement)
- [Testing and verification](#testing-and-verification)
- [Key rotation](#key-rotation)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Troubleshooting](#troubleshooting)
- [Operational security](#operational-security)
- [Known limits and release blockers](#known-limits-and-release-blockers)
- [Pre-production checklist](./PRE_PRODUCTION_CHECKLIST.md)

## Product behavior

Debt Crusher supports:

- Cash accounts with current balance, required minimum, optional target, source, and as-of date.
- Credit cards with current and statement balances, minimum payment, APR, credit limit, due day, status, and notes.
- Card autopay modes linked to an existing funding account.
- Multiple promotional balances per card, including deferred-interest and payoff-deadline warnings.
- Recurring income, expenses, transfers, and debt payments.
- A 35-day cash forecast with expected card payments and required-balance shortfall warnings.
- Avalanche, Snowball, Promo-first, and custom payoff strategies.
- Setup and resumable monthly-review workflows.
- Review freshness labels and explicit unknown-value handling.
- Autosave for current state and intentional checkpoints for history.
- Activity snapshots, audit history, trend charts, workbook import/export, JSON backup/restore, and screenshot-assisted entry.
- Read-only Plaid Sandbox discovery, balance/liability refresh, connection status, explicit matching, and field-level review.

The governing product rule is:

> **Manual truth until explicitly accepted.**

Plaid, workbooks, screenshots, and imports do not silently overwrite trusted financial values.

## Security boundaries

### Allowed Plaid behavior

- Discover US checking, savings, money-market, and credit-card accounts.
- Retrieve minimum account metadata and current balances.
- Retrieve supported credit-card liabilities such as statement balance, minimum payment, credit limit, purchase APR, and due day.
- Retrieve Item and connection status.
- Stage normalized field-level proposals for owner review.
- Refresh manually or after a verified webhook.
- Disconnect and revoke a Plaid Item.

### Explicitly prohibited

- Plaid Auth or Transfer.
- Stripe ACH or PaymentMethod creation.
- Payment Initiation, Signal, Identity, Income, or Assets.
- Account/routing numbers or unnecessary ownership/identity data.
- Bank, card, ACH, wire, bill, or debt payments.
- Automatic trusted-account creation or field acceptance.
- Transaction ingestion in V1.
- Raw Plaid response storage.
- Production Plaid credentials or real institutions.

Plaid Link is initialized with Transactions because Plaid Balance cannot initialize Link independently. Debt Crusher does **not** call `/transactions/sync` and does not persist transaction rows.

### Authentication and authorization

- Clerk v7 manages identity, sessions, revocation, MFA, and passkeys.
- The Clerk proxy authenticates requests; every protected page and API resource independently enforces the owner boundary.
- Only `DEBT_CRUSHER_OWNER_CLERK_USER_ID` may access the app.
- The server derives the owner/portfolio from the Clerk session; browser-provided owner IDs are never trusted.
- Connect, exchange, disconnect, bank-data deletion, backup export, and backup restore require strict Clerk reverification.
- Every financial resource is queried through the owner-scoped `current` portfolio.

### Financial credential protection

- A Plaid access token never reaches the browser.
- Tokens use AES-256-GCM with a random data key per token.
- Each data key is wrapped by a separate versioned 256-bit key stored only in environment secrets.
- JSON backups and browser DTOs exclude tokens, provider IDs, encryption metadata, sync jobs, staging internals, and security events.
- Financial API and screenshot artifact responses use `Cache-Control: private, no-store`.

Read [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) for the complete threat model and release checklist.

## Architecture

```text
Clerk owner session
        │
        ▼
Clerk-authenticated proxy + resource-level owner checks
        │
        ├── Manual setup / review / forecast / history
        │
        └── Server-created Plaid Link token
                     │
                     ▼
              Plaid Sandbox Link
                     │ one-time public token
                     ▼
             Server-side token exchange
                     │
                     ├── access token → encrypted envelope → database
                     │
                     └── Item + Balance + Liabilities fetch
                                      │
                                      ▼
                         Minimum normalized account data
                                      │
                                      ▼
                           Explicit account matching
                                      │
                                      ▼
                         Field-level staged proposals
                                      │
                             Accept or Ignore
                                      │
                                      ▼
                    Trusted record + compatibility row + audit
```

Verified webhook flow:

```text
Plaid raw webhook
      ↓
ES256 JWT + Plaid JWK + iat + body-hash verification
      ↓
Idempotent receipt + durable SyncJob
      ↓
Fresh Plaid API fetch
      ↓
Staged proposals only
```

Webhook payload values never update trusted balances directly.

### Technology

- Next.js 16 App Router, React 19, and TypeScript.
- Clerk v7.
- Plaid Node SDK and React Plaid Link.
- Prisma 6.
- SQLite locally and PostgreSQL/Neon for hosted staging.
- Zod, JOSE, and Node.js AES-256-GCM.
- Vitest.
- Recharts, Tesseract.js, and ExcelJS for existing utilities.

### Environment separation

| Environment | Database | Plaid | Clerk | Purpose |
|---|---|---|---|---|
| Local | SQLite at `prisma/dev.db` | Sandbox only | Development instance | Development/unit tests |
| Private Vercel Preview/staging | Dedicated Neon branch | Sandbox only | Development instance | End-to-end staging |
| Vercel Production | Separately reviewed database | **No Plaid credentials** | Separately reviewed | Non-Plaid app until future approval |

Local SQLite and Neon are independent. They do not synchronize automatically.

## Prerequisites

### Local development

- Node.js 20 or newer.
- npm and Git.
- OpenSSL for secret generation.
- A Clerk development application.
- One Clerk owner user with MFA or a passkey.

### Complete Plaid flow

- A Plaid account with Sandbox API keys.
- A publicly reachable HTTPS webhook with a valid certificate; a fixed private Vercel staging URL is recommended.
- Fake Plaid Sandbox credentials only.

### Hosted staging

- Vercel project.
- Dedicated Neon staging branch.
- `psql` if applying reviewed PostgreSQL migration SQL directly.

Verify local tools:

```bash
node --version
npm --version
openssl version
```

## Environment variables

Copy [.env.example](./.env.example) and replace every placeholder. Never commit `.env`, database files, backups, or secret values.

| Variable | Browser-visible? | Required | Purpose |
|---|---:|---:|---|
| `DATABASE_URL` | No | Yes | `file:./dev.db` locally; dedicated Neon URL in staging |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Yes | Clerk development publishable key |
| `CLERK_SECRET_KEY` | No | Yes | Clerk development secret key |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Yes | Yes | Exact Clerk Frontend API origin used by CSP |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Yes | Keep as `/sign-in` |
| `DEBT_CRUSHER_OWNER_CLERK_USER_ID` | No | Yes | The one allowed Clerk `user_...` ID |
| `PLAID_ENV` | No | Bank Sync | Must be `sandbox` |
| `PLAID_CLIENT_ID` | No | Bank Sync | Plaid client/team ID |
| `PLAID_SECRET` | No | Bank Sync | Plaid Sandbox secret only |
| `PLAID_WEBHOOK_URL` | No | Bank Sync | Fixed public HTTPS `/api/plaid/webhook` URL |
| `FINANCIAL_TOKEN_KEY_VERSION` | No | Bank Sync | Active key version, initially `v1` |
| `FINANCIAL_TOKEN_KEK_V1` | No | Bank Sync | Independent 32-byte base64 wrapping key |
| `SECURITY_HASH_KEY` | No | Yes | Independent secret for opaque hashes |

Only variables prefixed with `NEXT_PUBLIC_` are intentionally available to browser code.

Generate two independent values:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Use the base64 output for `FINANCIAL_TOKEN_KEK_V1` and hex output for `SECURITY_HASH_KEY`. Do not paste real values into documentation, issues, commits, build arguments, screenshots, logs, or chat.

The values must be generated separately and never reused. See [SECRET_KEY_MANAGEMENT.md](./SECRET_KEY_MANAGEMENT.md) for safe validation, Vercel scoping, rotation, and compromise response.

Verify the decoded wrapping-key length without printing it:

```bash
node --env-file=.env -e "const key=Buffer.from(process.env.FINANCIAL_TOKEN_KEK_V1||'', 'base64'); console.log(key.length===32 ? 'Encryption key length: OK' : 'Encryption key length: INVALID')"
```

## Step-by-step local setup

### 1. Clone and enter the repository

```bash
git clone <your-repository-url>
cd debt-crusher
```

If it already exists:

```bash
pwd
test -f package.json && echo "Repository root: OK"
```

### 2. Configure Clerk

1. Open the [Clerk Dashboard](https://dashboard.clerk.com/) and create a development application for Debt Crusher.
2. Under **User & authentication**, enable the chosen private sign-in method. Email/password or passkey is suitable.
3. Require email verification.
4. Open **Multi-factor**.
5. Enable authenticator/TOTP and backup codes; SMS may be an additional recovery option.
6. Turn on **Require multi-factor authentication**.
7. If using passkeys, enable the setting that allows passkeys to satisfy MFA when available.
8. Use restricted sign-up and create the owner manually because this app is private and single-owner. The application does not expose a self-service sign-up flow.
9. Under **Users**, copy the owner's `user_...` ID.
10. Under **API keys**, copy the development Publishable Key and Secret Key.
11. Copy the Frontend API URL from the API keys page. It normally resembles `https://verb-noun-00.clerk.accounts.dev`.

Do not use a Clerk production instance for this Sandbox integration.

The current development-instance baseline and repeatable CLI audit are documented in [CLERK_SECURITY_RUNBOOK.md](./CLERK_SECURITY_RUNBOOK.md). Clerk authentication alone is not access: the server also requires the exact owner user ID, so any other valid Clerk user receives a dashboard `404` and API `403`.

### 3. Configure Plaid Sandbox

1. Open the [Plaid Dashboard](https://dashboard.plaid.com/).
2. Copy the client ID and **Sandbox** secret from API Keys.
3. Do not copy a Production secret.
4. Do not add Auth, Transfer, Identity, Payment Initiation, Signal, Income, or Assets.
5. Choose a webhook location:
   - Recommended: fixed HTTPS Vercel Preview/staging domain.
   - Local alternative: HTTPS tunnel to port 3000.

The webhook URL is sent during Plaid Link-token creation. Every webhook is still cryptographically verified before processing.

For the complete local `cloudflared` workflow, expected `401` rejection probe, authentic Sandbox webhook test, URL lifecycle, and teardown, read [LOCAL_PLAID_WEBHOOK_TUNNEL.md](./LOCAL_PLAID_WEBHOOK_TUNNEL.md).

### 4. Create `.env`

Create the file before installing because `postinstall` generates Prisma Client:

```bash
cp .env.example .env
```

Fill it without printing secrets into terminal logs:

```env
DATABASE_URL="file:./dev.db"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your-development-key"
CLERK_SECRET_KEY="sk_test_your-development-key"
NEXT_PUBLIC_CLERK_FRONTEND_API_URL="https://your-instance.clerk.accounts.dev"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
DEBT_CRUSHER_OWNER_CLERK_USER_ID="user_your-owner-id"

PLAID_ENV="sandbox"
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_WEBHOOK_URL="https://your-fixed-staging-or-tunnel-host/api/plaid/webhook"

FINANCIAL_TOKEN_KEY_VERSION="v1"
FINANCIAL_TOKEN_KEK_V1="your-independent-32-byte-base64-key"
SECURITY_HASH_KEY="your-independent-long-random-secret"
```

The non-Plaid app can run before a public webhook exists. Do not select **Connect institution** until all Plaid/encryption values and a valid webhook are configured.

### 5. Install dependencies

```bash
npm install
```

Do not run `npm audit fix --force`; current suggested fixes include breaking framework/ORM changes.

### 6. Initialize a clean SQLite database

If there is no existing `prisma/dev.db` financial history:

```bash
npm run db:migrate
```

This applies:

1. `20260810031500_operations_core`
2. `20260810050000_manual_reviews`
3. `20260827090000_secure_plaid_sandbox`

Verify:

```bash
npx prisma migrate status --schema prisma/schema.prisma
DATABASE_URL="file:./dev.db" npx prisma validate --schema prisma/schema.prisma
```

`file:./dev.db` resolves relative to `prisma/schema.prisma`, so the file is `prisma/dev.db`.

If that file already contains financial data, stop and use the existing-database procedure below.

### 7. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Expected flow:

1. Clerk redirects to `/sign-in`.
2. Sign in as `DEBT_CRUSHER_OWNER_CLERK_USER_ID`.
3. Complete MFA/passkey setup.
4. Any other authenticated Clerk user receives a dashboard `404` and API `403`.

Restart after changing environment variables.

### 8. Create trusted accounts

Before Plaid:

1. Open **Setup**.
2. Enter payoff and cash-buffer preferences.
3. Add cash accounts first.
4. Add cards with known balances, minimum, APR, limit, due day, and as-of date.
5. Configure autopay/funding accounts.
6. Add promotions if applicable.
7. Complete setup review.

Plaid never creates trusted V1 accounts automatically.

### 9. Verify the local installation

```bash
npm test
npx tsc --noEmit
git diff --check
```

The current baseline is 51 passing Vitest tests across 13 test files plus four release-configuration tests.

## Upgrading an existing SQLite database

Never recreate a database containing financial history.

### 1. Stop and back up

```bash
cp prisma/dev.db "prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)"
```

Keep the backup outside Git and verify it is non-empty.

### 2. Inspect migration state

```bash
npx prisma migrate status --schema prisma/schema.prisma
```

#### Already managed by Prisma migrations

Apply only unapplied migrations:

```bash
npm run db:migrate
```

#### Legacy database without migration tracking

Rehearse this against a disposable copy first:

1. Copy the database and point `DATABASE_URL` at the copy.
2. Push the additive schema; do not accept a destructive warning:

   ```bash
   npm run db:push
   ```

3. Backfill and verify:

   ```bash
   npm run db:backfill:operations
   npm run db:verify:operations
   ```

4. Only after the copied database passes, repeat against the intended database.
5. Record migrations as baselined only after confirming their schema exists:

   ```bash
   npx prisma migrate resolve --applied 20260810031500_operations_core
   npx prisma migrate resolve --applied 20260810050000_manual_reviews
   npx prisma migrate resolve --applied 20260827090000_secure_plaid_sandbox
   ```

6. Confirm:

   ```bash
   npx prisma migrate status --schema prisma/schema.prisma
   ```

Do not mark a migration applied before its schema is present. Stop on count mismatches, missing stable IDs, foreign-key errors, or destructive warnings.

### 3. Verify ownership

If the SQLite CLI is installed:

```bash
sqlite3 prisma/dev.db 'PRAGMA foreign_key_check; SELECT id, ownerId FROM Portfolio; SELECT COUNT(*) AS snapshots_without_portfolio FROM ActivitySnapshot WHERE portfolioId IS NULL;'
```

Expected:

- No `foreign_key_check` rows.
- The `current` portfolio, once created, belongs to `owner`.
- `snapshots_without_portfolio` is `0`.

See [prisma/MIGRATIONS.md](./prisma/MIGRATIONS.md).

## Using Plaid Sandbox

### Connect

1. Create trusted accounts first.
2. Open **Bank Sync**.
3. Select **Connect institution**.
4. Complete Clerk strict reverification if prompted.
5. Choose a Plaid Sandbox institution.
6. Standard successful Sandbox credentials are:
   - Username: `user_good`
   - Password: `pass_good`
7. Select supported checking, savings, money-market, or credit-card accounts.
8. Debt Crusher exchanges the one-time public token server-side, encrypts the access token, and runs an initial staged sync.

Plaid's official [Sandbox test credentials](https://plaid.com/docs/sandbox/test-credentials/) page is authoritative.

### Match accounts

1. Review institution, account type, name, and last four.
2. Select an existing Debt Crusher target.
3. Suggestions use institution/type/last four but are never auto-selected.
4. Select **Match**.
5. The server independently verifies provider-account and target ownership.
6. A sync creates proposals only when values differ.

### Review fields

Each proposal shows current value, proposed value, data-as-of time, and account context.

On **Accept**, the server rechecks owner, portfolio, proposal version/status, target field, and captured trusted baseline. If the trusted value changed, the server returns `409`; sync again and review the regenerated proposal.

### Connection states

| State | Meaning | Action |
|---|---|---|
| `CURRENT` | Recent successful sync | Review proposals |
| `STALE` | Success is older than 48 hours | Manual sync |
| `SYNCING` | A job owns the connection claim | Wait; duplicates are prevented |
| `REAUTH_REQUIRED` | Plaid returned `ITEM_LOGIN_REQUIRED` | Update-mode UI is follow-up work; reconnect if needed |
| `ERROR` | Sync failed safely | Retry and inspect redacted status |
| `DISCONNECTED` | Item revoked and token envelope cleared | Optionally delete provider data |

### Disconnect versus delete

**Disconnect** requires strict reverification, removes the Plaid Item, clears token ciphertext/wrapped keys, cancels active jobs, deletes unaccepted proposals, and prevents future sync. Accepted trusted values/history remain.

**Delete bank data** is available after disconnect, requires reverification, and removes the disconnected connection plus remaining normalized provider account/job data. Accepted trusted values/history still remain.

## Step-by-step Vercel and Neon staging setup

Use a private branch-specific Vercel Preview backed by its own Neon branch.

### 1. Create a Neon branch

1. Open Neon Console.
2. Create `debt-crusher-plaid-staging` or another explicit branch.
3. Never point staging at the primary database.
4. Copy the branch-specific pooled PostgreSQL URL.
5. Store it as staging-only `DATABASE_URL`.

See Neon's [branching workflow](https://neon.com/docs/get-started-with-neon/workflow-primer).

### 2. Initialize Neon

For a fresh empty branch, apply reviewed PostgreSQL SQL in order:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations-postgres/20260810031500_operations_core/migration.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations-postgres/20260810050000_manual_reviews/migration.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations-postgres/20260827090000_secure_plaid_sandbox/migration.sql
```

For a branch copied from an existing database, inspect first and apply only genuinely missing migrations. If operations/reviews already exist, rehearse and apply only:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations-postgres/20260827090000_secure_plaid_sandbox/migration.sql
```

For a disposable staging branch only, the repository also supports:

```bash
npm run db:push:postgres
```

Do not use unreviewed schema push against a primary/irreplaceable database.

If the branch contains legacy accounts:

```bash
npm run db:backfill:operations:postgres
npm run db:verify:operations:postgres
```

### 3. Link Vercel

```bash
npx vercel link
```

Use a dedicated staging Git branch. Vercel creates Preview deployments from non-production branches or `vercel` without `--prod`.

### 4. Configure Preview-only variables

In **Vercel → Project → Settings → Environment Variables**:

1. Scope financial values to **Preview**, preferably one staging branch.
2. Add the dedicated Neon `DATABASE_URL`.
3. Add Clerk development keys, exact Frontend API URL, sign-in path, and owner ID.
4. Add `PLAID_ENV=sandbox`, Plaid client ID, and Sandbox secret.
5. Add the independent HMAC and token wrapping key.
6. Add `FINANCIAL_TOKEN_KEY_VERSION=v1`.
7. Add the fixed HTTPS `PLAID_WEBHOOK_URL`.
8. Do **not** select Production for Plaid variables.

Vercel documents Preview/Production/Development scopes in [Environment Variables](https://vercel.com/docs/environment-variables).

### 5. Use a fixed webhook host

Prefer a stable branch URL or private custom staging domain, not a commit-specific URL:

```text
https://your-fixed-staging-host/api/plaid/webhook
```

It must be public HTTPS with valid TLS. Preserve the raw request body and `Plaid-Verification` header. This endpoint is public by design, but rejects invalid ES256/JWK/timestamp/body-hash verification.

Before connecting an Item, an unsigned probe must return `401`. A redirect to sign-in means an old deployment, middleware, or platform access control is intercepting Plaid. After that rejection test, fire a signed Plaid Sandbox webhook and require `200` plus one idempotent receipt/job.

### 6. Deploy Preview

```bash
npx vercel
```

Do not run `vercel --prod` for this integration.

The build runs `npm run build`, which generates Prisma Client from `prisma/schema.postgres.prisma` and builds Next.js.

### 7. Complete the staging gate

- Sign in as the owner with MFA/passkey.
- Confirm a second Clerk identity receives `403`.
- Verify session revocation and strict reverification.
- Connect only fake Plaid Sandbox accounts.
- Match, sync, accept, ignore, and force a trusted-baseline `409` conflict.
- Trigger valid, invalid, expired, replayed, duplicate, and concurrent webhooks.
- Confirm webhook content alone cannot update trusted values.
- Exercise stale, error, and login-required states.
- Disconnect and verify ciphertext is cleared.
- Delete disconnected provider data.
- Inspect Vercel logs, analytics, source maps, Neon exports, and backups for secrets.
- Validate CSP, HSTS, frame denial, and no-store headers.

Use [PLAID_SANDBOX_RUNBOOK.md](./PLAID_SANDBOX_RUNBOOK.md) and [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) as the release record.

## Migrations and data movement

### Prisma schemas

| File | Provider | Usage |
|---|---|---|
| `prisma/schema.prisma` | SQLite | Local dev/migrations |
| `prisma/schema.postgres.prisma` | PostgreSQL | Hosted build/staging |

### Data movement

There is no automatic SQLite ↔ Neon sync. Use versioned JSON backup export/restore after strict reverification.

Backups include trusted portfolio state, snapshots, and events. They exclude Plaid tokens, provider IDs, encryption fields, connections, jobs, webhook receipts, staged changes, security events, and rate limits. The destination needs separate Plaid Sandbox connections.

## Testing and verification

### Daily checks

```bash
npm test
npx tsc --noEmit
git diff --check
```

### Schema checks

```bash
DATABASE_URL="file:./dev.db" npx prisma validate --schema prisma/schema.prisma
npx prisma validate --schema prisma/schema.postgres.prisma
```

The PostgreSQL validation expects a PostgreSQL `DATABASE_URL`.

### Production-style build

```bash
npm run build
```

Use only the dedicated staging PostgreSQL URL.

### Release environment checks

Run the fail-closed environment validator before deploying. It prints variable names and errors, never secret values:

```bash
npm run release:check:staging
npm run release:check:production
```

Staging requires development Clerk keys and, when Bank Sync is configured, a complete Plaid Sandbox/encryption configuration. Production requires live Clerk keys and rejects every Plaid variable until real-bank access receives separate approval.

### Browser release gates

The public suite starts locally without authenticated test credentials:

```bash
npm run test:e2e:public
```

Authenticated owner/non-owner validation requires Clerk development keys and the two test-user emails described in `.env.e2e.example`:

```bash
npm run test:e2e:auth
```

The authenticated helper verifies application authorization; it does not replace the manual MFA, recovery, and session-revocation exercise in the staging runbook.

### Dependency audit

```bash
npm audit --omit=dev
```

The 2026-08-30 release-candidate audit reports zero known production dependency vulnerabilities after upgrading Next.js, aligning Prisma on the audited compatible release, and replacing the unpatched SheetJS package with ExcelJS. Keep `npm audit --omit=dev` in the release gate and never apply forced upgrades without the full regression suite.

### Current test coverage

- Token encryption/decryption, tamper rejection, and ciphertext-preserving key rewrap.
- Plaid product allowlist and production refusal.
- Opaque Plaid client user ID.
- Owner rejection and request origin/content-type/body limits.
- Valid, invalid, expired, future, missing, and body-mismatched webhook verification.
- Existing portfolio, backup, review, import, screenshot, and operations behavior.

Live service configuration still requires staging validation.

## Key rotation

To rotate `v1` to `v2`:

1. Generate another independent 32-byte base64 key.
2. Add it as `FINANCIAL_TOKEN_KEK_V2` while retaining V1.
3. Run against the intended staging database:

   ```bash
   npm run security:rotate-token-key -- v2
   ```

4. The command prints only the number of rewrapped data keys.
5. Set `FINANCIAL_TOKEN_KEY_VERSION=v2`.
6. Redeploy and verify every Sandbox connection syncs.
7. Confirm every connection reports key version V2.
8. Remove V1 only after verification and rollback retention.

If database ciphertext and the wrapping key may both be compromised, revoke every Plaid Item and reconnect; rewrapping alone is insufficient.

## API reference

All routes except the webhook require the active Clerk owner. Mutations enforce same-origin requests and bounded schemas. Financial responses are no-store.

| Method | Route | Purpose | Reverification |
|---|---|---|---|
| `POST` | `/api/plaid/link-token` | Owner-bound Link token | Strict |
| `POST` | `/api/plaid/exchange` | Exchange public token, encrypt credential, initial sync | Strict |
| `POST` | `/api/plaid/webhook` | Public raw-body verified webhook | Plaid signature |
| `GET` | `/api/bank-connections` | Connection/account/freshness DTOs | Owner session |
| `POST` | `/api/bank-connections/[connectionId]/sync` | Manual refresh | Owner session |
| `POST` | `/api/bank-accounts/[accountId]/match` | Match existing cash/card target | Owner session |
| `GET` | `/api/bank-sync/changes` | Pending proposals | Owner session |
| `POST` | `/api/bank-sync/changes/[changeId]/decision` | Accept/ignore one version | Owner session |
| `POST` | `/api/bank-connections/[connectionId]/disconnect` | Revoke and clear credential | Strict |
| `DELETE` | `/api/bank-connections/[connectionId]/data` | Delete disconnected provider data | Strict |
| `GET` | `/api/portfolio/backup` | Export trusted backup | Strict |
| `POST` | `/api/portfolio/backup` | Restore trusted backup | Strict |

Database-backed owner/hashed-IP limits protect Link, exchange, sync, matching, decisions, disconnect, and deletion.

## Data model

### Trusted records

- `AppUser`, `Portfolio`.
- `FinancialInstitution`, `CashAccount`, `CreditCard`, and compatibility `CreditAccount`.
- `AutopayRule`, `PromotionalOffer`, `RecurringTransaction`, `ExpectedPayment`.
- `FinancialReview`, `FinancialReviewItem`, `AuditLog`.
- `ActivitySnapshot`, `ActivityEvent`, `ScreenshotImportArtifact`.

### Plaid staging/security records

- `FinancialLinkSession`: owner-bound one-use exchange state.
- `FinancialConnection`: status/freshness plus encrypted token envelope.
- `FinancialAccount`: minimum metadata and optional trusted match.
- `SyncJob`: durable idempotency/status with redacted failure category.
- `StagedChange`: allowlisted field, trusted baseline, proposed value, timestamps, decision/version.
- `WebhookReceipt`: fingerprint and minimal verified processing metadata; never full payload.
- `SecurityEvent`: minimal result metadata with hashed IP/session identifiers.
- `SecurityRateLimit`: durable per-action counters.

Ignored/superseded changes expire after 30 days. Raw Plaid responses are never stored.

## Daily commands

```bash
npm run dev                       # Generate SQLite client and start Next.js
npm test                          # Run Vitest
npx tsc --noEmit                  # Type-check
npm run build                     # Generate PostgreSQL client and build
npm start                         # Start completed build
npm run prisma:generate           # Generate SQLite client
npm run prisma:generate:postgres  # Generate PostgreSQL client
npm run db:migrate                # Apply SQLite migrations
npm run db:push                   # Push SQLite schema; legacy-copy use only
npm run db:push:postgres          # Disposable staging branch only
npm run db:backfill:operations
npm run db:verify:operations
npm run db:backfill:operations:postgres
npm run db:verify:operations:postgres
npm run security:rotate-token-key -- v2
```

## Troubleshooting

### `403 Forbidden`

- Sign into the correct Clerk development application.
- Copy the exact owner `user_...` into `DEBT_CRUSHER_OWNER_CLERK_USER_ID`.
- Restart/redeploy.
- A different user is intentionally denied.

### Clerk UI is blank or CSP-blocked

- Keys must belong to the same development instance.
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` must be the exact HTTPS origin from Clerk API Keys.
- Restart after changing `NEXT_PUBLIC_` values.

### MFA/reverification cannot complete

- Enable a supported first factor.
- Enable TOTP and backup codes.
- Turn on required MFA.
- Reverification supports password/email/phone first factors and phone/TOTP/backup-code second factors; validate passkey-only behavior in staging.
- Revoke the test session and sign in again after policy changes.

### Prisma says `DATABASE_URL` is missing

Create `.env` first with `DATABASE_URL="file:./dev.db"`, then run:

```bash
npm install
npm run prisma:generate
```

### Missing tables/columns

For a new DB, run `npm run db:migrate`. For an existing financial DB, follow backup/rehearsal steps. Never delete `prisma/dev.db` merely to clear the error.

### Build rejects the database URL

`npm run build` generates the PostgreSQL client. Use the Neon staging URL. For local SQLite use `npm run dev`, tests, and TypeScript checking.

### Plaid is not configured

Confirm `PLAID_ENV=sandbox`, client ID, Sandbox secret, valid webhook URL, active key version, matching `FINANCIAL_TOKEN_KEK_<VERSION>`, and `SECURITY_HASH_KEY`. Restart/redeploy.

### Plaid Production is blocked

Intentional. Set `PLAID_ENV=sandbox`. Production cannot be enabled with a variable toggle.

### Link opens but exchange fails

- Use a Sandbox institution/credentials.
- Pair the correct client ID and Sandbox secret.
- Use a syntactically valid public webhook URL.
- One-time Link sessions/public tokens cannot be reused; start again.
- Inspect only redacted runtime errors; never log request bodies or credentials.

### No proposals appear

- Match the account explicitly.
- Ensure provider/target categories agree.
- Run Sync.
- Equal values create no proposal.
- Missing liability fields remain unknown.

### Proposal returns `409`

The trusted baseline, version, status, or ownership check changed. Sync again and review the new proposal.

### Webhook returns `401`

- Hand-written unsigned JSON is expected to fail.
- Preserve raw body and `Plaid-Verification` through proxies.
- Trigger an authentic Sandbox webhook.
- Ensure server time is correct; older than five minutes/future signatures fail.

### Data is stale

Successful data older than 48 hours is labeled stale. Review last attempt, last success, data-as-of, and error state separately, then run manual sync.

## Operational security

Never log or expose:

- Plaid tokens, secrets, Clerk secret/session cookie, or authorization headers.
- Wrapping keys/unwrapped data keys.
- Full webhook payloads.
- Full account/card numbers, routing numbers, CVVs, or holder identity.
- Complete backups or database URLs.

The generic route logger records only an error category, not raw provider messages, bodies, or secrets.

### Backups

- Require strict reverification.
- Store encrypted and outside Git.
- Treat as private even though provider credentials are excluded.
- Document Neon/Vercel backup retention; do not promise immediate physical deletion from immutable backups.

### Account-takeover response

1. Revoke Clerk sessions.
2. Reset credentials/MFA securely.
3. Rotate exposed Clerk secrets.
4. Review security events/deployment logs.
5. Disconnect Plaid Items if compromise could reach them.
6. Rotate database credentials.
7. Rotate HMAC/wrapping keys as appropriate.
8. Reconnect only after containment.

## Known limits and release blockers

- Plaid is Sandbox-only; real credentials are prohibited.
- V1 does not fetch/store transactions.
- Reauthentication/update-mode UI needs additional staging work.
- Liability availability varies by institution.
- Plaid data is not guaranteed real-time.
- The app is single-owner; household/multi-user sharing is unsupported.
- Trusted accounts must exist before matching.
- Accepted history remains after disconnect; unaccepted staging data does not.
- The current production dependency audit is clean; rerun it immediately before release.
- Live Clerk, Plaid, Vercel, Neon, logging, source-map, and backup checks must pass.
- Production requires a future verdict explicitly stating **SAFE FOR PLAID PRODUCTION**.

## Official references

- [Clerk Next.js quickstart](https://clerk.com/docs/getting-started/quickstart)
- [Clerk authentication and MFA options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options)
- [Clerk reverification](https://clerk.com/docs/guides/secure/reverification)
- [Plaid Sandbox](https://plaid.com/docs/sandbox/)
- [Plaid Sandbox credentials](https://plaid.com/docs/sandbox/test-credentials/)
- [Plaid webhooks](https://plaid.com/docs/api/webhooks/)
- [Plaid webhook verification](https://plaid.com/docs/api/webhooks/webhook-verification/)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel environments](https://vercel.com/docs/deployments/environments)
- [Neon branching](https://neon.com/docs/get-started-with-neon/workflow-primer)

## Project documentation

- [Pre-production checklist](./PRE_PRODUCTION_CHECKLIST.md)
- [Security review](./SECURITY_REVIEW.md)
- [Plaid Sandbox runbook](./PLAID_SANDBOX_RUNBOOK.md)
- [Clerk security runbook](./CLERK_SECURITY_RUNBOOK.md)
- [Local Plaid webhook tunnel](./LOCAL_PLAID_WEBHOOK_TUNNEL.md)
- [Secret and key management](./SECRET_KEY_MANAGEMENT.md)
- [Migration guide](./prisma/MIGRATIONS.md)
- [Local database notes](./LOCAL_DB.md)
- [User guide](./USER_GUIDE.md)
- [Status](./STATUS.md)
- [Product plan](./Plan.md)
- [Contributing](./CONTRIBUTING.md)

## Final invariants

1. The browser cannot obtain a Plaid access token.
2. A non-owner cannot access the portfolio or bank connection.
3. Debt Crusher cannot move money.
4. Plaid cannot silently overwrite trusted values.
5. An unverified webhook cannot change financial state.
6. Duplicate/concurrent webhooks cannot duplicate work.
7. Stale data cannot masquerade as current.
8. Disconnect revokes/destroys the stored provider credential.
9. Financial secrets do not belong in Git, logs, client bundles, analytics, or exports.
10. Plaid Production cannot be enabled by an environment-variable toggle.
