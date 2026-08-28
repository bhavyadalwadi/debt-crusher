import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createEmptyPortfolio, CURRENT_PORTFOLIO_ID } from "@/lib/portfolio";
import { portfolioStateToDb } from "@/lib/persistence";
import { loadOperationsData } from "@/lib/operations-store";
import { assertSameOrigin, readBoundedJson, requireOwnerContext, safeRouteError } from "@/lib/security";

export const runtime = "nodejs";

const nullableMoney = z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]).nullable().optional();
const day = z.number().int().min(1).max(31).nullable().optional();

const entry = z.discriminatedUnion("entity", [
  z.object({
    entity: z.literal("cash"), id: z.string().optional(), institution: z.string().trim().min(1), nickname: z.string().trim().min(1), accountType: z.string().trim().min(1), lastFour: z.string().regex(/^\d{4}$/).nullable().optional(), currentBalance: z.union([z.string(), z.number()]), minimumRequiredBalance: z.union([z.string(), z.number()]).default(0), targetBalance: nullableMoney, asOfDate: z.string().date(), saveAndAddAnother: z.boolean().optional(), confirmDuplicate: z.boolean().optional(),
  }).strict(),
  z.object({
    entity: z.literal("card"), id: z.string().optional(), institution: z.string().trim().min(1), nickname: z.string().trim().min(1), product: z.string().trim().nullable().optional(), lastFour: z.string().regex(/^\d{4}$/).nullable().optional(), currentBalance: z.union([z.string(), z.number()]), statementBalance: nullableMoney, minimumPaymentDue: nullableMoney, creditLimit: nullableMoney, purchaseApr: z.union([z.string(), z.number()]).default(0), paymentDueDay: day, statementClosingDay: day, status: z.enum(["ACTIVE", "PAID_OFF", "CLOSED", "TRANSFERRED", "SUSPENDED"]).default("ACTIVE"), asOfDate: z.string().date(), notes: z.string().max(1000).nullable().optional(), autopayMode: z.enum(["STATEMENT_BALANCE", "MINIMUM_PAYMENT", "FIXED_AMOUNT", "PROMO_TARGET", "CUSTOM", "DISABLED", "UNKNOWN"]).default("UNKNOWN"), fundingAccountId: z.string().nullable().optional(), executionDay: day, fixedAmount: nullableMoney, confirmDuplicate: z.boolean().optional(),
  }).strict(),
]);

const canonicalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unknown";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const input = entry.parse(await readBoundedJson(request));
    const empty = createEmptyPortfolio();
    await prisma.portfolio.upsert({ where: { id: CURRENT_PORTFOLIO_ID }, create: portfolioStateToDb(empty), update: {} });
    const duplicate = input.lastFour
      ? input.entity === "card"
        ? await prisma.creditCard.findFirst({ where: { portfolioId: CURRENT_PORTFOLIO_ID, issuerName: input.institution, lastFour: input.lastFour, id: input.id ? { not: input.id } : undefined } })
        : await prisma.cashAccount.findFirst({ where: { portfolioId: CURRENT_PORTFOLIO_ID, institution: input.institution, lastFour: input.lastFour, id: input.id ? { not: input.id } : undefined } })
      : null;
    if (duplicate && !input.confirmDuplicate) return NextResponse.json({ error: "An account with this institution and last four already exists.", duplicate: true }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      if (input.id) {
        const existing = input.entity === "card"
          ? await tx.creditCard.findUnique({ where: { id: input.id }, select: { portfolioId: true } })
          : await tx.cashAccount.findUnique({ where: { id: input.id }, select: { portfolioId: true } });
        if (existing && existing.portfolioId !== CURRENT_PORTFOLIO_ID) throw new Error("Record not found.");
      }
      const canonicalName = canonicalize(input.institution);
      const institution = await tx.financialInstitution.upsert({ where: { portfolioId_canonicalName: { portfolioId: CURRENT_PORTFOLIO_ID, canonicalName } }, create: { portfolioId: CURRENT_PORTFOLIO_ID, canonicalName, displayName: input.institution }, update: { displayName: input.institution, active: true } });
      if (input.entity === "cash") {
        const id = input.id ?? crypto.randomUUID();
        const position = await tx.cashAccount.count({ where: { portfolioId: CURRENT_PORTFOLIO_ID } });
        const before = input.id ? await tx.cashAccount.findFirst({ where: { id, portfolioId: CURRENT_PORTFOLIO_ID } }) : null;
        const after = await tx.cashAccount.upsert({ where: { id }, create: { id, portfolioId: CURRENT_PORTFOLIO_ID, institutionId: institution.id, institution: input.institution, accountName: input.nickname, nickname: input.nickname, type: input.accountType, lastFour: input.lastFour, currentBalance: Number(input.currentBalance), minDayEndBalanceRequired: Number(input.minimumRequiredBalance), targetBalance: input.targetBalance, active: true, balanceAsOf: new Date(input.asOfDate), balanceSource: "manual", position }, update: { institutionId: institution.id, institution: input.institution, accountName: input.nickname, nickname: input.nickname, type: input.accountType, lastFour: input.lastFour, currentBalance: Number(input.currentBalance), minDayEndBalanceRequired: Number(input.minimumRequiredBalance), targetBalance: input.targetBalance, active: true, balanceAsOf: new Date(input.asOfDate), balanceSource: "manual" } });
        await tx.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "cash_account", entityId: id, action: before ? "UPDATE" : "CREATE", beforeJson: before ? JSON.stringify(before) : null, afterJson: JSON.stringify(after), source: "manual_setup" } });
      } else {
        const id = input.id ?? crypto.randomUUID();
        const position = await tx.creditCard.count({ where: { portfolioId: CURRENT_PORTFOLIO_ID } });
        const before = input.id ? await tx.creditCard.findFirst({ where: { id, portfolioId: CURRENT_PORTFOLIO_ID } }) : null;
        const card = await tx.creditCard.upsert({ where: { id }, create: { id, portfolioId: CURRENT_PORTFOLIO_ID, institutionId: institution.id, issuerName: input.institution, product: input.product, nickname: input.nickname, lastFour: input.lastFour, status: input.status, currentBalance: input.currentBalance, statementBalance: input.statementBalance, minimumPaymentDue: input.minimumPaymentDue, creditLimit: input.creditLimit, purchaseApr: input.purchaseApr, statementClosingDay: input.statementClosingDay, paymentDueDay: input.paymentDueDay, balanceAsOf: new Date(input.asOfDate), balanceSource: "manual", notes: input.notes, position }, update: { institutionId: institution.id, issuerName: input.institution, product: input.product, nickname: input.nickname, lastFour: input.lastFour, status: input.status, currentBalance: input.currentBalance, statementBalance: input.statementBalance, minimumPaymentDue: input.minimumPaymentDue, creditLimit: input.creditLimit, purchaseApr: input.purchaseApr, statementClosingDay: input.statementClosingDay, paymentDueDay: input.paymentDueDay, balanceAsOf: new Date(input.asOfDate), balanceSource: "manual", notes: input.notes } });
        await tx.creditAccount.upsert({ where: { id }, create: { id, portfolioId: CURRENT_PORTFOLIO_ID, institution: input.institution, nickname: input.nickname, accountType: "credit_card", currentBalance: Number(input.currentBalance), creditLimit: input.creditLimit == null ? null : Number(input.creditLimit), aprPercent: Number(input.purchaseApr), promoFlag: false, minPayment: input.minimumPaymentDue == null ? 0 : Number(input.minimumPaymentDue), interestFeesThisMonth: 0, autoPayment: input.autopayMode, paymentDue: input.paymentDueDay ? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), input.paymentDueDay)) : null, howAreWeTakingCareOfIt: input.notes ?? "", position }, update: { institution: input.institution, nickname: input.nickname, currentBalance: Number(input.currentBalance), creditLimit: input.creditLimit == null ? null : Number(input.creditLimit), aprPercent: Number(input.purchaseApr), minPayment: input.minimumPaymentDue == null ? 0 : Number(input.minimumPaymentDue), autoPayment: input.autopayMode, howAreWeTakingCareOfIt: input.notes ?? "" } });
        await tx.autopayRule.upsert({ where: { creditCardId: id }, create: { creditCardId: id, fundingAccountId: input.fundingAccountId, mode: input.autopayMode, executionDay: input.executionDay, fixedAmount: input.fixedAmount, active: input.autopayMode !== "DISABLED" }, update: { fundingAccountId: input.fundingAccountId, mode: input.autopayMode, executionDay: input.executionDay, fixedAmount: input.fixedAmount, active: input.autopayMode !== "DISABLED" } });
        await tx.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "credit_card", entityId: id, action: before ? "UPDATE" : "CREATE", beforeJson: before ? JSON.stringify(before) : null, afterJson: JSON.stringify(card), source: "manual_setup" } });
      }
    });
    return NextResponse.json(await loadOperationsData(), { status: 201 });
  } catch (error) {
    return safeRouteError(error, "Manual entry failed");
  }
}
