import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { constantTimeTextEqual } from "@/lib/security";
import { getPlaidClient } from "@/lib/plaid-client";
import { providerItemHash, runFinancialSync } from "@/lib/bank-sync";

const webhookSchema = z.object({
  webhook_type: z.string().min(1).max(80),
  webhook_code: z.string().min(1).max(100),
  item_id: z.string().min(1).max(200),
  environment: z.literal("sandbox").optional(),
}).passthrough();

const keyCache = new Map<string, { key: JWK; expiresAt: number }>();

async function verificationKey(kid: string) {
  const cached = keyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) return cached.key;
  const response = await getPlaidClient().webhookVerificationKeyGet({ key_id: kid });
  const key = response.data.key as unknown as JWK;
  keyCache.set(kid, { key, expiresAt: Date.now() + 60 * 60_000 });
  return key;
}

export async function verifyPlaidWebhook(
  rawBody: string,
  verification: string | null,
  options: { resolveKey?: (kid: string) => Promise<JWK>; now?: number } = {},
) {
  if (!verification) throw new Error("Missing Plaid verification header.");
  const now = options.now ?? Date.now();
  const header = decodeProtectedHeader(verification);
  if (header.alg !== "ES256" || typeof header.kid !== "string") throw new Error("Invalid Plaid webhook algorithm.");
  const publicKey = await importJWK(await (options.resolveKey ?? verificationKey)(header.kid), "ES256");
  const verified = await jwtVerify(verification, publicKey, {
    algorithms: ["ES256"],
    maxTokenAge: "5 minutes",
    currentDate: new Date(now),
  });
  const issuedAt = verified.payload.iat;
  if (!issuedAt || issuedAt * 1000 > now + 30_000) throw new Error("Invalid Plaid webhook timestamp.");
  const claimedHash = verified.payload.request_body_sha256;
  const actualHash = createHash("sha256").update(rawBody).digest("hex");
  if (typeof claimedHash !== "string" || !constantTimeTextEqual(actualHash, claimedHash)) {
    throw new Error("Invalid Plaid webhook body hash.");
  }
  return webhookSchema.parse(JSON.parse(rawBody));
}

export async function receivePlaidWebhook(rawBody: string, verification: string | null) {
  const payload = await verifyPlaidWebhook(rawBody, verification);
  const fingerprint = createHash("sha256").update(rawBody).digest("hex");
  const connection = await prisma.financialConnection.findUnique({ where: { providerItemId: payload.item_id } });
  let receipt;
  try {
    receipt = await prisma.webhookReceipt.create({
      data: {
      fingerprint,
      connectionId: connection?.id,
      providerItemHash: providerItemHash(payload.item_id),
      eventType: payload.webhook_type,
      eventCode: payload.webhook_code,
      verified: true,
      processingStatus: connection ? "PENDING" : "IGNORED_UNKNOWN_ITEM",
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const existing = await prisma.webhookReceipt.findUniqueOrThrow({ where: { fingerprint } });
    return { duplicate: true, receiptId: existing.id };
  }
  if (!connection) return { duplicate: false, receiptId: receipt.id };
  const job = await prisma.syncJob.upsert({
    where: { idempotencyKey: `webhook:${fingerprint}` },
    create: { connectionId: connection.id, reason: "WEBHOOK", idempotencyKey: `webhook:${fingerprint}` },
    update: {},
  });
  return { duplicate: false, receiptId: receipt.id, jobId: job.id, connection };
}

export async function processPlaidWebhookJob(args: {
  receiptId: string;
  connection: { id: string; portfolioId: string };
  jobId: string;
}) {
  try {
    await runFinancialSync({
      context: { ownerId: "owner", portfolioId: args.connection.portfolioId },
      connectionId: args.connection.id,
      reason: "WEBHOOK",
      jobId: args.jobId,
    });
    await prisma.webhookReceipt.update({
      where: { id: args.receiptId },
      data: { processingStatus: "PROCESSED", processedAt: new Date() },
    });
  } catch {
    await prisma.webhookReceipt.update({
      where: { id: args.receiptId },
      data: { processingStatus: "FAILED", processedAt: new Date() },
    });
  }
}
