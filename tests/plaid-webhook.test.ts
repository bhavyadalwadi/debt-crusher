import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook";

const now = Date.UTC(2026, 7, 27, 12, 0, 0);
const body = JSON.stringify({
  webhook_type: "ITEM",
  webhook_code: "WEBHOOK_UPDATE_ACKNOWLEDGED",
  item_id: "sandbox-item",
  environment: "sandbox",
});

let privateKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  publicJwk = await exportJWK(pair.publicKey);
});

async function signature(payloadBody = body, issuedAt = Math.floor(now / 1000)) {
  return new SignJWT({ request_body_sha256: createHash("sha256").update(payloadBody).digest("hex") })
    .setProtectedHeader({ alg: "ES256", kid: "sandbox-key" })
    .setIssuedAt(issuedAt)
    .sign(privateKey);
}

const options = () => ({ now, resolveKey: async (kid: string) => {
  expect(kid).toBe("sandbox-key");
  return publicJwk;
} });

describe("Plaid webhook verification", () => {
  it("accepts a valid ES256 signature and matching untouched body", async () => {
    await expect(verifyPlaidWebhook(body, await signature(), options())).resolves.toMatchObject({ item_id: "sandbox-item" });
  });

  it("rejects a changed body hash", async () => {
    await expect(verifyPlaidWebhook(`${body} `, await signature(), options())).rejects.toThrow(/body hash/i);
  });

  it("rejects an expired signature", async () => {
    await expect(verifyPlaidWebhook(body, await signature(body, Math.floor(now / 1000) - 301), options())).rejects.toThrow();
  });

  it("rejects a future signature", async () => {
    await expect(verifyPlaidWebhook(body, await signature(body, Math.floor(now / 1000) + 31), options())).rejects.toThrow(/timestamp/i);
  });

  it("rejects a missing verification token", async () => {
    await expect(verifyPlaidWebhook(body, null, options())).rejects.toThrow(/missing/i);
  });
});
