# Debt Crusher Financial Integration Security Review

## Overall Risk

**MODERATE** for Plaid Sandbox on a private staging deployment. Plaid Production and real institutions remain prohibited.

Review refreshed 2026-08-28. No security review can guarantee that a system is impossible to breach; this verdict describes the verified controls, remaining risks, and restricted Sandbox scope.

## Architecture Assessment

Debt Crusher is a Next.js 15 App Router application with React 19, Clerk v7, Prisma 6, SQLite for local development, and PostgreSQL/Neon for hosted staging. All application pages and API routes are protected by Clerk middleware except the Clerk sign-in page and the Plaid webhook. A configured Clerk user ID is the sole allowed identity.

The server resolves the authenticated owner and fixed `current` portfolio through `requireOwnerContext()`. Existing current-state, review, snapshot, artifact, export, and restore paths are portfolio-scoped. Browser-provided identifiers are useful only after a server-side ownership query.

Plaid Link creates a short-lived, owner-bound server session. The browser receives a Link token and sends the one-time public token back to the server. The access token exists only in server memory and an AES-256-GCM envelope in the database. Sync fetches account metadata, balances, and supported credit-card liabilities, normalizes the minimum fields, and creates field-level proposals. Existing trusted records change only after explicit acceptance and a baseline conflict check.

Trust boundaries:

1. Browser → Clerk-protected Next.js routes: authenticated but untrusted input; same-origin, body-size, schema, owner, and rate-limit checks apply.
2. Next.js → Clerk: identity, MFA/passkey policy, session lifecycle, and strict reverification.
3. Next.js → Plaid Sandbox: server-only credentials, fixed product allowlist, and no money-movement methods.
4. Plaid webhook → public route: untrusted raw bytes until ES256 JWT, timestamp, JWK, and body-hash verification succeed.
5. Next.js → Neon/SQLite: owner-scoped normalized data; provider credentials use application-level envelope encryption.
6. Vercel secrets → server runtime: Clerk, Plaid Sandbox, database, HMAC, and encryption keys; none are public DTO fields.

## Critical Findings

No unresolved critical code finding was identified. No Plaid Auth, Transfer, payment, routing/account-number, or other money-movement capability is present.

## High-Risk Findings

These were the pre-implementation findings that blocked bank connectivity. Each is now remediated in code.

### Weak, non-revocable shared authentication

Severity: HIGH
File: deleted `lib/auth.ts`, `app/api/auth/signin/route.ts`, and `app/signout/route.ts`; replacement in `middleware.ts` and `lib/security.ts`
Lines: current middleware and owner-context implementation
Finding: A shared credential produced a custom 14-day cookie without provider-managed MFA, device/session management, or remote revocation.
Attack scenario: Theft or sharing of the credential/cookie would expose every financial record and future bank connection.
Financial/privacy impact: Complete compromise of the private portfolio and aggregated balances.
Required fix: Implemented Clerk v7 identity, owner allowlisting, protected middleware, managed sessions, and strict reverification. Clerk development must be configured to require MFA/passkeys before staging sign-off.

### No resource-owner identity

Severity: HIGH
File: `prisma/schema.prisma`, `prisma/schema.postgres.prisma`, and secure Plaid migrations
Lines: `AppUser`, `Portfolio.ownerId`, and financial relations
Finding: The database previously had a global portfolio but no identity to which financial resources belonged.
Attack scenario: Future multi-session or guessed-ID access could not be evaluated against an owner.
Financial/privacy impact: IDOR/BOLA and cross-portfolio disclosure or mutation.
Required fix: Implemented additive owner records, portfolio ownership, owner-scoped financial connections, and indirect ownership for accounts, jobs, changes, receipts, and events.

### Globally scoped portfolio and history access

Severity: HIGH
File: `lib/portfolio-store.ts`, `lib/review-store.ts`, existing API routes
Lines: current portfolio, snapshot, review, event, artifact, backup, and restore queries
Finding: Several reads and writes assumed a single global portfolio and history namespace.
Attack scenario: A modified snapshot, review, or artifact ID could return or mutate a record outside the intended portfolio.
Financial/privacy impact: Disclosure or corruption of financial history and screenshot artifacts.
Required fix: Implemented explicit portfolio predicates and snapshot ownership backfill.

### Raw-ID update paths

Severity: HIGH
File: manual-entry, operations, review, artifact, and bank API routes
Lines: all resource mutation handlers
Finding: IDs from the browser were previously sufficient in some update paths.
Attack scenario: An attacker substitutes an account, card, review, artifact, connection, bank account, or staged-change ID.
Financial/privacy impact: Unauthorized disclosure, matching, overwrite, acceptance, disconnect, or deletion.
Required fix: Implemented owner/portfolio predicates before every resource operation; IDs alone never authorize access.

### Missing CSRF/origin enforcement

Severity: HIGH
File: `lib/security.ts` and authenticated mutation route handlers
Lines: `assertSameOrigin()` and each mutation entry point
Finding: Cookie-authenticated mutations lacked a uniform origin check.
Attack scenario: A malicious site causes the signed-in browser to submit a state-changing request.
Financial/privacy impact: Unwanted edits, imports, matches, acceptances, disconnects, or deletion.
Required fix: Implemented strict same-origin checks, JSON content-type enforcement, bounded bodies, and Zod validation.

### Backup operations without reverification

Severity: HIGH
File: `app/api/portfolio/backup/route.ts`
Lines: export and restore handlers
Finding: A stolen active session could export or replace the complete portfolio without a fresh identity check.
Attack scenario: Session theft is used to exfiltrate a backup or destroy current data through restore.
Financial/privacy impact: Full financial disclosure or integrity loss.
Required fix: Implemented strict Clerk reverification, owner scoping, same-origin restore, body limits, and no-store responses.

### Long-lived artifact caching and missing security headers

Severity: HIGH
File: `next.config.ts`, `lib/security.ts`, screenshot artifact route
Lines: global headers and financial response helpers
Finding: Sensitive artifacts could be cached too long and the app lacked a complete browser security-header baseline.
Attack scenario: Financial responses persist in browser/intermediary caches or are framed and abused.
Financial/privacy impact: Screenshot or financial-data disclosure and UI redress risk.
Required fix: Implemented private no-store API/artifact responses, CSP, production HSTS, nosniff, no-referrer, restrictive permissions, and frame denial.

### Missing endpoint abuse limits

Severity: HIGH
File: `lib/security.ts` and bank integration routes
Lines: `enforceRateLimit()` calls
Finding: Link, exchange, sync, matching, decisions, disconnect, and deletion had no durable owner/IP limits.
Attack scenario: Automated requests amplify Plaid calls, brute-force resource IDs, or create denial-of-service load.
Financial/privacy impact: Availability loss, provider cost, and enumeration attempts.
Required fix: Implemented database-backed, action-specific limits keyed by owner and hashed IP.

## Medium / Low Findings

### Dependency advisories

Severity: MEDIUM for the current private Sandbox threat model; HIGH advisory labels upstream
File: `package-lock.json`
Lines: dependency graph
Finding: `npm audit --omit=dev` reports seven high-severity advisories through Prisma/deepmerge-ts, Next/PostCSS/sharp, and direct `xlsx`. The suggested Next/Prisma remedies are breaking changes, and `xlsx` has no registry fix.
Attack scenario: Specially crafted CSS/source-map/image/workbook input reaches a vulnerable dependency path.
Financial/privacy impact: Potential denial of service, file disclosure, XSS, or unsafe workbook processing depending on reachability.
Required fix: Do not apply forced breaking upgrades automatically. Track a tested Next 16/Prisma remediation and replace or isolate `xlsx`; keep untrusted workbook and image inputs size-limited. This blocks Plaid Production approval.

### CSP still requires inline script/style compatibility

Severity: MEDIUM
File: `next.config.ts`
Lines: CSP construction
Finding: Next.js/Clerk compatibility currently requires `'unsafe-inline'` for script/style execution, although external Clerk and Plaid origins are exact and framing remains denied.
Attack scenario: A separate HTML/script injection bug has a less restrictive CSP backstop.
Financial/privacy impact: Increased impact of a future injection vulnerability.
Required fix: Move to nonce-based CSP after Clerk/Next staging validation. This does not authorize Plaid Production.

### Provider timestamps are not supplied for every field

Severity: LOW
File: `lib/bank-sync.ts`
Lines: normalization and staged-change creation
Finding: Plaid Balance does not provide a source update timestamp for every returned balance.
Attack scenario: A user mistakes retrieval time for institution update time.
Financial/privacy impact: Decision based on older-than-expected data.
Required fix: Preserve provider timestamps when available, always show `dataAsOf`, `lastAttemptedSync`, `lastSuccessfulSync`, and stale/error state, and never label the data real-time.

## Proposed Secure Plaid Architecture

```text
Clerk owner + strict reverification
                ↓
Server-created, owner-bound Plaid Link session
                ↓
Plaid Sandbox Link (one-time public token)
                ↓
Server exchange → AES-256-GCM token envelope
                ↓
Balance / Item / Liabilities fetch only
                ↓
Minimum normalized FinancialAccount data
                ↓
Owner-scoped account matching
                ↓
Field-level StagedChange with trusted baseline
                ↓
Explicit Accept or Ignore
                ↓
Atomic trusted update + compatibility row + audit event
```

Verified webhooks create only an idempotent receipt and durable sync job. They never write trusted values. The job re-fetches current data from Plaid and stages proposals.

## Requested Plaid Permissions

ALLOWED:

- Transactions as the Link initialization product required to use Balance
- Liabilities through `required_if_supported_products`
- `/accounts/balance/get`
- `/item/get`
- `/liabilities/get`
- US checking, savings, money-market, and credit-card accounts

NOT ALLOWED:

- Transaction retrieval or storage in V1, including `/transactions/sync`
- Auth, account/routing numbers, Transfer, Identity, Payment Initiation, Signal, Income, Assets
- Stripe ACH, PaymentMethod creation, card/bank payments, or any money movement
- Ownership, holder, address, or raw provider payload storage

## Authentication Assessment

Clerk v7 replaces the shared password and cookie. Middleware protects the app, allows only `DEBT_CRUSHER_OWNER_CLERK_USER_ID`, and delegates session expiry/revocation to Clerk. Connect, exchange, disconnect, deletion, export, and restore require strict Clerk reverification. Staging approval still requires an active owner session and an optimistic trusted-value check.

The live Clerk development configuration was verified on 2026-08-28 with Clerk CLI 3.2.0: restricted sign-up; verified email; required MFA at sign-up and sign-in; authenticator app and backup codes; passkeys; device trust; compromised-password checks; CAPTCHA, PII, enumeration, and lockout protections; single-session mode; 30-minute inactivity timeout; and seven-day maximum lifetime. These are provider settings and must be rechecked because they can drift independently of source code. Recovery and real session-revocation exercises still require hosted testing.

## Authorization Assessment

Every bank route derives `{ ownerId, portfolioId }` from the Clerk session. Connections are queried by both application ID and portfolio. Financial accounts inherit ownership through their connection. Staged changes inherit ownership through account → connection. Matching targets are independently queried within the same portfolio. Existing review, snapshot, event, screenshot artifact, backup, account, card, and promotion paths also include the portfolio boundary.

The application is intentionally single-owner. This does not weaken the query boundary: an unexpected authenticated Clerk identity is rejected before data access.

## Token Security Assessment

The public token is accepted only by a bounded server endpoint and a single-use owner-bound Link session. The Plaid access token never appears in a DTO, URL, cookie, browser store, backup, audit event, or log.

Each access token is encrypted with a random 256-bit data key using AES-256-GCM and authenticated associated data. The data key is independently wrapped with a versioned 256-bit key supplied only through Vercel secrets. Ciphertext, IVs, tags, wrapped key, and version are stored in the database. The rotation command rewraps data keys without decrypting token ciphertext or printing sensitive values.

Disconnect calls Plaid Item removal before clearing every token-envelope field. If revocation fails, the credential is retained for a safe retry rather than falsely reporting a successful disconnect.

## Webhook Security Assessment

- Verification: untouched raw body; Plaid verification JWT required; protected header must be ES256 with a key ID; JWK fetched from Plaid and cached for one hour; signature and claims verified with JOSE.
- Replay protection: `iat` must be present, no more than five minutes old, and not materially in the future; the body SHA-256 claim is compared in constant time.
- Idempotency: a unique hash of the raw body creates one receipt; duplicates return success without creating another job. Job claiming and connection sync claiming are conditional database writes, preventing concurrent processing.
- Event processing: payload metadata identifies the Item only. A verified event creates a durable job, and `after()` invokes a fresh Plaid fetch. Webhook content cannot update balances or liabilities directly.

## Data Storage Assessment

Stored while connected: institution display metadata, opaque provider Item/account identifiers, account name/type/subtype/last four, encrypted token envelope, consented product names, sync freshness/state, minimal job state, and pending normalized field proposals.

Never stored: raw Plaid responses, transaction rows, routing/account numbers, account holders, addresses, ownership/identity, payment instruments, or money-movement data.

Accepted values enter existing trusted account/card records and minimal audit history. Ignored/superseded proposals expire after 30 days. Disconnect revokes the Item, clears ciphertext, cancels pending jobs, and deletes unaccepted staging changes. Delete Bank Data removes the disconnected connection and its remaining normalized account/job data. Previously accepted trusted values/history remain by design. Immutable provider backups may retain encrypted historical blocks until the provider's documented retention window expires; the UI and operations team must not claim immediate physical erasure from such backups.

## Import / Review Architecture

Account discovery never creates a trusted Debt Crusher account. The owner explicitly matches each Plaid account to an existing cash account or card. A sync compares each allowlisted field with the captured trusted value. Accept rechecks ownership, proposal version, status, and trusted baseline. A changed baseline returns `409`; the owner must sync and review a regenerated proposal. Ignore never updates trusted data.

## Vercel / Infrastructure Assessment

The application refuses `PLAID_ENV=production` both at startup and when constructing a client. The client always uses `PlaidEnvironments.sandbox`; a production environment variable cannot switch the base URL. Preview/staging must use a dedicated Clerk development instance, Plaid Sandbox application, fixed HTTPS webhook URL, and dedicated Neon branch. Vercel Production must contain no Plaid credentials.

External configuration remains to be verified in the actual Vercel, Neon, Clerk, Plaid, and GitHub accounts. Preview access controls, log drains, source-map publication, deployment visibility, branch protection, and secret scopes cannot be proven from repository code alone.

## Security Test Results

- PASS — TypeScript check and optimized production build.
- PASS — 50 unit tests, including owner denial, valid/invalid/expired/future webhook signatures, token encryption/decryption, tamper rejection, key rewrap, product allowlist, production refusal, opaque client ID, origin rejection, and body-size/content-type rejection.
- PASS — SQLite migration applied to a disposable copy; foreign-key verification returned no errors and existing `current` portfolio ownership was backfilled.
- PASS — Static search found no forbidden Plaid API call and no server financial secret identifier in generated browser bundles.
- PASS — Git history search found no committed Plaid secret/access-token marker.
- PASS — Webhook code enforces ES256, Plaid JWK, five-minute age, future-time rejection, body hash, unique receipt, durable job, and conditional concurrency claims.
- PASS — Sync content alone stages changes and cannot update trusted balances.
- NEEDS INVESTIGATION — Valid and invalid webhook fixtures must be exercised against Plaid Sandbox's live JWK endpoint.
- PASS — Live Clerk development configuration has restricted sign-up, required MFA, verified email, passkeys, attack protections, single-session mode, 30-minute inactivity timeout, and seven-day maximum lifetime.
- NEEDS INVESTIGATION — Owner/non-owner, strict reverification, session revocation, and recovery must still be exercised end-to-end on the new hosted deployment.
- NEEDS INVESTIGATION — End-to-end Plaid Sandbox Link, liabilities, Item error/reauthentication, webhook delivery, disconnect, and delete flows require provisioned credentials.
- FAIL on current deployment — an unsigned `POST https://debt-crusher-taupe.vercel.app/api/plaid/webhook` returned `303` to the legacy `/signin` route on 2026-08-28. Redeploy current middleware, require an unsigned `401`, then require a signed Sandbox webhook `200`.
- NEEDS INVESTIGATION — Vercel Preview/Neon branch isolation, external logs, deployment visibility, and GitHub protections require account-level inspection.
- FAIL — Dependency release gate: seven upstream high-severity advisories remain; no forced breaking upgrade was applied.

### Red-team matrix

| Attack | Result | Reason |
|---|---|---|
| Steal a Plaid token from browser/API/export | PASS | Explicit DTOs and backups omit tokens; generated browser bundles contain no token/secret identifier. |
| Access another user's transactions | PASS | V1 neither fetches nor stores transactions; non-owner Clerk identities are rejected. |
| Access another user's balances | PASS | Owner allowlist plus portfolio predicates on every bank resource. |
| Disconnect another user's bank | PASS | Strict reverification and connection + portfolio lookup. |
| Forge a webhook | PASS | ES256/JWK/timestamp/body-hash verification occurs before persistence. |
| Replay a webhook | PASS | Unique raw-body fingerprint and unique job idempotency key. |
| Abuse sync endpoints | PASS | Database owner/hashed-IP rate limits and conditional sync claims. |
| Manipulate imported values | PASS | Webhook/browser values cannot directly write trusted fields; allowlisted normalization only. |
| Accept another portfolio's staged change | PASS | Change → account → connection → portfolio ownership predicate. |
| Exploit stale data | PASS | stale/error/reauth/sync states and timestamps are explicit in the UI. |
| Trigger concurrent Plaid requests | PASS | conditional job and connection claims prevent overlapping connection syncs. |
| Extract secrets from client bundles | PASS | server-only modules and bundle scan. |
| Extract secrets from external logs | NEEDS INVESTIGATION | Code logs only rotation counts, but deployed log drains require inspection. |
| Use a production credential in Preview | PASS in code / NEEDS INVESTIGATION operationally | Production environment is hard-refused; Vercel scopes still require confirmation. |
| Escalate toward money movement | PASS | forbidden-product allowlist and no relevant SDK method calls. |

## Production Readiness Checklist

- [x] Read-only Plaid permissions
- [x] No Auth product
- [x] No Transfer product
- [x] No money-movement capability
- [x] Plaid secret server-only
- [x] Plaid access tokens encrypted
- [x] Tokens never exposed to browser
- [x] Tokens excluded from application logs
- [x] Clerk authentication integrated
- [x] MFA/passkey requirement verified in live Clerk development configuration
- [x] Financial-resource authorization
- [x] Static IDOR/BOLA controls reviewed
- [ ] Live authorization/expired-session test matrix passed on staging
- [x] Webhook verification implemented
- [x] Webhook replay protection implemented
- [x] Idempotent processing
- [x] Import staging implemented
- [x] Review-before-accept implemented
- [x] No silent financial overwrites
- [x] Sync freshness displayed
- [x] Disconnect functionality implemented
- [x] Token revocation/removal implemented
- [x] Data deletion policy implemented
- [x] Sensitive responses not cached
- [x] Production environment hard-refused
- [ ] Vercel Preview/Production secret separation verified
- [x] Financial API rate limiting implemented
- [x] Security-event audit logging implemented
- [x] Repository/history/browser-bundle secret scan passed
- [ ] External logs, backups, source maps, and deployment visibility inspected
- [x] Dependencies reviewed
- [ ] High-severity dependency advisories remediated or formally risk-accepted
- [x] Code-level red-team matrix completed
- [ ] Live Plaid Sandbox and Clerk staging tests passed after the new deployment

## Final Verdict

**IMPLEMENTATION COMPLETE — SAFE FOR SANDBOX ONLY**

The repository implementation enforces the intended read-only, single-owner, staged-approval architecture. Do not configure Plaid Production or connect real institutions. Production remains blocked by live Clerk/Plaid/Vercel/Neon validation, account-level infrastructure review, the unresolved dependency advisories, nonce-based CSP follow-up, and a later review that explicitly returns `SAFE FOR PLAID PRODUCTION`.
