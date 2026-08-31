import { z } from "zod";
import {
  buildDashboardSummary,
  deriveCashAccounts,
  deriveCreditAccounts,
} from "@/lib/derived";
import {
  normalizeLabel,
  toBoolean,
  toISODate,
  toNullableNumber,
  toNumber,
  toPercentNumber,
  slugify,
} from "@/lib/normalizers";
import type {
  CashAccountInput,
  CreditCardInput,
  CustomStrategyWeights,
  ImportSnapshot,
  PayoffStrategy,
  SetupConfig,
  WorkbookImportResult,
} from "@/lib/types";
import { WORKBOOK_SHEETS } from "@/lib/workbook-contract";
import { readWorkbookSheets, rowsToRecords, type WorkbookSheet, type WorkbookSheets } from "@/lib/workbook-file";
import { createDefaultCustomStrategyWeights } from "@/lib/portfolio";

const DEFAULT_PROMO_END_SOON_DAYS = 21;

const setupSchema = z.object({
  extra_payment_budget: z.number(),
  promo_end_soon_days: z.number().int().nonnegative(),
  global_cash_buffer_override: z.number().nullable(),
  payoff_strategy: z.enum(["avalanche", "snowball", "promo-first", "custom"]),
  custom_strategy_weights: z.object({
    interest_now: z.number(),
    apr_percent: z.number(),
    utilization_percent: z.number(),
    promo_expired: z.number(),
    promo_end_soon: z.number(),
    balance_size: z.number(),
    due_soon: z.number(),
    statement_balance_autopay_penalty: z.number(),
  }),
});

function parsePayoffStrategy(value: unknown): PayoffStrategy {
  const normalized = normalizeLabel(String(value ?? ""));

  if (normalized === "snowball") {
    return "snowball";
  }

  if (
    normalized === "promofirst" ||
    normalized === "promo first" ||
    normalized === "promo-first" ||
    normalized === "promo_first"
  ) {
    return "promo-first";
  }

  if (normalized === "custom") {
    return "custom";
  }

  return "avalanche";
}

function parseCustomWeights(
  values: Record<string, unknown>,
): CustomStrategyWeights {
  const defaults = createDefaultCustomStrategyWeights();
  return {
    interest_now: toNumber(
      values.custom_interest_now_weight ??
        values["Custom Interest Now Weight"] ??
        values.interest_now_weight,
      defaults.interest_now,
    ),
    apr_percent: toNumber(
      values.custom_apr_weight ?? values["Custom APR Weight"] ?? values.apr_weight,
      defaults.apr_percent,
    ),
    utilization_percent: toNumber(
      values.custom_utilization_weight ??
        values["Custom Utilization Weight"] ??
        values.utilization_weight,
      defaults.utilization_percent,
    ),
    promo_expired: toNumber(
      values.custom_promo_expired_weight ??
        values["Custom Promo Expired Weight"] ??
        values.promo_expired_weight,
      defaults.promo_expired,
    ),
    promo_end_soon: toNumber(
      values.custom_promo_soon_weight ??
        values["Custom Promo Soon Weight"] ??
        values.promo_soon_weight,
      defaults.promo_end_soon,
    ),
    balance_size: toNumber(
      values.custom_balance_size_weight ??
        values["Custom Balance Size Weight"] ??
        values.balance_size_weight,
      defaults.balance_size,
    ),
    due_soon: toNumber(
      values.custom_due_soon_weight ??
        values["Custom Due Soon Weight"] ??
        values.due_soon_weight,
      defaults.due_soon,
    ),
    statement_balance_autopay_penalty: toNumber(
      values.custom_autopay_penalty_weight ??
        values["Custom Autopay Penalty Weight"] ??
        values.autopay_penalty_weight,
      defaults.statement_balance_autopay_penalty,
    ),
  };
}

const CREDIT_HEADER_ALIASES = {
  institution: ["institution"],
  nickname: ["nickname", "card nickname", "card"],
  current_balance: ["current balance"],
  credit_limit: ["credit limit"],
  apr_percent: ["apr", "apr percent"],
  promo_flag: ["promo flag", "0 promo y n"],
  promo_end_date: ["promo end date"],
  min_payment: ["min payment"],
  interest_fees_this_month: ["interest fees this month"],
  auto_payment: ["auto payment"],
  payment_due: ["payment due"],
  how_are_we_taking_care_of_it: [
    "how are we taking care of it",
    "how are we talking care of it",
  ],
  rewards_available: ["rewards available"],
  points_available: ["points available"],
} as const;

const CASH_HEADER_ALIASES = {
  institution: ["institution"],
  account_name: ["account name"],
  type: ["type", "type checking savings"],
  current_balance: ["current balance"],
  min_day_end_balance_required: ["min day end balance required"],
} as const;

const REQUIRED_CREDIT_FIELDS = [
  "current_balance",
  "credit_limit",
  "apr_percent",
  "interest_fees_this_month",
  "auto_payment",
  "payment_due",
] as const;

const REQUIRED_CASH_FIELDS = [
  "institution",
  "type",
  "current_balance",
  "min_day_end_balance_required",
] as const;

type CreditBaseRow = Omit<
  CreditCardInput,
  | "utilization_percent"
  | "paying_interest_now"
  | "statement_balance_autopay"
  | "promo_end_soon"
  | "priority_score"
  | "priority_rank"
  | "status_flag"
>;

type CashBaseRow = Omit<
  CashAccountInput,
  "available_above_minimum" | "status_flag"
>;

function isBlankMatrixRow(row: unknown[]): boolean {
  return row.every((value) => String(value ?? "").trim() === "");
}

function sheetRows(sheet: WorkbookSheet): unknown[][] {
  return sheet;
}

function findHeaderRowIndex(
  rows: unknown[][],
  aliases: Record<string, readonly string[]>,
): number {
  let bestIndex = 0;
  let bestScore = -1;

  rows.forEach((row, index) => {
    const normalized = row.map((value) => normalizeLabel(String(value ?? "")));
    const score = Object.values(aliases).reduce((sum, candidates) => {
      return sum + (candidates.some((candidate) => normalized.includes(candidate)) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function headerIndexMap(
  row: unknown[],
  aliases: Record<string, readonly string[]>,
): Map<string, number> {
  const normalizedRow = row.map((value) => normalizeLabel(String(value ?? "")));
  const indexes = new Map<string, number>();

  for (const [field, candidates] of Object.entries(aliases)) {
    const index = normalizedRow.findIndex((header) => candidates.includes(header));
    if (index >= 0) {
      indexes.set(field, index);
    }
  }

  return indexes;
}

function valueAtRow(
  row: unknown[],
  map: Map<string, number>,
  field: string,
): unknown {
  const index = map.get(field);
  return index === undefined ? null : row[index];
}

function parseSetupSheet(
  sheet: WorkbookSheet,
  warnings: string[],
): {
  setup: SetupConfig;
  importedAt: string;
  cashBufferDefaults: { checking: number | null; savings: number | null };
} {
  const rows = sheetRows(sheet).filter((row) => !isBlankMatrixRow(row));
  const firstRow = rows[0] ?? [];
  const normalizedFirstRow = firstRow.map((value) =>
    normalizeLabel(String(value ?? "")),
  );
  const isKeyValueLayout =
    normalizedFirstRow.includes("setting") &&
    normalizedFirstRow.includes("value");

  let extraPaymentBudget = 0;
  let promoEndSoonDays = DEFAULT_PROMO_END_SOON_DAYS;
  let globalCashBufferOverride: number | null = null;
  let payoffStrategy: PayoffStrategy = "avalanche";
  const customWeights = createDefaultCustomStrategyWeights();
  let checkingDefault: number | null = null;
  let savingsDefault: number | null = null;
  let importedAt = new Date().toISOString().slice(0, 10);

  if (isKeyValueLayout) {
    for (const row of rows.slice(1)) {
      const setting = normalizeLabel(String(row[0] ?? ""));
      const rawValue = row[1];

      if (!setting) {
        continue;
      }

      if (setting === "today") {
        importedAt = toISODate(rawValue) ?? importedAt;
      } else if (setting === "monthly extra payment budget") {
        extraPaymentBudget = toNumber(rawValue, 0);
      } else if (setting === "promo end soon days") {
        promoEndSoonDays = Math.round(
          toNumber(rawValue, DEFAULT_PROMO_END_SOON_DAYS),
        );
      } else if (setting === "global cash buffer override") {
        globalCashBufferOverride = toNullableNumber(rawValue);
      } else if (setting === "payoff strategy") {
        payoffStrategy = parsePayoffStrategy(rawValue);
      } else if (setting === "custom interest now weight") {
        customWeights.interest_now = toNumber(rawValue, customWeights.interest_now);
      } else if (setting === "custom apr weight") {
        customWeights.apr_percent = toNumber(rawValue, customWeights.apr_percent);
      } else if (setting === "custom utilization weight") {
        customWeights.utilization_percent = toNumber(
          rawValue,
          customWeights.utilization_percent,
        );
      } else if (setting === "custom promo expired weight") {
        customWeights.promo_expired = toNumber(rawValue, customWeights.promo_expired);
      } else if (setting === "custom promo soon weight") {
        customWeights.promo_end_soon = toNumber(rawValue, customWeights.promo_end_soon);
      } else if (setting === "custom balance size weight") {
        customWeights.balance_size = toNumber(rawValue, customWeights.balance_size);
      } else if (setting === "custom due soon weight") {
        customWeights.due_soon = toNumber(rawValue, customWeights.due_soon);
      } else if (setting === "custom autopay penalty weight") {
        customWeights.statement_balance_autopay_penalty = toNumber(
          rawValue,
          customWeights.statement_balance_autopay_penalty,
        );
      } else if (setting === "minimum cash buffer checking") {
        checkingDefault = toNullableNumber(rawValue);
      } else if (setting === "minimum cash buffer savings") {
        savingsDefault = toNullableNumber(rawValue);
      }
    }
  } else {
    const records = rowsToRecords(sheetRows(sheet));
    const row =
      records.find((record) =>
        Object.values(record).some((value) => String(value ?? "").trim() !== ""),
      ) ?? {};

    extraPaymentBudget = toNumber(
      row.extra_payment_budget ?? row["Monthly Extra Payment Budget"],
      0,
    );
    promoEndSoonDays = Math.round(
      toNumber(row.promo_end_soon_days, DEFAULT_PROMO_END_SOON_DAYS),
    );
    globalCashBufferOverride = toNullableNumber(row.global_cash_buffer_override);
    payoffStrategy = parsePayoffStrategy(
      row.payoff_strategy ?? row["Payoff Strategy"],
    );
    Object.assign(customWeights, parseCustomWeights(row));
  }

  if (isKeyValueLayout && promoEndSoonDays === DEFAULT_PROMO_END_SOON_DAYS) {
    warnings.push(
      `Setup is missing "Promo End Soon Days"; defaulted to ${DEFAULT_PROMO_END_SOON_DAYS}.`,
    );
  }

  return {
    setup: setupSchema.parse({
      extra_payment_budget: extraPaymentBudget,
      promo_end_soon_days: promoEndSoonDays,
      global_cash_buffer_override: globalCashBufferOverride,
      payoff_strategy: payoffStrategy,
      custom_strategy_weights: customWeights,
    }),
    importedAt,
    cashBufferDefaults: {
      checking: checkingDefault,
      savings: savingsDefault,
    },
  };
}

function parseCreditRows(
  sheet: WorkbookSheet,
  importedAt: string,
): CreditBaseRow[] {
  const rows = sheetRows(sheet);
  const headerIndex = findHeaderRowIndex(rows, CREDIT_HEADER_ALIASES);
  const fieldMap = headerIndexMap(rows[headerIndex] ?? [], CREDIT_HEADER_ALIASES);
  const referenceYear = new Date(`${importedAt}T00:00:00`).getUTCFullYear();

  return rows
    .slice(headerIndex + 1)
    .filter((row) => !isBlankMatrixRow(row))
    .filter((row) => {
      const institution = String(valueAtRow(row, fieldMap, "institution") ?? "").trim();
      const nickname = String(valueAtRow(row, fieldMap, "nickname") ?? "").trim();
      return Boolean(institution || nickname);
    })
    .map((row, index) => {
      const institution =
        String(valueAtRow(row, fieldMap, "institution") ?? "").trim() ||
        String(valueAtRow(row, fieldMap, "nickname") ?? "").trim() ||
        `Card ${index + 1}`;
      const nickname =
        String(valueAtRow(row, fieldMap, "nickname") ?? "").trim() ||
        institution;
      const rawAutoPayment = valueAtRow(row, fieldMap, "auto_payment");

      return {
        id: `${slugify(institution)}-${slugify(nickname)}-${index + 1}`,
        institution,
        nickname,
        account_type: "credit_card",
        current_balance: toNumber(valueAtRow(row, fieldMap, "current_balance"), 0),
        credit_limit: toNullableNumber(valueAtRow(row, fieldMap, "credit_limit")),
        apr_percent: toPercentNumber(valueAtRow(row, fieldMap, "apr_percent")),
        promo_flag: toBoolean(valueAtRow(row, fieldMap, "promo_flag")),
        promo_end_date: toISODate(valueAtRow(row, fieldMap, "promo_end_date"), {
          fallbackYear: referenceYear,
        }),
        min_payment: toNumber(valueAtRow(row, fieldMap, "min_payment"), 0),
        interest_fees_this_month: toNumber(
          valueAtRow(row, fieldMap, "interest_fees_this_month"),
          0,
        ),
        auto_payment:
          rawAutoPayment === null || rawAutoPayment === undefined || rawAutoPayment === ""
            ? null
            : typeof rawAutoPayment === "number"
              ? rawAutoPayment
              : String(rawAutoPayment),
        payment_due: toISODate(valueAtRow(row, fieldMap, "payment_due"), {
          fallbackYear: referenceYear,
        }),
        how_are_we_taking_care_of_it: String(
          valueAtRow(row, fieldMap, "how_are_we_taking_care_of_it") ?? "",
        ),
        rewards_available: (() => {
          const value = valueAtRow(row, fieldMap, "rewards_available");
          return value === null || value === undefined || value === ""
            ? null
            : String(value);
        })(),
        points_available: toNullableNumber(valueAtRow(row, fieldMap, "points_available")),
      };
    });
}

function parseCashRows(
  sheet: WorkbookSheet,
  cashBufferDefaults: { checking: number | null; savings: number | null },
): CashBaseRow[] {
  const rows = sheetRows(sheet);
  const headerIndex = findHeaderRowIndex(rows, CASH_HEADER_ALIASES);
  const fieldMap = headerIndexMap(rows[headerIndex] ?? [], CASH_HEADER_ALIASES);

  return rows
    .slice(headerIndex + 1)
    .filter((row) => !isBlankMatrixRow(row))
    .filter((row) => {
      const institution = String(valueAtRow(row, fieldMap, "institution") ?? "").trim();
      const accountName = String(valueAtRow(row, fieldMap, "account_name") ?? "").trim();
      return Boolean(institution || accountName);
    })
    .map((row, index) => {
      const institution = String(
        valueAtRow(row, fieldMap, "institution") ?? "Unknown Institution",
      ).trim();
      const type =
        String(valueAtRow(row, fieldMap, "type") ?? "checking").trim() ||
        "checking";
      const accountNameRaw = String(
        valueAtRow(row, fieldMap, "account_name") ?? "",
      ).trim();
      const parsedMinimum = toNullableNumber(
        valueAtRow(row, fieldMap, "min_day_end_balance_required"),
      );
      const defaultMinimum =
        normalizeLabel(type).includes("savings")
          ? cashBufferDefaults.savings
          : cashBufferDefaults.checking;

      return {
        id: `${slugify(institution || "cash")}-${slugify(
          accountNameRaw || `${type}-${index + 1}`,
        )}-${index + 1}`,
        institution: institution || "Unknown Institution",
        account_name: accountNameRaw || `${institution || "Cash"} ${type}`.trim(),
        type,
        current_balance: toNumber(valueAtRow(row, fieldMap, "current_balance"), 0),
        min_day_end_balance_required: parsedMinimum ?? defaultMinimum ?? 0,
      };
    });
}

function validateSheetHeaders(
  workbook: WorkbookSheets,
  errors: string[],
): boolean {
  let valid = true;

  for (const sheetName of Object.values(WORKBOOK_SHEETS)) {
    if (!workbook[sheetName]) {
      errors.push(`Missing required sheet: ${sheetName}`);
      valid = false;
    }
  }

  const setupSheet = workbook[WORKBOOK_SHEETS.setup];
  if (setupSheet) {
    const rows = sheetRows(setupSheet);
    const firstRow = rows[0] ?? [];
    const normalized = firstRow.map((value) => normalizeLabel(String(value ?? "")));
    const isKeyValueLayout =
      normalized.includes("setting") && normalized.includes("value");

    if (!isKeyValueLayout) {
      const records = rowsToRecords(sheetRows(setupSheet));
      const headers = new Set(
        records.flatMap((record) =>
          Object.keys(record).map((key) => normalizeLabel(key)),
        ),
      );

      if (!headers.has("extra payment budget") && !headers.has("extra_payment_budget")) {
        errors.push(
          'Setup must be either a key/value sheet with "Setting" and "Value" columns or a row-based sheet with "extra_payment_budget".',
        );
        valid = false;
      }
    }
  }

  const creditSheet = workbook[WORKBOOK_SHEETS.creditCards];
  if (creditSheet) {
    const rows = sheetRows(creditSheet);
    const headerIndex = findHeaderRowIndex(rows, CREDIT_HEADER_ALIASES);
    const fieldMap = headerIndexMap(rows[headerIndex] ?? [], CREDIT_HEADER_ALIASES);
    const missing: string[] = REQUIRED_CREDIT_FIELDS.filter(
      (field) => !fieldMap.has(field),
    );

    if (!fieldMap.has("nickname") && !fieldMap.has("institution")) {
      missing.unshift("nickname");
    }

    if (missing.length > 0) {
      errors.push(`Credit_Cards is missing required columns: ${missing.join(", ")}`);
      valid = false;
    }
  }

  const cashSheet = workbook[WORKBOOK_SHEETS.cashAccounts];
  if (cashSheet) {
    const rows = sheetRows(cashSheet);
    const headerIndex = findHeaderRowIndex(rows, CASH_HEADER_ALIASES);
    const fieldMap = headerIndexMap(rows[headerIndex] ?? [], CASH_HEADER_ALIASES);
    const missing = REQUIRED_CASH_FIELDS.filter((field) => !fieldMap.has(field));

    if (missing.length > 0) {
      errors.push(`Cash_Accounts is missing required columns: ${missing.join(", ")}`);
      valid = false;
    }
  }

  return valid;
}

export async function importWorkbook(
  file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer> },
): Promise<WorkbookImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const workbook = await readWorkbookSheets(await file.arrayBuffer());

    if (!validateSheetHeaders(workbook, errors)) {
      return { success: false, snapshot: null, errors, warnings };
    }

    const parsedSetup = parseSetupSheet(
      workbook[WORKBOOK_SHEETS.setup],
      warnings,
    );
    const setup = parsedSetup.setup;
    const importedAt = parsedSetup.importedAt;
    const creditAccounts = deriveCreditAccounts(
      parseCreditRows(workbook[WORKBOOK_SHEETS.creditCards], importedAt),
      setup,
      importedAt,
    );
    const cashAccounts = deriveCashAccounts(
      parseCashRows(
        workbook[WORKBOOK_SHEETS.cashAccounts],
        parsedSetup.cashBufferDefaults,
      ),
      setup,
    );
    const dashboardSummary = buildDashboardSummary({
      setup,
      creditAccounts,
      cashAccounts,
      importedAt,
    });

    const snapshot: ImportSnapshot = {
      id: `${file.name}-${new Date().toISOString()}`,
      source: "import",
      label: "Workbook import",
      filename: file.name,
      importedAt: new Date().toISOString(),
      setup,
      creditAccounts,
      cashAccounts,
      dashboardSummary,
    };

    return {
      success: true,
      snapshot,
      errors,
      warnings,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown workbook import error";
    return {
      success: false,
      snapshot: null,
      errors: [`Import failed: ${message}`],
      warnings,
    };
  }
}
