# Debt Crusher Mobile App Plan

Last reviewed: 2026-08-11

Portfolio phase: Planned pilot

## Objective

Build the first Expo React Native app in the mobile portfolio. Deliver the daily dashboard, account management, history, and review-before-save screenshot intake as native iOS and Android workflows, including platform share targets.

## Current State and Baseline

- Next.js 15, React 19, TypeScript, Prisma, SQLite for local development, and a Postgres schema for hosted deployment.
- Working dashboard, credit-card and cash-account CRUD, payoff strategies, explainable ranking, snapshots, charts, workbook/JSON backup, and screenshot OCR review.
- Existing JSON routes cover portfolio reads/writes and screenshot analysis, save, and artifacts.
- Site-wide private credential sign-in currently uses a browser cookie.
- `PROJECT_STATUS.md` reports 97% completion; production Neon/Vercel validation remains pending.
- Automated tests cover workbook and screenshot import, but UI save/delete, backup restore, and workbook round-trip coverage remain pending.
- The Graphify map exists but predates the current commit. Refresh it before implementation.

## Native Product Scope

### Screens

- Sign in and device-session recovery
- Dashboard summary, recommendation reasons, payoff strategy, warnings, and recent deltas
- Credit-card list, detail, add, edit, and remove
- Cash-account list, detail, add, edit, and remove
- Activity history, snapshot comparison, and screenshot artifact detail
- Screenshot review with extracted fields, confidence warnings, merge/replace choice, and save confirmation
- Settings for extra-payment budget, promo window, cash buffer, strategy, and sign out

### Platform integrations

- Add an iOS Share Extension accepting images from Photos, Files, and screenshots.
- Add an Android image share target using the system share sheet.
- Hand shared images to the screenshot-review flow, retain visible pending/failed upload state, and use an idempotency key when retrying.
- Keep workbook import/export and full JSON restore on the web for v1 unless beta feedback establishes a daily mobile need.

## Mobile API Contracts

Expose versioned adapters under `/api/mobile/v1` and reuse existing validation, persistence, ranking, import, and snapshot services.

- `POST /session`, `POST /session/refresh`, `DELETE /session`
- `GET /devices`, `DELETE /devices/:id`
- `GET /portfolio`, `PUT /portfolio`
- `GET /activity`, `GET /activity/:id`
- `POST /screenshot-import/analyze`
- `POST /screenshot-import/save`
- `GET /screenshot-import/artifacts/:id`

Return stable camelCase DTOs and structured field errors. Require an idempotency key for screenshot save and portfolio mutations that may be retried. Preserve all existing browser routes and cookie behavior.

Add a persisted mobile-device session model containing a device identifier, label, hashed refresh credential, creation time, last-used time, expiry, and revocation time. Access tokens are short-lived; refresh credentials rotate and are stored only in Expo SecureStore on the device.

## Data, Connectivity, and Security

- Deploy the hosted backend with Neon/Postgres before beta and verify schema parity with local SQLite.
- Use HTTPS for all non-development traffic. Do not embed database credentials, private-access credentials, or session secrets in the app.
- Cache the latest portfolio, derived dashboard, and recent activity for read-only offline viewing.
- Queue only screenshot submissions. Require connectivity for portfolio saves, destructive actions, and merge/replace confirmation.
- Redact sensitive financial payloads and credentials from logs, crash reports, and analytics.

## Milestones

1. **Baseline:** install dependencies; run tests/build; refresh Graphify; verify local SQLite and hosted Postgres behavior.
2. **Backend ready:** deploy Neon/Vercel, add device sessions and versioned mobile APIs, and complete contract/security tests.
3. **Mobile alpha:** create `mobile/`, build native account/dashboard/history screens, caching, and secure session storage.
4. **Share intake:** add iOS and Android share integrations, retry/idempotency behavior, and review-before-save parity.
5. **Private beta:** distribute through TestFlight and Android internal testing, resolve beta defects, and update portfolio status.

## Tests and Acceptance Criteria

- Existing web tests and production build pass before and after API changes.
- Mobile auth supports login, restart restoration, refresh rotation, logout, expiry, and remote device revocation.
- Dashboard totals and recommendations match the web app for the same portfolio fixture.
- Account create/edit/delete and settings saves persist correctly against Postgres without duplicating mutations after retries.
- Shared screenshots from supported iOS and Android sources reach editable review before any data is saved.
- Offline screenshots remain visibly queued and submit once; malformed or duplicate images fail safely.
- Cached financial data is clearly marked stale when the backend is unreachable.
- Existing web sign-in, portfolio, import/export, and screenshot workflows remain compatible.

## Risks

- Screenshot extensions require Expo development builds and native-project configuration, not Expo Go alone.
- SQLite/Postgres schema drift could produce different beta behavior unless both paths share contract fixtures.
- Financial data in device caches requires secure storage choices, log redaction, and explicit sign-out cleanup.
- OCR quality varies by institution, so mobile must preserve the current review gate rather than auto-save.

## Private-Beta Checklist

- [ ] Web test/build baseline recorded
- [ ] Neon database and Vercel environment configured
- [ ] Mobile session migration deployed and revocation verified
- [ ] iOS and Android privacy/permission copy reviewed
- [ ] Share intake tested on physical iOS and Android devices
- [ ] Production logs checked for sensitive payloads
- [ ] TestFlight build distributed
- [ ] Android internal-testing build distributed
- [ ] Beta feedback triaged and portfolio phase updated
