import { runFinancialSync } from "@/lib/bank-sync";
import { assertSameOrigin, enforceRateLimit, financialJson, recordSecurityEvent, requireOwnerContext, safeRouteError } from "@/lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    await enforceRateLimit({ context, request, action: "plaid_sync", limit: 6, windowSeconds: 3600 });
    const { connectionId } = await params;
    await runFinancialSync({ context, connectionId, reason: "MANUAL" });
    await recordSecurityEvent({ context, request, event: "SYNC_COMPLETED", result: "SUCCESS", metadata: { connectionId } });
    return financialJson({ ok: true });
  } catch (error) {
    return safeRouteError(error, "Unable to synchronize bank data.");
  }
}
