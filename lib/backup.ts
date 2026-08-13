import type {
  ActivityEvent,
  ActivitySnapshot,
  NormalizedPortfolioBackup,
  PortfolioBackupV2,
  PortfolioState,
} from "@/lib/types";

export const BACKUP_FORMAT_VERSION = 2 as const;

const snapshotSources = new Set<ActivitySnapshot["source"]>([
  "import",
  "manual_save",
  "screenshot_import",
]);
const eventKinds = new Set<ActivityEvent["kind"]>([
  "setup_changed",
  "credit_added",
  "credit_removed",
  "credit_balance_changed",
  "cash_added",
  "cash_removed",
  "cash_balance_changed",
]);
const eventEntityTypes = new Set<ActivityEvent["entityType"]>([
  "setup",
  "credit",
  "cash",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPortfolioState(value: unknown): value is PortfolioState {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.updatedAt === "string" &&
    isRecord(value.setup) &&
    typeof value.setup.extra_payment_budget === "number" &&
    typeof value.setup.promo_end_soon_days === "number" &&
    Array.isArray(value.creditAccounts) &&
    value.creditAccounts.every(isRecord) &&
    Array.isArray(value.cashAccounts) &&
    value.cashAccounts.every(isRecord)
  );
}

function isActivitySnapshot(value: unknown): value is ActivitySnapshot {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    snapshotSources.has(value.source as ActivitySnapshot["source"]) &&
    typeof value.label === "string" &&
    typeof value.filename === "string" &&
    typeof value.importedAt === "string" &&
    isRecord(value.setup) &&
    Array.isArray(value.creditAccounts) &&
    Array.isArray(value.cashAccounts) &&
    isRecord(value.dashboardSummary)
  );
}

function isActivityEvent(value: unknown): value is ActivityEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.snapshotId === "string" &&
    eventKinds.has(value.kind as ActivityEvent["kind"]) &&
    eventEntityTypes.has(value.entityType as ActivityEvent["entityType"]) &&
    typeof value.entityId === "string" &&
    typeof value.entityName === "string" &&
    (value.amountDelta === null || typeof value.amountDelta === "number") &&
    typeof value.summary === "string" &&
    typeof value.occurredAt === "string"
  );
}

function parseSource(source: unknown): unknown {
  if (typeof source !== "string") return source;

  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }
}

function validateHistory<T>(
  value: unknown,
  field: "snapshots" | "events",
  guard: (item: unknown) => item is T,
): T[] {
  if (!Array.isArray(value) || !value.every(guard)) {
    throw new Error(`Backup file contains invalid ${field}.`);
  }
  return value;
}

export function createPortfolioBackup(args: {
  portfolio: PortfolioState;
  snapshots: ActivitySnapshot[];
  events: ActivityEvent[];
  exportedAt?: string;
}): PortfolioBackupV2 {
  return {
    version: BACKUP_FORMAT_VERSION,
    exportedAt: args.exportedAt ?? new Date().toISOString(),
    portfolio: args.portfolio,
    snapshots: args.snapshots,
    events: args.events,
  };
}

/**
 * Parse either backup v2 or a legacy unversioned backup. Some historical
 * exports included snapshots without a version; preserve that history when it
 * is valid, while portfolio-only files normalize to empty history arrays.
 */
export function parsePortfolioBackup(source: unknown): NormalizedPortfolioBackup {
  const payload = parseSource(source);

  if (!isRecord(payload) || !isPortfolioState(payload.portfolio)) {
    throw new Error("Backup file does not contain a valid portfolio payload.");
  }

  if (payload.version === undefined) {
    const snapshots =
      payload.snapshots === undefined
        ? []
        : validateHistory(payload.snapshots, "snapshots", isActivitySnapshot);
    const events =
      payload.events === undefined
        ? []
        : validateHistory(payload.events, "events", isActivityEvent);

    return {
      sourceVersion: 1,
      exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : null,
      portfolio: payload.portfolio,
      snapshots,
      events,
    };
  }

  if (payload.version !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup version: ${String(payload.version)}.`);
  }
  if (typeof payload.exportedAt !== "string") {
    throw new Error("Backup file does not contain a valid export timestamp.");
  }

  return {
    sourceVersion: BACKUP_FORMAT_VERSION,
    exportedAt: payload.exportedAt,
    portfolio: payload.portfolio,
    snapshots: validateHistory(payload.snapshots, "snapshots", isActivitySnapshot),
    events: validateHistory(payload.events, "events", isActivityEvent),
  };
}
