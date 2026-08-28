# Plaid Sandbox Staging Runbook

This integration is approved only for fake Plaid Sandbox institutions and a private Vercel Preview/staging deployment. Never enter real bank credentials.

“Read-only” means this code requests balance/liability information and Item status but requests no capability that can move money. It initializes Link with Transactions only because Plaid Balance requires another product, does not call `/transactions/sync`, and does not store transaction rows. It never requests Auth, Transfer, Identity, Payment Initiation, Signal, Income, or Assets and contains no payment API call. Plaid values are untrusted proposals until the owner explicitly accepts each field.

## Provisioning boundary

1. Create a Clerk development instance. Require MFA or a passkey, verified email, secure recovery, and short, revocable sessions.
2. Copy the intended owner's Clerk user ID into `DEBT_CRUSHER_OWNER_CLERK_USER_ID`. Confirm a second authenticated Clerk user receives `403`.
3. Create a Plaid Sandbox application and register one fixed HTTPS staging webhook ending in `/api/plaid/webhook`.
4. Create a dedicated Neon staging branch. Back up the existing SQLite database before any ownership migration.
5. Configure all Clerk, Plaid Sandbox, Neon, HMAC, and encryption values only for the private Vercel Preview/staging scope. Vercel Production must not contain Plaid values.
6. Set `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` to the exact HTTPS origin for the Clerk development instance so CSP remains narrow.

Generate independent secrets. The encryption wrapping key must decode to exactly 32 bytes:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Do not paste generated values into issues, chat, commits, screenshots, logs, or build arguments.

See [SECRET_KEY_MANAGEMENT.md](./SECRET_KEY_MANAGEMENT.md) for generation, validation, storage, rotation, and compromise procedures. See [CLERK_SECURITY_RUNBOOK.md](./CLERK_SECURITY_RUNBOOK.md) for the owner/MFA/session controls.

## Local webhook tunnel

Local browser testing remains at `http://localhost:3000`. Start a development-only HTTPS tunnel for Plaid's webhook:

```bash
cloudflared tunnel --url http://localhost:3000
```

Set the generated hostname plus `/api/plaid/webhook` as `PLAID_WEBHOOK_URL`, restart Next.js, then confirm an unsigned POST returns `401` rather than `200`, a redirect, or a framework error. Quick Tunnel URLs change when restarted and must never carry real financial data.

The complete procedure, expected status codes, authentic Sandbox test, and teardown steps are in [LOCAL_PLAID_WEBHOOK_TUNNEL.md](./LOCAL_PLAID_WEBHOOK_TUNNEL.md).

## Database rollout

1. Make a recoverable backup.
2. Rehearse the SQLite migration against a copy using `prisma/migrations/20260827090000_secure_plaid_sandbox/migration.sql`.
3. Apply the PostgreSQL migration from `prisma/migrations-postgres/20260827090000_secure_plaid_sandbox/migration.sql` to the dedicated Neon branch through the team's controlled migration process.
4. Verify `Portfolio.current.ownerId = owner`, existing snapshots have `portfolioId = current`, and foreign-key checks succeed.
5. Do not use `db push` against the primary database as a substitute for reviewing the additive migration.

## Required staging exercise

- Sign in as the owner with MFA/passkey and verify session revocation.
- Verify unauthenticated, second-user, expired-session, wrong-origin, oversized-body, and modified-ID requests are denied.
- Connect Plaid Sandbox checking, savings, money-market, and credit-card test accounts.
- Confirm the browser never receives an access token, Item ID, provider account ID, encryption field, security event, or raw response.
- Match only to manually created existing accounts.
- Sync balances and liabilities; verify unknown liability fields stay unknown.
- Change a manual trusted value after staging; accepting the old proposal must return `409`.
- Send valid, invalid, expired, malformed, replayed, duplicate, and concurrent Plaid webhook fixtures.
- Verify webhook content alone never changes a trusted value.
- Trigger Item login-required behavior and confirm the UI shows reauthentication required.
- Disconnect and verify Plaid Item removal, cleared token ciphertext, cancelled jobs, and deleted unaccepted proposals.
- Delete disconnected bank data and verify accepted trusted history remains.
- Inspect Vercel logs, error monitoring, analytics, source maps, database exports, and backups for financial secrets.
- Validate CSP, HSTS, frame denial, and `Cache-Control: private, no-store` on financial responses and screenshot artifacts.

## Key rotation

1. Add a new 32-byte base64 wrapping key such as `FINANCIAL_TOKEN_KEK_V2` while retaining the old key.
2. Run against the intended staging database:

   ```bash
   npm run security:rotate-token-key -- v2
   ```

3. Verify a Sandbox sync succeeds for every connection.
4. Set `FINANCIAL_TOKEN_KEY_VERSION=v2` for new tokens.
5. Remove the old key only after every encrypted connection reports `tokenKeyVersion = v2` and rollback retention has expired.

The command rewraps random data keys only; it does not decrypt token ciphertext or print sensitive material.

## Compromise response

- Plaid secret: rotate it in Plaid and Vercel, review Plaid activity/webhooks, and redeploy. Existing Items normally remain connected, subject to Plaid's rotation behavior.
- Token wrapping key: add a new version, run the rewrap command, verify, then retire the compromised version. If token ciphertext may also have been obtained, disconnect/revoke every Item and require reconnection.
- Database credential: rotate Neon credentials, revoke old roles/sessions, inspect exports and access logs, and redeploy.
- Clerk secret or account takeover: rotate Clerk keys as appropriate, revoke all sessions, reset credentials/MFA, inspect security events, disconnect Plaid Items, and reconnect only after containment.
- Security HMAC key: rotate it, understanding that future opaque hashes will no longer correlate with previous hashes.

## Release gate

Record every result in [SECURITY_REVIEW.md](./SECURITY_REVIEW.md). Any failed required invariant blocks the deployment. Real institutions remain forbidden until a separate review explicitly returns `SAFE FOR PLAID PRODUCTION`.

Current hosted caveat as of 2026-08-28: `https://debt-crusher-taupe.vercel.app/api/plaid/webhook` returned `303` to the legacy `/signin` route for an unsigned POST. After deploying the current code, the same unsigned probe must return `401`, followed by a successful signed Plaid Sandbox webhook, before hosted webhook testing is considered passed.
