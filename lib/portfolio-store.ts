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
import type {
  ActivitySnapshot,
  NormalizedPortfolioBackup,
  PortfolioState,
  ScreenshotImportExtraction,
} from "@/lib/types";

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

type PortfolioTransaction = Prisma.TransactionClient;

async function replaceCurrentPortfolio(
  tx: PortfolioTransaction,
  portfolio: PortfolioState,
  existingUpdatedAt?: Date | null,
  source = "autosave",
) {
  const normalizedPortfolio = normalizePortfolioInput(portfolio);
  const { updatedAt: _ignoredUpdatedAt, ...portfolioData } =
    portfolioStateToDb(normalizedPortfolio);
  const nextUpdatedAt = new Date(
    Math.max(Date.now(), (existingUpdatedAt?.getTime() ?? 0) + 1),
  );

  await tx.portfolio.upsert({
    where: { id: CURRENT_PORTFOLIO_ID },
    update: { ...portfolioData, updatedAt: nextUpdatedAt },
    create: { ...portfolioData, updatedAt: nextUpdatedAt },
  });

  await replacePortfolioAccounts(tx, normalizedPortfolio, source);

  return normalizedPortfolio;
}

async function replacePortfolioAccounts(
  tx: PortfolioTransaction,
  portfolio: PortfolioState,
  source: string,
) {
  for (const [index, account] of portfolio.creditAccounts.entries()) {
    const data = creditAccountToDb(account, index);
    await tx.creditAccount.upsert({
      where: { id: account.id },
      create: data,
      update: data,
    });

    const canonicalName =
      account.institution.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      "unknown";
    const institution = await tx.financialInstitution.upsert({
      where: {
        portfolioId_canonicalName: {
          portfolioId: CURRENT_PORTFOLIO_ID,
          canonicalName,
        },
      },
      create: {
        portfolioId: CURRENT_PORTFOLIO_ID,
        canonicalName,
        displayName: account.institution || "Unknown institution",
      },
      update: {
        displayName: account.institution || "Unknown institution",
        active: true,
      },
    });
    await tx.creditCard.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        portfolioId: CURRENT_PORTFOLIO_ID,
        institutionId: institution.id,
        issuerName: account.institution,
        nickname: account.nickname,
        currentBalance: account.current_balance,
        minimumPaymentDue: account.min_payment,
        creditLimit: account.credit_limit,
        purchaseApr: account.apr_percent,
        paymentDueDay: account.payment_due
          ? new Date(`${account.payment_due}T00:00:00Z`).getUTCDate()
          : null,
        balanceAsOf: new Date(portfolio.updatedAt),
        balanceSource: source,
        position: index,
        notes:
          account.interest_fees_this_month > 0
            ? `Legacy combined interest/fees value: ${account.interest_fees_this_month}`
            : null,
      },
      update: {
        institutionId: institution.id,
        issuerName: account.institution,
        nickname: account.nickname,
        status: "ACTIVE",
        currentBalance: account.current_balance,
        minimumPaymentDue: account.min_payment,
        creditLimit: account.credit_limit,
        purchaseApr: account.apr_percent,
        paymentDueDay: account.payment_due
          ? new Date(`${account.payment_due}T00:00:00Z`).getUTCDate()
          : null,
        balanceAsOf: new Date(portfolio.updatedAt),
        balanceSource: source,
        position: index,
      },
    });

    const autopayText =
      typeof account.auto_payment === "string"
        ? account.auto_payment.toLowerCase()
        : "";
    const mode = autopayText.includes("statement balance")
      ? "STATEMENT_BALANCE"
      : autopayText.includes("minimum")
        ? "MINIMUM_PAYMENT"
        : autopayText.includes("disabled") || autopayText.includes("none")
          ? "DISABLED"
          : "UNKNOWN";
    await tx.autopayRule.upsert({
      where: { creditCardId: account.id },
      create: {
        creditCardId: account.id,
        mode,
        active: mode !== "DISABLED",
        notes:
          account.auto_payment == null ? null : String(account.auto_payment),
      },
      update: {
        mode,
        active: mode !== "DISABLED",
        notes:
          account.auto_payment == null ? null : String(account.auto_payment),
      },
    });

    if (account.promo_flag && account.promo_end_date) {
      const existingPromo = await tx.promotionalOffer.findFirst({
        where: { creditCardId: account.id },
        orderBy: { createdAt: "asc" },
      });
      if (!existingPromo) {
        await tx.promotionalOffer.create({
          data: {
            creditCardId: account.id,
            type: "UNKNOWN",
            endDate: new Date(account.promo_end_date),
            notes:
              "Migrated from legacy single-promo fields; balance and terms require confirmation.",
          },
        });
      }
    }
  }

  const retainedCreditIds = portfolio.creditAccounts.map(
    (account) => account.id,
  );
  await tx.creditAccount.deleteMany({
    where: {
      portfolioId: CURRENT_PORTFOLIO_ID,
      ...(retainedCreditIds.length
        ? { id: { notIn: retainedCreditIds } }
        : {}),
    },
  });
  await tx.creditCard.updateMany({
    where: {
      portfolioId: CURRENT_PORTFOLIO_ID,
      ...(retainedCreditIds.length
        ? { id: { notIn: retainedCreditIds } }
        : {}),
    },
    data: { status: "CLOSED" },
  });

  for (const [index, account] of portfolio.cashAccounts.entries()) {
    const data = cashAccountToDb(account, index);
    const canonicalName =
      account.institution.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      "unknown";
    const institution = await tx.financialInstitution.upsert({
      where: {
        portfolioId_canonicalName: {
          portfolioId: CURRENT_PORTFOLIO_ID,
          canonicalName,
        },
      },
      create: {
        portfolioId: CURRENT_PORTFOLIO_ID,
        canonicalName,
        displayName: account.institution || "Unknown institution",
      },
      update: {
        displayName: account.institution || "Unknown institution",
        active: true,
      },
    });
    await tx.cashAccount.upsert({
      where: { id: account.id },
      create: {
        ...data,
        institutionId: institution.id,
        nickname: account.account_name,
        balanceAsOf: new Date(portfolio.updatedAt),
        balanceSource: source,
      },
      update: {
        ...data,
        institutionId: institution.id,
        nickname: account.account_name,
        balanceAsOf: new Date(portfolio.updatedAt),
        balanceSource: source,
        active: true,
      },
    });
  }
  const retainedCashIds = portfolio.cashAccounts.map((account) => account.id);
  await tx.cashAccount.updateMany({
    where: {
      portfolioId: CURRENT_PORTFOLIO_ID,
      ...(retainedCashIds.length ? { id: { notIn: retainedCashIds } } : {}),
    },
    data: { active: false },
  });
}

function snapshotToPortfolioState(snapshot: ActivitySnapshot): PortfolioState {
  return {
    id: CURRENT_PORTFOLIO_ID,
    updatedAt: snapshot.importedAt,
    setup: snapshot.setup,
    creditAccounts: snapshot.creditAccounts,
    cashAccounts: snapshot.cashAccounts,
  };
}

function checkpointComparable(portfolio: PortfolioState) {
  return {
    setup: portfolio.setup,
    creditAccounts: portfolio.creditAccounts.map((account) => ({
      id: account.id,
      institution: account.institution,
      nickname: account.nickname,
      account_type: account.account_type,
      current_balance: account.current_balance,
      credit_limit: account.credit_limit,
      apr_percent: account.apr_percent,
      promo_flag: account.promo_flag,
      promo_end_date: account.promo_end_date,
      min_payment: account.min_payment,
      interest_fees_this_month: account.interest_fees_this_month,
      auto_payment: account.auto_payment,
      payment_due: account.payment_due,
      how_are_we_taking_care_of_it: account.how_are_we_taking_care_of_it,
      rewards_available: account.rewards_available,
      points_available: account.points_available,
    })),
    cashAccounts: portfolio.cashAccounts.map((account) => ({
      id: account.id,
      institution: account.institution,
      account_name: account.account_name,
      type: account.type,
      current_balance: account.current_balance,
      min_day_end_balance_required: account.min_day_end_balance_required,
    })),
  };
}

export function portfoliosMatchCheckpoint(
  previous: PortfolioState,
  current: PortfolioState,
) {
  return JSON.stringify(checkpointComparable(previous)) ===
    JSON.stringify(checkpointComparable(current));
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
      persistenceVersion: null,
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
    persistenceVersion: state.updatedAt,
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

export type SaveCurrentPortfolioResult =
  | { ok: true; bundle: Awaited<ReturnType<typeof loadPortfolioBundle>> }
  | { ok: false; bundle: Awaited<ReturnType<typeof loadPortfolioBundle>> };

/**
 * Persist the working portfolio without recording financial history. The
 * expected version makes debounced autosaves safe when requests finish out of
 * order or multiple tabs edit the same portfolio.
 */
export async function saveCurrentPortfolio(args: {
  portfolio: PortfolioState;
  expectedUpdatedAt: string | null;
}): Promise<SaveCurrentPortfolioResult> {
  let saved: boolean;
  try {
    saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.portfolio.findUnique({
        where: { id: CURRENT_PORTFOLIO_ID },
        select: { updatedAt: true },
      });
      const actualVersion = existing?.updatedAt.toISOString() ?? null;

      if (actualVersion !== args.expectedUpdatedAt) {
        return false;
      }

      const normalizedPortfolio = normalizePortfolioInput(args.portfolio);
      if (existing) {
        const { updatedAt: _ignoredUpdatedAt, ...portfolioData } =
          portfolioStateToDb(normalizedPortfolio);
        const nextUpdatedAt = new Date(
          Math.max(Date.now(), existing.updatedAt.getTime() + 1),
        );
        const updated = await tx.portfolio.updateMany({
          where: {
            id: CURRENT_PORTFOLIO_ID,
            updatedAt: existing.updatedAt,
          },
          data: { ...portfolioData, updatedAt: nextUpdatedAt },
        });
        if (updated.count !== 1) {
          return false;
        }
        await replacePortfolioAccounts(tx, normalizedPortfolio, "autosave");
      } else {
        await replaceCurrentPortfolio(tx, normalizedPortfolio);
      }
      return true;
    });
  } catch (error) {
    // Two concurrent first saves can both observe no Portfolio row. The unique
    // id turns the loser into the same recoverable version conflict as an
    // update race.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      saved = false;
    } else {
      throw error;
    }
  }
  const bundle = await loadPortfolioBundle();
  return saved ? { ok: true, bundle } : { ok: false, bundle };
}

export type PortfolioHistoryRange = "30d" | "90d" | "1y" | "all";

export async function loadPortfolioHistory(range: PortfolioHistoryRange) {
  const days = range === "30d" ? 30 : range === "90d" ? 90 : range === "1y" ? 365 : null;
  const cutoff = days === null ? undefined : new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.activitySnapshot.findMany({
    where: cutoff ? { importedAt: { gte: cutoff } } : undefined,
    orderBy: { importedAt: "desc" },
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

  // Enrichment expects newest-first; chart consumers receive chronological data.
  return enrichSnapshots(rows.map(dbRowToActivitySnapshot)).reverse();
}

export async function loadCompleteHistory() {
  const [snapshots, events] = await Promise.all([
    prisma.activitySnapshot.findMany({ orderBy: { importedAt: "desc" } }),
    prisma.activityEvent.findMany({ orderBy: { occurredAt: "desc" } }),
  ]);
  return {
    snapshots: enrichSnapshots(snapshots.map(dbRowToActivitySnapshot)),
    events: events.map(dbRowToActivityEvent),
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
  await prisma.$transaction(async (tx) => {
    const currentRecord = await tx.portfolio.findUnique({
      where: { id: CURRENT_PORTFOLIO_ID },
      include: {
        creditAccounts: true,
        cashAccounts: { where: { active: true } },
      },
    });
    const currentState = currentRecord
      ? dbRowToPortfolioState({
          portfolio: currentRecord,
          creditAccounts: currentRecord.creditAccounts,
          cashAccounts: currentRecord.cashAccounts,
        })
      : null;
    const previousSnapshotRecord = await tx.activitySnapshot.findFirst({
      orderBy: { importedAt: "desc" },
    });
    const previousActivitySnapshot = previousSnapshotRecord
      ? dbRowToActivitySnapshot(previousSnapshotRecord)
      : null;
    const previousState = previousActivitySnapshot
      ? snapshotToPortfolioState(previousActivitySnapshot)
      : null;
    if (
      args.source === "manual_save" &&
      previousState &&
      portfoliosMatchCheckpoint(previousState, normalizedPortfolio)
    ) {
      await replaceCurrentPortfolio(
        tx,
        normalizedPortfolio,
        currentRecord?.updatedAt,
        args.source,
      );
      return;
    }
    const previousComputedSnapshot = previousState
      ? buildComputedSnapshot(previousState, {
          id: "previous-checkpoint",
          label: "Previous checkpoint",
        })
      : null;
    const baseSnapshot = buildActivitySnapshot(normalizedPortfolio, args.source, {
      label: args.label,
      filename: args.filename,
    });
    const snapshot = {
      ...baseSnapshot,
      changeSummary: buildSnapshotChangeSummary(
        baseSnapshot,
        previousComputedSnapshot,
      ),
      changeDetail: buildSnapshotChangeDetail(
        baseSnapshot,
        previousComputedSnapshot,
      ),
    };
    const events = buildActivityEvents({
      snapshotId: snapshot.id,
      current: normalizedPortfolio,
      previous: previousState,
    });

    await replaceCurrentPortfolio(
      tx,
      normalizedPortfolio,
      currentRecord?.updatedAt,
      args.source,
    );
    await tx.auditLog.create({
      data: {
        portfolioId: CURRENT_PORTFOLIO_ID, entityType: "portfolio", entityId: CURRENT_PORTFOLIO_ID,
        action: currentState ? "UPDATE" : "CREATE", beforeJson: currentState ? JSON.stringify(currentState) : null,
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

/** Replace current state and restorable history as one all-or-nothing operation. */
export async function restorePortfolioBackup(
  backup: NormalizedPortfolioBackup,
) {
  await prisma.$transaction(async (tx) => {
    const currentRecord = await tx.portfolio.findUnique({
      where: { id: CURRENT_PORTFOLIO_ID },
      select: { updatedAt: true },
    });

    await tx.activityEvent.deleteMany();
    await tx.screenshotImportArtifact.deleteMany();
    await tx.activitySnapshot.deleteMany();
    await replaceCurrentPortfolio(tx, backup.portfolio, currentRecord?.updatedAt);

    for (const snapshot of [...backup.snapshots].reverse()) {
      await tx.activitySnapshot.create({
        data: activitySnapshotToDb(snapshot),
      });
    }
    if (backup.events.length > 0) {
      await tx.activityEvent.createMany({
        data: backup.events.map(activityEventToDb),
      });
    }
  });

  return loadPortfolioBundle();
}
