import { deleteDisconnectedConnectionData } from "@/lib/bank-sync";
import { assertSameOrigin, enforceRateLimit, financialJson, recordSecurityEvent, requireOwnerContext, requireStrictReverification, safeRouteError } from "@/lib/security";

export async function DELETE(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    const reverification = requireStrictReverification(context);
    if (reverification) return reverification;
    await enforceRateLimit({ context, request, action: "plaid_delete", limit: 3, windowSeconds: 3600 });
    const { connectionId } = await params;
    await deleteDisconnectedConnectionData(context, connectionId);
    await recordSecurityEvent({ context, request, event: "FINANCIAL_DATA_DELETED", result: "SUCCESS", metadata: { connectionId } });
    return financialJson({ ok: true });
  } catch (error) {
    return safeRouteError(error, "Unable to delete connection data.");
  }
}
