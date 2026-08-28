import { disconnectFinancialConnection } from "@/lib/bank-sync";
import { assertSameOrigin, enforceRateLimit, financialJson, recordSecurityEvent, requireOwnerContext, requireStrictReverification, safeRouteError } from "@/lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    const reverification = requireStrictReverification(context);
    if (reverification) return reverification;
    await enforceRateLimit({ context, request, action: "plaid_disconnect", limit: 5, windowSeconds: 3600 });
    const { connectionId } = await params;
    await disconnectFinancialConnection(context, connectionId);
    await recordSecurityEvent({ context, request, event: "BANK_DISCONNECTED", result: "SUCCESS", metadata: { connectionId } });
    return financialJson({ ok: true });
  } catch (error) {
    return safeRouteError(error, "Unable to disconnect bank.");
  }
}
