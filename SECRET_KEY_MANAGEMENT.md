# Secret and Key Management

Debt Crusher uses independent secrets for independent security purposes. Never reuse a Clerk key, Plaid secret, database password, token-wrapping key, or HMAC key as another value.

## Secret inventory

| Secret | Purpose | Storage |
|---|---|---|
| `CLERK_SECRET_KEY` | Server-to-Clerk authentication | Local `.env`; branch-scoped Vercel secret |
| `PLAID_SECRET` | Server-to-Plaid Sandbox authentication | Local `.env`; branch-scoped Vercel secret |
| `DATABASE_URL` | Database authentication and location | Local `.env`; branch-scoped Vercel secret |
| `FINANCIAL_TOKEN_KEK_V1` | Wraps random per-token data-encryption keys | Local `.env`; branch-scoped Vercel secret |
| `SECURITY_HASH_KEY` | HMACs owner/IP/session/provider identifiers before persistence | Local `.env`; branch-scoped Vercel secret |

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is intentionally public and is not a secret. The `NEXT_PUBLIC_` prefix must never be used for any value in the table above.

## Generate the initial keys

Use a cryptographically secure operating-system random source through OpenSSL. Generate the values separately:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

- The first command generates 32 random bytes (256 bits) and base64-encodes them. Store its one-line output as `FINANCIAL_TOKEN_KEK_V1`. Base64 output is commonly 44 characters including padding, but decoded length—not text length—is the requirement.
- The second command generates a different 32 random bytes and hex-encodes them as 64 characters. Store it as `SECURITY_HASH_KEY`.

Why two keys: compromising or rotating one purpose must not automatically compromise or invalidate the other. Never copy one command's output into both variables.

Enter generated values directly into a local secret file or password manager. Avoid commands that put the result in shell history, process arguments, screenshots, clipboard history, CI output, or chat.

Example placeholders only:

```env
FINANCIAL_TOKEN_KEY_VERSION="v1"
FINANCIAL_TOKEN_KEK_V1="replace-with-base64-output"
SECURITY_HASH_KEY="replace-with-independent-hex-output"
```

## Validate without printing values

```bash
node --env-file=.env - <<'NODE'
const checks = [
  [
    "FINANCIAL_TOKEN_KEK_V1 decoded length",
    Buffer.from(process.env.FINANCIAL_TOKEN_KEK_V1 || "", "base64").length === 32,
  ],
  [
    "SECURITY_HASH_KEY minimum entropy-sized representation",
    (process.env.SECURITY_HASH_KEY || "").length >= 43,
  ],
];
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
NODE
```

This intentionally reports only status and length requirements. Never use `env`, `printenv`, `set`, `cat .env`, or debug logging in shared output.

## Storage and deployment rules

- `.env` is ignored by Git and is local plaintext; restrict workstation access and disk backups accordingly.
- Use Vercel environment variables for hosted staging and scope them to the exact Preview branch where possible.
- Do not scope Plaid values to Vercel Production.
- Environment changes affect only new deployments; redeploy after rotating a value.
- Treat anyone with Vercel project-secret access as capable of accessing the connected staging data.
- Never put secrets in `vercel.json`, source code, Docker build arguments, generated static files, browser storage, analytics, source maps, or documentation.
- Never store the Plaid access token unencrypted. The application stores only an AES-256-GCM token envelope and keeps the wrapping key outside the database.

## Token-wrapping key rotation

To rotate from `v1` to `v2`:

1. Back up the intended staging database and verify the target environment.
2. Generate a fresh key with `openssl rand -base64 32`.
3. Add it as `FINANCIAL_TOKEN_KEK_V2`; keep V1 present.
4. Run:

   ```bash
   npm run security:rotate-token-key -- v2
   ```

5. Confirm the command reports the expected number of rewrapped data keys.
6. Set `FINANCIAL_TOKEN_KEY_VERSION=v2` for new connections and redeploy.
7. Sync each fake Sandbox connection.
8. Verify every stored connection uses `tokenKeyVersion = v2`.
9. Keep V1 through the defined rollback/backup-retention window; only then remove it.

The rotation command decrypts and re-encrypts only the random data key used by each token envelope. It does not re-encrypt the access-token ciphertext and must never print plaintext tokens.

If an attacker may possess both database ciphertext and the wrapping key, rotation alone is insufficient: disconnect/revoke every affected Plaid Item and reconnect after containment.

## HMAC-key rotation

`SECURITY_HASH_KEY` protects opaque identifiers used in provider client IDs, rate-limit subjects, IP hashes, session hashes, and provider hashes. Generate a new independent value with `openssl rand -hex 32`, update the environment, and redeploy.

Rotation breaks correlation between new and old hashes. Existing stored opaque hashes and some idempotency/rate-limit relationships may no longer match new values, so schedule the rotation, preserve audit context, and test the Sandbox flow afterward.

## Provider-secret rotation

- Clerk: rotate/reissue the secret in Clerk, update local/Vercel values, revoke affected sessions where appropriate, redeploy, and test owner/non-owner access.
- Plaid Sandbox: rotate the Sandbox secret, update local/Vercel values, redeploy, and test Link, sync, webhook verification-key retrieval, and disconnect.
- Neon: rotate credentials, revoke old database roles/sessions, update Vercel, redeploy, and inspect access logs/backups.

Do not rotate by adding both old and new secrets to source code. Provider overlap, if supported, belongs in the provider's secret-management workflow.

## Secret exposure check

Before every push:

```bash
git check-ignore -v .env prisma/dev.db
git ls-files .env '*.db'
git diff --check
```

The first command should show ignore rules. The second should print nothing. Review staged changes with `git diff --cached` before commit, but do not paste the diff into a public system if it contains sensitive financial data.

If a secret was committed, deleting the working-tree line is not enough. Revoke/rotate the secret first, then remove it from reachable Git history using a reviewed history-rewrite process and notify anyone who cloned the affected history.
