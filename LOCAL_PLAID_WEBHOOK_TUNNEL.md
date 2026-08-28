# Local Plaid Webhook Tunnel

The browser application can continue to run at `http://localhost:3000`. Only Plaid's server-to-server webhook callback needs a publicly reachable HTTPS URL. A Cloudflare Quick Tunnel can expose the local webhook route during Sandbox testing.

Quick Tunnels are development-only, use a randomly generated hostname, have no uptime guarantee, and must never be used for real-bank or production traffic.

## What the tunnel exposes

The tunnel forwards requests from a public `https://...trycloudflare.com` hostname to the local Next.js server. The entire local server is reachable through that hostname while the tunnel runs, even though only the webhook URL is given to Plaid.

Application routes remain protected by Clerk. `/api/plaid/webhook` is intentionally exempt from Clerk because Plaid cannot possess a Clerk session; it instead requires Plaid's signed `Plaid-Verification` JWT and rejects unsigned, expired, modified, or replayed messages.

Do not share the tunnel hostname. Stop the tunnel when the test is complete.

## Start local services

Terminal 1:

```bash
npm run dev
```

Confirm the app responds locally:

```bash
curl -I http://localhost:3000/sign-in
```

Terminal 2:

```bash
cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints a random HTTPS hostname such as:

```text
https://random-words.trycloudflare.com
```

Set the complete webhook route in `.env`:

```env
PLAID_WEBHOOK_URL="https://random-words.trycloudflare.com/api/plaid/webhook"
```

There must be no leading/trailing whitespace, Markdown link syntax, duplicate value, query string, or trailing text. Restart `npm run dev` after changing `.env`; link tokens created before the change retain the older webhook URL.

## Validate without printing secrets

Validate the environment value:

```bash
node --env-file=.env -e '
const raw=(process.env.PLAID_WEBHOOK_URL||"").trim();
const url=new URL(raw);
if (url.protocol!=="https:" || url.pathname!=="/api/plaid/webhook") process.exit(1);
console.log("Webhook URL format: OK");
'
```

Send an unsigned probe:

```bash
curl -i -X POST "$PLAID_WEBHOOK_URL" \
  -H 'content-type: application/json' \
  --data '{}'
```

Expected result: `401` with an invalid-webhook response. That proves the route is publicly reachable and signature enforcement is active.

Interpret other results:

| Result | Meaning | Action |
|---|---|---|
| `401` | Correct for an unsigned probe | Continue to an authentic Plaid test |
| `200` | Dangerous if unsigned | Stop; inspect signature verification and routing |
| `303`/`307` to sign-in | Clerk or old middleware is intercepting Plaid | Deploy the current route matcher; check platform protection |
| `404` | Wrong hostname/path or stale deployment | Use exactly `/api/plaid/webhook` |
| `502`/`503` | Tunnel cannot reach local Next.js | Confirm port 3000 and both processes |
| Timeout | Tunnel stopped or network unavailable | Restart `cloudflared`; use the new hostname |

Do not consider `401` an end-to-end success. It tests rejection only.

## Test an authentic Sandbox webhook

1. Create a new Plaid Link token after `PLAID_WEBHOOK_URL` is set.
2. Connect a fake Sandbox institution.
3. Use Plaid's `/sandbox/item/fire_webhook` facility for the connected Item, or trigger the supported test from the Plaid Dashboard.
4. Confirm Plaid receives `200`.
5. Confirm exactly one verified webhook receipt and one sync job are created.
6. Replay the same delivery and confirm it does not create duplicate work.
7. Confirm the job fetches fresh data from Plaid and creates proposals only; webhook payload fields must never update trusted balances directly.

Never print or paste the stored Plaid access token to trigger a test manually. If a diagnostic tool requires it, add a narrowly scoped server-side Sandbox-only diagnostic or use the provider dashboard, then remove the diagnostic before commit.

## Tunnel lifecycle

Quick Tunnel hostnames normally change whenever `cloudflared` restarts. After a restart:

1. copy the new HTTPS hostname;
2. update only `PLAID_WEBHOOK_URL` in `.env`;
3. restart Next.js;
4. create a new Link token/Item;
5. repeat the unsigned `401` probe and authentic webhook test.

For hosted private staging, prefer a stable branch URL or custom staging domain:

```text
https://your-stable-staging-host/api/plaid/webhook
```

If Vercel Deployment Protection is enabled, configure an appropriate exception/bypass for this single route using Vercel-supported controls. Do not make the whole financial application public merely to allow Plaid webhooks.

## Shutdown

Stop `cloudflared` with `Ctrl-C`. The random public hostname should then stop forwarding. Keep the local app running only as long as needed.

Official references:

- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
- [Plaid webhooks](https://plaid.com/docs/api/webhooks/)
- [Plaid webhook verification](https://plaid.com/docs/api/webhooks/webhook-verification/)
- [Plaid Sandbox webhook testing](https://plaid.com/docs/sandbox/)
