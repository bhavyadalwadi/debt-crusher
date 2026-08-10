import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CURRENT_PORTFOLIO_ID } from "@/lib/portfolio";
import { loadOperationsData } from "@/lib/operations-store";

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
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const promotion = await prisma.promotionalOffer.create({ data: { ...input, endDate: input.endDate ? new Date(input.endDate) : null, targetPayoffDate: input.targetPayoffDate ? new Date(input.targetPayoffDate) : null } });
    await prisma.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "promotional_offer", entityId: promotion.id, action: "CREATE", afterJson: JSON.stringify(promotion), source: "manual" } });
    return NextResponse.json(await loadOperationsData(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid promotion" }, { status: 400 });
  }
}
