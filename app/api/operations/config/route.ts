import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadOperationsData } from "@/lib/operations-store";
import { CURRENT_PORTFOLIO_ID } from "@/lib/portfolio";
import { assertSameOrigin, readBoundedJson, requireOwnerContext, safeRouteError } from "@/lib/security";

export const runtime = "nodejs";

const day = z.number().int().min(1).max(31).nullable().optional();
const money = z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]).nullable().optional();

const patchSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("card"), id: z.string().min(1), currentBalance: money, statementBalance: money, minimumPaymentDue: money, creditLimit: money, purchaseApr: money, paymentDueDay: day, statementClosingDay: day, asOfDate: z.string().date(), source: z.string().min(1).default("manual") }).strict(),
  z.object({ entity: z.literal("autopay"), cardId: z.string().min(1), fundingAccountId: z.string().min(1).nullable(), mode: z.enum(["STATEMENT_BALANCE", "MINIMUM_PAYMENT", "FIXED_AMOUNT", "PROMO_TARGET", "CUSTOM", "DISABLED", "UNKNOWN"]), executionDay: day, fixedAmount: money, active: z.boolean() }).strict(),
  z.object({ entity: z.literal("cash"), id: z.string().min(1), currentBalance: money, minimumRequiredBalance: money, targetBalance: money, asOfDate: z.string().date(), source: z.string().min(1).default("manual") }).strict(),
  z.object({ entity: z.literal("recurring"), id: z.string().min(1), amount: z.union([z.string(), z.number()]).optional(), dayOfMonth: z.number().int().min(1).max(31).optional(), active: z.boolean().optional() }).strict(),
]);

const recurringSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "DEBT_PAYMENT"]),
  amount: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().positive()]),
  dayOfMonth: z.number().int().min(1).max(31),
  sourceAccountId: z.string().min(1).nullable().optional(),
  destinationAccountId: z.string().min(1).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
}).strict();

export async function GET() {
  await requireOwnerContext();
  return NextResponse.json(await loadOperationsData());
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const input = patchSchema.parse(await readBoundedJson(request));
    await prisma.$transaction(async (tx) => {
      if (input.entity === "card") {
        const before = await tx.creditCard.findFirstOrThrow({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID } });
        await tx.creditCard.updateMany({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID }, data: { currentBalance: input.currentBalance ?? undefined, statementBalance: input.statementBalance, minimumPaymentDue: input.minimumPaymentDue, creditLimit: input.creditLimit, purchaseApr: input.purchaseApr ?? undefined, paymentDueDay: input.paymentDueDay, statementClosingDay: input.statementClosingDay, balanceAsOf: new Date(input.asOfDate), balanceSource: input.source } });
        const after = await tx.creditCard.findFirstOrThrow({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID } });
        await tx.creditAccount.updateMany({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID }, data: { currentBalance: input.currentBalance == null ? undefined : Number(input.currentBalance), minPayment: input.minimumPaymentDue == null ? undefined : Number(input.minimumPaymentDue), creditLimit: input.creditLimit == null ? undefined : Number(input.creditLimit), aprPercent: input.purchaseApr == null ? undefined : Number(input.purchaseApr) } });
        await tx.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "credit_card", entityId: input.id, action: "BALANCE_UPDATE", beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after), source: input.source } });
      } else if (input.entity === "cash") {
        const before = await tx.cashAccount.findFirstOrThrow({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID } });
        await tx.cashAccount.updateMany({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID }, data: { currentBalance: input.currentBalance == null ? undefined : Number(input.currentBalance), minDayEndBalanceRequired: input.minimumRequiredBalance == null ? undefined : Number(input.minimumRequiredBalance), targetBalance: input.targetBalance, balanceAsOf: new Date(input.asOfDate), balanceSource: input.source } });
        const after = await tx.cashAccount.findFirstOrThrow({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID } });
        await tx.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "cash_account", entityId: input.id, action: "BALANCE_UPDATE", beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after), source: input.source } });
      } else if (input.entity === "autopay") {
        await tx.creditCard.findFirstOrThrow({ where: { id: input.cardId, portfolioId: CURRENT_PORTFOLIO_ID } });
        if (input.fundingAccountId) await tx.cashAccount.findFirstOrThrow({ where: { id: input.fundingAccountId, portfolioId: CURRENT_PORTFOLIO_ID } });
        const before = await tx.autopayRule.findFirst({ where: { creditCardId: input.cardId, creditCard: { portfolioId: CURRENT_PORTFOLIO_ID } } });
        const after = await tx.autopayRule.upsert({ where: { creditCardId: input.cardId }, create: { creditCardId: input.cardId, fundingAccountId: input.fundingAccountId, mode: input.mode, executionDay: input.executionDay, fixedAmount: input.fixedAmount, active: input.active }, update: { fundingAccountId: input.fundingAccountId, mode: input.mode, executionDay: input.executionDay, fixedAmount: input.fixedAmount, active: input.active } });
        await tx.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "autopay_rule", entityId: after.id, action: before ? "UPDATE" : "CREATE", beforeJson: before ? JSON.stringify(before) : null, afterJson: JSON.stringify(after), source: "manual" } });
      } else {
        const before = await tx.recurringTransaction.findFirstOrThrow({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID } });
        await tx.recurringTransaction.updateMany({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID }, data: { amount: input.amount, dayOfMonth: input.dayOfMonth, active: input.active } });
        const after = await tx.recurringTransaction.findFirstOrThrow({ where: { id: input.id, portfolioId: CURRENT_PORTFOLIO_ID } });
        await tx.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "recurring_transaction", entityId: input.id, action: input.active === false ? "ARCHIVE" : "UPDATE", beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after), source: "monthly_review" } });
      }
    });
    return NextResponse.json(await loadOperationsData());
  } catch (error) {
    return safeRouteError(error, "Invalid operations update");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const input = recurringSchema.parse(await readBoundedJson(request));
    if (input.type === "INCOME" && !input.destinationAccountId) throw new Error("Income requires a destination account.");
    if (input.type !== "INCOME" && !input.sourceAccountId) throw new Error("This transaction requires a source account.");
    if (input.type === "TRANSFER" && (!input.destinationAccountId || input.destinationAccountId === input.sourceAccountId)) throw new Error("Transfers require different source and destination accounts.");
    const referencedIds = [input.sourceAccountId, input.destinationAccountId].filter((id): id is string => Boolean(id));
    if (referencedIds.length) {
      const ownedCount = await prisma.cashAccount.count({ where: { id: { in: referencedIds }, portfolioId: CURRENT_PORTFOLIO_ID } });
      if (ownedCount !== new Set(referencedIds).size) throw new Error("Referenced cash account not found.");
    }
    const transaction = await prisma.recurringTransaction.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, ...input } });
    await prisma.auditLog.create({ data: { portfolioId: CURRENT_PORTFOLIO_ID, entityType: "recurring_transaction", entityId: transaction.id, action: "CREATE", afterJson: JSON.stringify(transaction), source: "manual" } });
    return NextResponse.json(await loadOperationsData(), { status: 201 });
  } catch (error) {
    return safeRouteError(error, "Invalid recurring transaction");
  }
}
