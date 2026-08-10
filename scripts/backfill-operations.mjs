import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const portfolioId = "current-portfolio";

const canonicalize = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unknown";
const autopayMode = (value) => {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("statement balance")) return "STATEMENT_BALANCE";
  if (text.includes("minimum")) return "MINIMUM_PAYMENT";
  if (text.includes("disabled") || text.includes("none")) return "DISABLED";
  return "UNKNOWN";
};

async function main() {
  const portfolio = await prisma.portfolio.findUnique({ where: { id: portfolioId }, include: { creditAccounts: true, cashAccounts: true } });
  if (!portfolio) return process.stdout.write("No current portfolio found; nothing to backfill.\n");
  await prisma.$transaction(async (tx) => {
    for (const account of portfolio.cashAccounts) {
      const canonicalName = canonicalize(account.institution);
      const institution = await tx.financialInstitution.upsert({
        where: { portfolioId_canonicalName: { portfolioId, canonicalName } },
        create: { portfolioId, canonicalName, displayName: account.institution || "Unknown institution" },
        update: { displayName: account.institution || "Unknown institution", active: true },
      });
      await tx.cashAccount.update({ where: { id: account.id }, data: { institutionId: institution.id, nickname: account.accountName, active: true, balanceAsOf: portfolio.updatedAt, balanceSource: "legacy_backfill" } });
    }
    for (const [position, account] of portfolio.creditAccounts.sort((a, b) => a.position - b.position).entries()) {
      const canonicalName = canonicalize(account.institution);
      const institution = await tx.financialInstitution.upsert({
        where: { portfolioId_canonicalName: { portfolioId, canonicalName } },
        create: { portfolioId, canonicalName, displayName: account.institution || "Unknown institution" },
        update: { displayName: account.institution || "Unknown institution", active: true },
      });
      await tx.creditCard.upsert({
        where: { id: account.id },
        create: { id: account.id, portfolioId, institutionId: institution.id, issuerName: account.institution, nickname: account.nickname, currentBalance: account.currentBalance, minimumPaymentDue: account.minPayment, creditLimit: account.creditLimit, purchaseApr: account.aprPercent, paymentDueDay: account.paymentDue?.getUTCDate() ?? null, balanceAsOf: portfolio.updatedAt, balanceSource: "legacy_backfill", position, notes: account.interestFeesThisMonth > 0 ? `Legacy combined interest/fees value: ${account.interestFeesThisMonth}` : null },
        update: { institutionId: institution.id, issuerName: account.institution, nickname: account.nickname, currentBalance: account.currentBalance, minimumPaymentDue: account.minPayment, creditLimit: account.creditLimit, purchaseApr: account.aprPercent, position },
      });
      const mode = autopayMode(account.autoPayment);
      await tx.autopayRule.upsert({ where: { creditCardId: account.id }, create: { creditCardId: account.id, mode, active: mode !== "DISABLED", notes: account.autoPayment }, update: { mode, active: mode !== "DISABLED", notes: account.autoPayment } });
      if (account.promoFlag && account.promoEndDate) {
        const existing = await tx.promotionalOffer.findFirst({ where: { creditCardId: account.id } });
        if (!existing) await tx.promotionalOffer.create({ data: { creditCardId: account.id, type: "UNKNOWN", endDate: account.promoEndDate, notes: "Migrated from legacy single-promo fields; balance and terms require confirmation." } });
      }
    }
    await tx.auditLog.create({ data: { portfolioId, entityType: "portfolio", entityId: portfolioId, action: "LEGACY_BACKFILL", source: "migration" } });
  });
  process.stdout.write(`Backfilled ${portfolio.creditAccounts.length} cards and ${portfolio.cashAccounts.length} cash accounts.\n`);
}

main().finally(() => prisma.$disconnect());
