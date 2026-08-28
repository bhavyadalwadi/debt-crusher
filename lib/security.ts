import "server-only";

import { auth, reverificationErrorResponse } from "@clerk/nextjs/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { CURRENT_PORTFOLIO_ID } from "@/lib/portfolio";
import { ZodError } from "zod";

export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

export class SecurityError extends Error {
  constructor(
    public readonly status: 401 | 403 | 409 | 413 | 415 | 429 | 500,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type OwnerContext = {
  ownerId: string;
  portfolioId: string;
  clerkUserId: string;
  sessionId: string | null;
  has: Awaited<ReturnType<typeof auth>>["has"];
};

function requiredOwnerClerkId() {
  const value = process.env.DEBT_CRUSHER_OWNER_CLERK_USER_ID?.trim();
  if (!value) throw new SecurityError(500, "OWNER_NOT_CONFIGURED", "Owner access is not configured.");
  return value;
}

export async function resolveOwnerContext(args: {
  clerkUserId: string | null;
  sessionId?: string | null;
  has?: OwnerContext["has"];
}): Promise<OwnerContext> {
  if (!args.clerkUserId) throw new SecurityError(401, "UNAUTHENTICATED", "Authentication required.");
  if (args.clerkUserId !== requiredOwnerClerkId()) {
    throw new SecurityError(403, "OWNER_ONLY", "This private workspace is owner-only.");
  }
  await prisma.$transaction(async (tx) => {
    const owner = await tx.appUser.findUnique({ where: { id: "owner" } });
    if (owner?.clerkUserId && owner.clerkUserId !== args.clerkUserId) {
      throw new SecurityError(403, "OWNER_ALREADY_CLAIMED", "Owner identity mismatch.");
    }
    await tx.appUser.upsert({
      where: { id: "owner" },
      create: { id: "owner", clerkUserId: args.clerkUserId },
      update: { clerkUserId: args.clerkUserId },
    });
    await tx.portfolio.updateMany({
      where: { id: CURRENT_PORTFOLIO_ID, ownerId: { not: "owner" } },
      data: { ownerId: "owner" },
    });
  });
  return {
    ownerId: "owner",
    portfolioId: CURRENT_PORTFOLIO_ID,
    clerkUserId: args.clerkUserId,
    sessionId: args.sessionId ?? null,
    has: args.has ?? (() => false),
  };
}

export async function requireOwnerContext(): Promise<OwnerContext> {
  const session = await auth();
  return resolveOwnerContext({ clerkUserId: session.userId, sessionId: session.sessionId, has: session.has });
}

export function requireStrictReverification(context: OwnerContext) {
  return context.has({ reverification: "strict" }) ? null : reverificationErrorResponse("strict");
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new SecurityError(403, "INVALID_ORIGIN", "Request origin was rejected.");
  }
}

export async function readBoundedJson<T = unknown>(request: Request, maxBytes = 32_768): Promise<T> {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim() !== "application/json") {
    throw new SecurityError(415, "JSON_REQUIRED", "JSON content is required.");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new SecurityError(413, "BODY_TOO_LARGE", "Request body is too large.");
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    throw new SecurityError(413, "BODY_TOO_LARGE", "Request body is too large.");
  }
  return JSON.parse(raw) as T;
}

export function financialJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) headers.set(key, value);
  return Response.json(data, { ...init, headers });
}

export function safeRouteError(error: unknown, fallback = "Request failed") {
  if (error instanceof SecurityError) {
    return financialJson({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return financialJson({ error: "Invalid JSON.", code: "INVALID_JSON" }, { status: 400 });
  }
  if (error instanceof ZodError) {
    return financialJson({ error: "Invalid request.", code: "INVALID_REQUEST" }, { status: 400 });
  }
  console.error(JSON.stringify({
    event: "route_failure",
    category: error instanceof Error ? error.name : "UnknownError",
  }));
  return financialJson({ error: fallback, code: "REQUEST_FAILED" }, { status: 500 });
}

function securityHash(value: string) {
  const key = process.env.SECURITY_HASH_KEY;
  if (!key) throw new SecurityError(500, "SECURITY_HASH_NOT_CONFIGURED", "Security hashing is not configured.");
  return createHmac("sha256", key).update(value).digest("hex");
}

export function requestIpHash(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded ? securityHash(forwarded) : null;
}

export function opaqueHash(value: string) {
  return securityHash(value);
}

export function constantTimeTextEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function enforceRateLimit(args: {
  context: OwnerContext;
  request: Request;
  action: string;
  limit: number;
  windowSeconds: number;
}) {
  const windowMs = args.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const subjectHash = opaqueHash(`${args.context.ownerId}:${requestIpHash(args.request) ?? "unknown"}`);
  const record = await prisma.securityRateLimit.upsert({
    where: { action_subjectHash_windowStart: { action: args.action, subjectHash, windowStart } },
    create: {
      ownerId: args.context.ownerId,
      action: args.action,
      subjectHash,
      windowStart,
      expiresAt: new Date(windowStart.getTime() + windowMs * 2),
    },
    update: { count: { increment: 1 } },
  });
  if (record.count > args.limit) throw new SecurityError(429, "RATE_LIMITED", "Too many requests. Try again later.");
}

export async function recordSecurityEvent(args: {
  context: OwnerContext;
  request?: Request;
  event: string;
  result: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await prisma.securityEvent.create({
    data: {
      ownerId: args.context.ownerId,
      portfolioId: args.context.portfolioId,
      event: args.event,
      result: args.result,
      ipHash: args.request ? requestIpHash(args.request) : null,
      sessionHash: args.context.sessionId ? opaqueHash(args.context.sessionId) : null,
      metadataJson: args.metadata ? JSON.stringify(args.metadata) : null,
    },
  });
}
