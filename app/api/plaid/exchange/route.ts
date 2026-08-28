import { z } from "zod";
import { exchangePlaidPublicToken } from "@/lib/bank-sync";
import {
  assertSameOrigin,
  enforceRateLimit,
  financialJson,
  readBoundedJson,
  recordSecurityEvent,
  requireOwnerContext,
  requireStrictReverification,
  safeRouteError,
} from "@/lib/security";

const inputSchema = z.object({
  sessionId: z.string().min(1).max(100),
  publicToken: z.string().min(1).max(1000),
  institution: z.object({ id: z.string().max(100).nullable().optional(), name: z.string().max(120).nullable().optional() }).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    const reverification = requireStrictReverification(context);
    if (reverification) return reverification;
    await enforceRateLimit({ context, request, action: "plaid_exchange", limit: 5, windowSeconds: 900 });
    const input = inputSchema.parse(await readBoundedJson(request));
    const connectionId = await exchangePlaidPublicToken({ context, ...input });
    await recordSecurityEvent({ context, request, event: "BANK_CONNECTED", result: "SUCCESS", metadata: { connectionId } });
    return financialJson({ ok: true, connectionId }, { status: 201 });
  } catch (error) {
    return safeRouteError(error, "Unable to complete bank connection.");
  }
}
