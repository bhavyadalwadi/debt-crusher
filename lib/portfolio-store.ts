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
      cashAccounts: true,
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
      cashAccounts: true,
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

    await tx.creditAccount.deleteMany({
      where: { portfolioId: CURRENT_PORTFOLIO_ID },
    });
    if (normalizedPortfolio.creditAccounts.length > 0) {
      await tx.creditAccount.createMany({
        data: normalizedPortfolio.creditAccounts.map((account, index) =>
          creditAccountToDb(account, index),
        ),
      });
    }

    await tx.cashAccount.deleteMany({
      where: { portfolioId: CURRENT_PORTFOLIO_ID },
    });
    if (normalizedPortfolio.cashAccounts.length > 0) {
      await tx.cashAccount.createMany({
        data: normalizedPortfolio.cashAccounts.map((account, index) =>
          cashAccountToDb(account, index),
        ),
      });
    }

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
