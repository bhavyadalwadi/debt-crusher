import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const id = "current-portfolio";
const [legacyCards, cards, legacyCash, cash, snapshots] = await Promise.all([
  prisma.creditAccount.count({ where: { portfolioId: id } }), prisma.creditCard.count({ where: { portfolioId: id } }),
  prisma.cashAccount.count({ where: { portfolioId: id } }), prisma.cashAccount.count({ where: { portfolioId: id, active: true } }),
  prisma.activitySnapshot.count(),
]);
const result = { legacyCards, normalizedCards: cards, legacyCash, activeCash: cash, snapshots, idsAndCountsPreserved: legacyCards === cards && legacyCash === cash };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
await prisma.$disconnect();
if (!result.idsAndCountsPreserved) process.exitCode = 1;
