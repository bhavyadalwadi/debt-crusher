import { createPlaidLinkSession } from "@/lib/bank-sync";
import {
  assertSameOrigin,
  enforceRateLimit,
  financialJson,
  recordSecurityEvent,
  requireOwnerContext,
  requireStrictReverification,
  safeRouteError,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    const reverification = requireStrictReverification(context);
    if (reverification) return reverification;
    await enforceRateLimit({ context, request, action: "plaid_link", limit: 5, windowSeconds: 900 });
    const session = await createPlaidLinkSession(context);
    await recordSecurityEvent({ context, request, event: "BANK_LINK_STARTED", result: "SUCCESS" });
    return financialJson(session);
  } catch (error) {
    return safeRouteError(error, "Unable to start bank connection.");
  }
}
