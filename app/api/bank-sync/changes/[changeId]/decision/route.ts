import { z } from "zod";
import { decideStagedChange } from "@/lib/bank-sync";
import { assertSameOrigin, enforceRateLimit, financialJson, readBoundedJson, recordSecurityEvent, requireOwnerContext, safeRouteError } from "@/lib/security";

const schema = z.object({ version: z.number().int().positive(), decision: z.enum(["accept", "ignore"]) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ changeId: string }> }) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    await enforceRateLimit({ context, request, action: "plaid_decision", limit: 60, windowSeconds: 3600 });
    const { changeId } = await params;
    const input = schema.parse(await readBoundedJson(request));
    await decideStagedChange({ context, changeId, ...input });
    await recordSecurityEvent({ context, request, event: "FINANCIAL_DATA_DECIDED", result: "SUCCESS", metadata: { decision: input.decision } });
    return financialJson({ ok: true });
  } catch (error) {
    return safeRouteError(error, "Unable to decide proposed change.");
  }
}
