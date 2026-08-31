# Clerk Security Runbook

This application uses Clerk for authentication and session management, then applies its own server-side single-owner authorization boundary. Clerk proves who signed in; Debt Crusher still decides whether that authenticated identity is allowed to access the portfolio.

This document covers the private development/Sandbox deployment. It does not approve a Clerk production instance or real-bank use.

## Security model

There are two independent gates:

1. Clerk validates the sign-in, MFA, session, revocation, and reverification state.
2. Debt Crusher compares Clerk's authenticated `userId` with `DEBT_CRUSHER_OWNER_CLERK_USER_ID` at each protected page and API resource, then resolves an owner-scoped portfolio on the server.

Creating another Clerk user does not grant that user application access. A non-owner may be able to authenticate with Clerk if the instance configuration permits it, but Debt Crusher returns a `404` for the dashboard and `403 Forbidden` from protected APIs before portfolio access. The development instance uses restricted sign-up, and the application redirects `/sign-up` to `/sign-in` without rendering a self-service registration form.

Do not treat a browser-hidden button as authorization. Every protected API route derives identity from the verified Clerk session; browser-provided user or portfolio identifiers do not grant access.

## Verified development-instance baseline

The following settings were read from the live Clerk development instance with Clerk CLI 3.2.0 on 2026-08-28:

| Control | Verified value |
|---|---|
| Sign-up mode | Restricted |
| Email | Required, verified at sign-up, email-code sign-in enabled |
| MFA | Required for sign-up and sign-in |
| MFA factors | Authenticator app and backup codes enabled |
| Passkeys | Enabled; may satisfy second factor |
| Password | Required, minimum 15 characters |
| Compromised-password protection | Enabled at sign-in |
| Device trust | Enabled |
| CAPTCHA/bot protection | Enabled, smart widget |
| Enumeration protection | Enabled |
| PII protection | Enabled |
| User lockout | Enabled; 10 attempts, 60 minutes |
| Email links | Same-client requirement enabled |
| Multiple simultaneous sessions | Disabled |
| Inactivity timeout | 30 minutes |
| Maximum session lifetime | 7 days |

These values are external configuration and can drift. Re-run the verification before every hosted staging sign-off.

## Safe CLI verification

Run Clerk CLI commands on the host because they need the OS credential store, local Clerk configuration, and Clerk network APIs.

```bash
clerk --version
clerk doctor --json
```

Expected security-relevant results:

- host execution passes;
- authentication is valid;
- the repository is linked to the intended Debt Crusher application;
- the development instance is reachable;
- `.env` contains development, not production, keys.

Pull configuration into a temporary file instead of printing a large configuration or secrets into logs:

```bash
clerk config pull \
  --instance dev \
  --output /tmp/debt-crusher-clerk-config.json
```

Inspect only the relevant sections:

```bash
jq '{
  auth_access_control,
  auth_attack_protection,
  auth_email,
  auth_multi_factor,
  auth_passkey,
  auth_password,
  session_settings
}' /tmp/debt-crusher-clerk-config.json
```

Delete the temporary configuration after review. It is configuration data, not source documentation.

## Application environment variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_replace-me"
CLERK_SECRET_KEY="sk_test_replace-me"
NEXT_PUBLIC_CLERK_FRONTEND_API_URL="https://your-instance.clerk.accounts.dev"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
DEBT_CRUSHER_OWNER_CLERK_USER_ID="user_replace-me"
```

Only the publishable key, Frontend API origin, and sign-in path are intentionally browser-visible. The Clerk secret key and owner user ID are server-only.

Rules:

- use development keys for local and private Sandbox staging;
- never put `CLERK_SECRET_KEY` in a `NEXT_PUBLIC_` variable;
- never commit `.env` or copy a session cookie/JWT into an issue, chat, screenshot, or shell history;
- keep `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` exact so the Content Security Policy does not need a wildcard;
- scope Vercel values to the intended Preview branch;
- use a separately reviewed Clerk instance before any future production approval.

## Sensitive-action reverification

The server requires Clerk `strict` reverification for:

- creating a Plaid Link token;
- exchanging a Plaid public token;
- disconnecting a bank connection;
- deleting normalized provider data;
- backup export and restore.

The client uses Clerk's reverification wrapper so a `403` reverification response opens the verification prompt and retries the original request after success. Never weaken this to a client-only prompt: the server-side `auth.has({ reverification: "strict" })` check is the security boundary.

## Required access tests

Perform these in the deployed private Preview:

1. Signed out: protected pages and APIs redirect to Clerk or return an authentication error.
2. Owner without recent verification: sensitive bank action returns Clerk's strict reverification response.
3. Owner after successful reverification: the same request is retried and succeeds.
4. Different valid Clerk user: dashboard returns `404`; protected APIs return `403 Forbidden` and no financial DTO.
5. Revoked owner session: the next protected request fails.
6. Session idle longer than 30 minutes: access requires sign-in again.
7. Recovery: verify that backup codes are stored safely and that account recovery cannot silently bypass the intended MFA policy.

Do not use impersonation to test MFA. Clerk impersonation can bypass a user's MFA and is inappropriate as proof of the real owner flow.

## Session or credential exposure response

If a Clerk cookie, session JWT, secret key, password, passkey-capable device, or backup code may be exposed:

1. Revoke affected sessions immediately in Clerk.
2. Reset the affected password and MFA/recovery factors.
3. Rotate the Clerk secret key if server credentials were exposed.
4. Replace the Vercel/local value and redeploy; old deployments do not receive new environment values automatically.
5. Review Clerk activity, Debt Crusher security events, Vercel logs, and source-control history.
6. If the attacker may have reached bank connections, disconnect every affected Plaid Item and reconnect only after containment.

Do not paste a session into `curl`. Use the browser or a purpose-built test session, then revoke it after testing.

## Change control

Any change to sign-up mode, MFA, allowed factors, password policy, session lifetime, owner ID, or Clerk instance requires:

1. a live configuration re-check;
2. owner and non-owner access tests;
3. strict reverification testing;
4. an update to [SECURITY_REVIEW.md](./SECURITY_REVIEW.md).

Official references:

- [Clerk security overview](https://clerk.com/docs/guides/secure/overview)
- [Clerk reverification](https://clerk.com/docs/guides/secure/reverification)
- [Clerk user-enumeration protection](https://clerk.com/docs/guides/secure/user-enumeration-protection)
- [Clerk password protection](https://clerk.com/docs/guides/secure/password-protection-and-rules)
