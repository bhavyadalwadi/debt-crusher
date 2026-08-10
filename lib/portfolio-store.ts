import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activityEventToDb,
  activitySnapshotToDb,
  cashAccountToDb,
  creditAccountToDb,
  dbRowToActivityEvent,
  dbRowToActivitySnapshot,
  dbRowToPortfolioState,
  portfolioStateToDb,
  screenshotImportArtifactToDb,
} from "@/lib/persistence";
import {
  buildActivityEvents,
  buildActivitySnapshot,
  buildComputedSnapshot,
  buildSnapshotChangeDetail,
  buildSnapshotChangeSummary,
  buildSnapshotDelta,
  createDefaultCustomStrategyWeights,
  createEmptyPortfolio,
  CURRENT_PORTFOLIO_ID,
} from "@/lib/portfolio";
import type { ActivitySnapshot, PortfolioState, ScreenshotImportExtraction } from "@/lib/types";

export function normalizePortfolioInput(portfolio: PortfolioState): PortfolioState {
  return {
    ...portfolio,
    setup: {
      extra_payment_budget: portfolio.setup?.extra_payment_budget ?? 0,
      promo_end_soon_days: portfolio.setup?.promo_end_soon_days ?? 21,
      global_cash_buffer_override:
        portfolio.setup?.global_cash_buffer_override ?? null,
      payoff_strategy:
        portfolio.setup?.payoff_strategy === "snowball" ||
        portfolio.setup?.payoff_strategy === "promo-first" ||
        portfolio.setup?.payoff_strategy === "custom"
          ? portfolio.setup.payoff_strategy
          : "avalanche",
      custom_strategy_weights: {
        ...createDefaultCustomStrategyWeights(),
        ...(portfolio.setup?.custom_strategy_weights ?? {}),
      },
    },
  };
}

function enrichSnapshots(snapshots: ActivitySnapshot[]) {
  return snapshots.map((snapshot, index) => ({
    ...snapshot,
    deltaFromPrevious: buildSnapshotDelta(snapshot, snapshots[index + 1] ?? null),
    changeSummary: buildSnapshotChangeSummary(snapshot, snapshots[index + 1] ?? null),
    changeDetail:
      snapshot.changeDetail ??
      buildSnapshotChangeDetail(snapshot, snapshots[index + 1] ?? null),
  }));
}

export async function loadPortfolioBundle() {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: CURRENT_PORTFOLIO_ID },
    include: {
      creditAccounts: true,
      cashAccounts: { where: { active: true } },
    },
  });

  const snapshots = await prisma.activitySnapshot.findMany({
    orderBy: { importedAt: "desc" },
    take: 24,
    include: {
      importArtifact: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          extractionJson: true,
        },
      },
    },
  });
  const recentEvents = await prisma.activityEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take: 40,
  });

  if (!portfolio) {
    const empty = createEmptyPortfolio();
    const currentSnapshot = buildComputedSnapshot(empty, {
      id: "current-view",
      label: "Current portfolio",
    });
    return {
      portfolio: empty,
      currentSnapshot,
      snapshots: enrichSnapshots(snapshots.map(dbRowToActivitySnapshot)),
      recentEvents: recentEvents.map(dbRowToActivityEvent),
    };
  }

  const state = dbRowToPortfolioState({
    portfolio,
    creditAccounts: portfolio.creditAccounts,
    cashAccounts: portfolio.cashAccounts,
  });

  const mappedSnapshots = enrichSnapshots(snapshots.map(dbRowToActivitySnapshot));
  const currentSnapshot = buildComputedSnapshot(state, {
    id: "current-view",
    label: "Current portfolio",
  });

  return {
    portfolio: state,
    currentSnapshot: {
      ...currentSnapshot,
      deltaFromPrevious: buildSnapshotDelta(currentSnapshot, mappedSnapshots[0] ?? null),
      changeSummary: buildSnapshotChangeSummary(currentSnapshot, mappedSnapshots[0] ?? null),
      changeDetail: buildSnapshotChangeDetail(currentSnapshot, mappedSnapshots[0] ?? null),
    },
    snapshots: mappedSnapshots,
    recentEvents: recentEvents.map(dbRowToActivityEvent),
  };
}

export async function savePortfolioBundle(args: {
  portfolio: PortfolioState;
  source: ActivitySnapshot["source"];
  label?: string;
  filename?: string;
  screenshotArtifact?: {
    fileName: string;
    mimeType: string;
    imageData: Prisma.Bytes;
    extractedText: string;
    extraction: ScreenshotImportExtraction;
  };
}) {
  const normalizedPortfolio = normalizePortfolioInput(args.portfolio);
  const previousPortfolioRecord = await prisma.portfolio.findUnique({
    where: { id: CURRENT_PORTFOLIO_ID },
    include: {
      creditAccounts: true,
      cashAccounts: { where: { active: true } },
    },
  });
  const previousState = previousPortfolioRecord
    ? dbRowToPortfolioState({
        portfolio: previousPortfolioRecord,
        creditAccounts: previousPortfolioRecord.creditAccounts,
        cashAccounts: previousPortfolioRecord.cashAccounts,
      })
    : null;
  const previousSnapshot = previousState
    ? buildComputedSnapshot(previousState, {
        id: "previous-state",
        label: "Previous portfolio",
      })
    : null;

  const baseSnapshot = buildActivitySnapshot(normalizedPortfolio, args.source, {
    label: args.label,
    filename: args.filename,
  });
  const snapshot = {
    ...baseSnapshot,
    changeSummary: buildSnapshotChangeSummary(baseSnapshot, previousSnapshot),
    changeDetail: buildSnapshotChangeDetail(baseSnapshot, previousSnapshot),
  };
  const events = buildActivityEvents({
    snapshotId: snapshot.id,
    current: normalizedPortfolio,
    previous: previousState,
  });

  await prisma.$transaction(async (tx) => {
    await tx.portfolio.upsert({
      where: { id: CURRENT_PORTFOLIO_ID },
      update: portfolioStateToDb(normalizedPortfolio),
      create: portfolioStateToDb(normalizedPortfolio),
    });

    for (const [index, account] of normalizedPortfolio.creditAccounts.entries()) {
      const data = creditAccountToDb(account, index);
      await tx.creditAccount.upsert({ where: { id: account.id }, create: data, update: data });
      const canonicalName = account.institution.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unknown";
      const institution = await tx.financialInstitution.upsert({
        where: { portfolioId_canonicalName: { portfolioId: CURRENT_PORTFOLIO_ID, canonicalName } },
        create: { portfolioId: CURRENT_PORTFOLIO_ID, canonicalName, displayName: account.institution || "Unknown institution" },
        update: { displayName: account.institution || "Unknown institution", active: true },
      });
      await tx.creditCard.upsert({
        where: { id: account.id },
        create: {
          id: account.id, portfolioId: CURRENT_PORTFOLIO_ID, institutionId: institution.id,
          issuerName: account.institution, nickname: account.nickname,
          currentBalance: account.current_balance, minimumPaymentDue: account.min_payment,
          creditLimit: account.credit_limit, purchaseApr: account.apr_percent,
          paymentDueDay: account.payment_due ? new Date(`${account.payment_due}T00:00:00Z`).getUTCDate() : null,
          balanceAsOf: new Date(normalizedPortfolio.updatedAt), balanceSource: args.source, position: index,
          notes: account.interest_fees_this_month > 0 ? `Legacy combined interest/fees value: ${account.interest_fees_this_month}` : null,
        },
        update: {
          institutionId: institution.id, issuerName: account.institution, nickname: account.nickname,
          currentBalance: account.current_balance, minimumPaymentDue: account.min_payment,
          creditLimit: account.credit_limit, purchaseApr: account.apr_percent,
          balanceAsOf: new Date(normalizedPortfolio.updatedAt), balanceSource: args.source, position: index,
        },
      });
      const autopayText = typeof account.auto_payment === "string" ? account.auto_payment.toLowerCase() : "";
      const mode = autopayText.includes("statement balance")
        ? "STATEMENT_BALANCE"
        : autopayText.includes("minimum")
          ? "MINIMUM_PAYMENT"
          : autopayText.includes("disabled") || autopayText.includes("none")
            ? "DISABLED"
            : "UNKNOWN";
      await tx.autopayRule.upsert({
        where: { creditCardId: account.id },
        create: { creditCardId: account.id, mode, active: mode !== "DISABLED", notes: account.auto_payment == null ? null : String(account.auto_payment) },
        update: { notes: account.auto_payment == null ? null : String(account.auto_payment) },
      });
      if (account.promo_flag && account.promo_end_date) {
        const existingPromo = await tx.promotionalOffer.findFirst({ where: { creditCardId: account.id }, orderBy: { createdAt: "asc" } });
        if (!existingPromo) {
          await tx.promotionalOffer.create({ data: { creditCardId: account.id, type: "UNKNOWN", endDate: new Date(account.promo_end_date), notes: "Migrated from legacy single-promo fields; balance and terms require confirmation." } });
        }
      }
    }
    const retainedCreditIds = normalizedPortfolio.creditAccounts.map((account) => account.id);
    await tx.creditAccount.deleteMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, ...(retainedCreditIds.length ? { id: { notIn: retainedCreditIds } } : {}) } });
    await tx.creditCard.updateMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, ...(retainedCreditIds.length ? { id: { notIn: retainedCreditIds } } : {}) }, data: { status: "CLOSED" } });

    for (const [index, account] of normalizedPortfolio.cashAccounts.entries()) {
      const data = cashAccountToDb(account, index);
      const canonicalName = account.institution.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unknown";
      const institution = await tx.financialInstitution.upsert({
        where: { portfolioId_canonicalName: { portfolioId: CURRENT_PORTFOLIO_ID, canonicalName } },
        create: { portfolioId: CURRENT_PORTFOLIO_ID, canonicalName, displayName: account.institution || "Unknown institution" },
        update: { displayName: account.institution || "Unknown institution", active: true },
      });
      await tx.cashAccount.upsert({
        where: { id: account.id },
        create: { ...data, institutionId: institution.id, nickname: account.account_name, balanceAsOf: new Date(normalizedPortfolio.updatedAt), balanceSource: args.source },
        update: { ...data, institutionId: institution.id, nickname: account.account_name, balanceAsOf: new Date(normalizedPortfolio.updatedAt), balanceSource: args.source, active: true },
      });
    }
    const retainedCashIds = normalizedPortfolio.cashAccounts.map((account) => account.id);
    await tx.cashAccount.updateMany({ where: { portfolioId: CURRENT_PORTFOLIO_ID, ...(retainedCashIds.length ? { id: { notIn: retainedCashIds } } : {}) }, data: { active: false } });

    await tx.auditLog.create({
      data: {
        portfolioId: CURRENT_PORTFOLIO_ID, entityType: "portfolio", entityId: CURRENT_PORTFOLIO_ID,
        action: previousState ? "UPDATE" : "CREATE", beforeJson: previousState ? JSON.stringify(previousState) : null,
        afterJson: JSON.stringify(normalizedPortfolio), source: args.source,
      },
    });

    await tx.activitySnapshot.create({
      data: {
        ...activitySnapshotToDb(snapshot),
        importArtifact: args.screenshotArtifact
          ? {
              create: screenshotImportArtifactToDb({
                ...args.screenshotArtifact,
              }),
            }
          : undefined,
      },
    });
    if (events.length > 0) {
      await tx.activityEvent.createMany({
        data: events.map(activityEventToDb),
      });
    }
  });

  return loadPortfolioBundle();
}
