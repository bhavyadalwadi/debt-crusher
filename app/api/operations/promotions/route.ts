import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CURRENT_PORTFOLIO_ID } from "@/lib/portfolio";
import { loadOperationsData } from "@/lib/operations-store";
import { assertSameOrigin, readBoundedJson, requireOwnerContext, safeRouteError } from "@/lib/security";

const schema = z.object({
  creditCardId: z.string().min(1),
  type: z.enum(["BALANCE_TRANSFER", "PURCHASE_PROMO", "APR_PROMO", "DEFERRED_INTEREST", "OTHER", "UNKNOWN"]),
  currentPromoBalance: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]).nullable(),
  promotionalApr: z.union([z.string(), z.number()]).nullable().optional(),
  standardAprAfterPromo: z.union([z.string(), z.number()]).nullable().optional(),
  endDate: z.string().date().nullable(),
  targetPayoffDate: z.string().date().nullable().optional(),
  deferredInterest: z.boolean(),
  safetyBufferDays: z.number().int().min(0).max(90).default(14),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const input = schema.parse(await readBoundedJson(request));
    const card = await prisma.creditCard.findFirst({ where: { id: input.creditCardId, portfolioId: CURRENT_PORTFOLIO_ID } });
    if (!card) throw new Error("Credit card not found.");
    const promotion = await prisma.promotionalOffer.create({ data: { ...input, endDate: input.endDate ? new Date(input.endDate) : null, targetPayoffDate: input.targetPayoffDate ? new Date(input.targetPayoffDate) : null } });
    await prisma.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "promotional_offer", entityId: promotion.id, action: "CREATE", afterJson: JSON.stringify(promotion), source: "manual" } });
    return NextResponse.json(await loadOperationsData(), { status: 201 });
  } catch (error) {
    return safeRouteError(error, "Invalid promotion");
  }
}
