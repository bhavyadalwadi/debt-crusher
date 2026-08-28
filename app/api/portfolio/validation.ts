import { z } from "zod";

const nullableNumber = z.number().finite().nullable();
const nullableString = z.string().nullable();

const setupSchema = z.object({
  extra_payment_budget: z.number().finite(),
  promo_end_soon_days: z.number().int().nonnegative(),
  global_cash_buffer_override: nullableNumber,
  payoff_strategy: z.enum(["avalanche", "snowball", "promo-first", "custom"]),
  custom_strategy_weights: z.object({
    interest_now: z.number().finite(),
    apr_percent: z.number().finite(),
    utilization_percent: z.number().finite(),
    promo_expired: z.number().finite(),
    promo_end_soon: z.number().finite(),
    balance_size: z.number().finite(),
    due_soon: z.number().finite(),
    statement_balance_autopay_penalty: z.number().finite(),
  }).strict(),
}).strict();

const creditAccountSchema = z.object({
  id: z.string().min(1),
  institution: z.string(),
  nickname: z.string(),
  account_type: z.literal("credit_card"),
  current_balance: z.number().finite(),
  credit_limit: nullableNumber,
  apr_percent: z.number().finite(),
  promo_flag: z.boolean(),
  promo_end_date: nullableString,
  min_payment: z.number().finite(),
  interest_fees_this_month: z.number().finite(),
  auto_payment: z.union([z.string(), z.number().finite()]).nullable(),
  payment_due: nullableString,
  how_are_we_taking_care_of_it: z.string(),
  rewards_available: nullableString,
  points_available: nullableNumber,
}).strict();

const cashAccountSchema = z.object({
  id: z.string().min(1),
  institution: z.string(),
  account_name: z.string(),
  type: z.string(),
  current_balance: z.number().finite(),
  min_day_end_balance_required: z.number().finite(),
}).strict();

export const portfolioStateSchema = z.object({
  id: z.string(),
  updatedAt: z.string(),
  setup: setupSchema,
  creditAccounts: z.array(creditAccountSchema),
  cashAccounts: z.array(cashAccountSchema),
}).strict();

const persistenceVersionSchema = z.string().datetime().nullable();

export const autosaveRequestSchema = z
  .object({
    portfolio: portfolioStateSchema,
    expectedUpdatedAt: persistenceVersionSchema.optional(),
    persistenceVersion: persistenceVersionSchema.optional(),
  }).strict()
  .refine(
    (value) =>
      value.expectedUpdatedAt !== undefined || value.persistenceVersion !== undefined,
    { message: "expectedUpdatedAt or persistenceVersion is required" },
  )
  .transform((value) => ({
    portfolio: value.portfolio,
    expectedUpdatedAt:
      value.expectedUpdatedAt !== undefined
        ? value.expectedUpdatedAt
        : (value.persistenceVersion ?? null),
  }));

export const checkpointRequestSchema = z.object({
  portfolio: portfolioStateSchema,
  source: z.enum(["import", "manual_save", "screenshot_import"]),
  label: z.string().optional(),
  filename: z.string().optional(),
}).strict();
