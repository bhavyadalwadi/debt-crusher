import { z } from "zod";
import { matchFinancialAccount, runFinancialSync } from "@/lib/bank-sync";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, enforceRateLimit, financialJson, readBoundedJson, requireOwnerContext, safeRouteError } from "@/lib/security";

const schema = z.object({ type: z.enum(["cash", "card"]), id: z.string().min(1).max(120) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    await enforceRateLimit({ context, request, action: "plaid_match", limit: 20, windowSeconds: 3600 });
    const { accountId } = await params;
    const target = schema.parse(await readBoundedJson(request));
    const account = await matchFinancialAccount({ context, financialAccountId: accountId, target });
    const connection = await prisma.financialConnection.findFirstOrThrow({
      where: { id: account.connectionId, portfolioId: context.portfolioId },
    });
    await runFinancialSync({ context, connectionId: connection.id, reason: "MANUAL" });
    return financialJson({ ok: true });
  } catch (error) {
    return safeRouteError(error, "Unable to match account.");
  }
}
