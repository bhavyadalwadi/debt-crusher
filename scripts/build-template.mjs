import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs");
const outputPath = path.join(outputDir, "debt-crusher-import-template.xlsx");

const workbook = Workbook.create();

function addSheetTitle(sheet, title, subtitle) {
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A2").values = [[subtitle]];
}

function writeGrid(sheet, startRange, rows) {
  sheet.getRange(startRange).values = rows;
}

const setupSheet = workbook.worksheets.add("Setup");
addSheetTitle(
  setupSheet,
  "Debt Crusher Setup",
  "Keep exactly one filled data row starting at row 5. Leave headers unchanged.",
);
writeGrid(setupSheet, "A4:C6", [
  [
    "extra_payment_budget",
    "promo_end_soon_days",
    "global_cash_buffer_override",
  ],
  [600, 21, ""],
  ["Example: monthly extra payment amount", "Example: days threshold", "Optional: blank to use per-account minimums"],
]);

const creditSheet = workbook.worksheets.add("Credit_Cards");
addSheetTitle(
  creditSheet,
  "Credit Card Accounts",
  "Replace the sample rows with your real card rows. Keep the header row exactly as-is.",
);
writeGrid(creditSheet, "A4:N7", [
  [
    "institution",
    "nickname",
    "current_balance",
    "credit_limit",
    "apr_percent",
    "min_payment",
    "interest_fees_this_month",
    "auto_payment",
    "payment_due",
    "how_are_we_taking_care_of_it",
    "promo_flag",
    "promo_end_date",
    "rewards_available",
    "points_available",
  ],
  [
    "Chase",
    "Freedom",
    2400,
    5000,
    24.99,
    75,
    24.12,
    75,
    new Date("2026-05-07"),
    "Primary payoff target",
    true,
    new Date("2026-06-15"),
    "Cash back",
    18250,
  ],
  [
    "Amex",
    "Blue Cash",
    800,
    12000,
    18.99,
    35,
    0,
    35,
    new Date("2026-05-14"),
    "Autopay minimum while focusing elsewhere",
    false,
    "",
    "Statement credit",
    "",
  ],
  [
    "Use full institution name",
    "Your label for the card",
    "Currency amount",
    "Currency amount",
    "APR as percent",
    "Currency amount",
    "Currency amount",
    "Currency amount",
    "Date",
    "Free text notes",
    "TRUE/FALSE or yes/no",
    "Date or blank",
    "Optional text",
    "Optional number",
  ],
]);

const cashSheet = workbook.worksheets.add("Cash_Accounts");
addSheetTitle(
  cashSheet,
  "Cash Accounts",
  "Replace the sample rows with your real cash accounts. Keep the header row exactly as-is.",
);
writeGrid(cashSheet, "A4:E7", [
  [
    "institution",
    "account_name",
    "type",
    "current_balance",
    "min_day_end_balance_required",
  ],
  ["Ally", "Emergency Savings", "savings", 9000, 3000],
  ["Chase", "Main Checking", "checking", 3200, 1200],
  [
    "Use full institution name",
    "Your label for the account",
    "checking or savings",
    "Currency amount",
    "Currency amount",
  ],
]);

await fs.mkdir(outputDir, { recursive: true });
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);

const check = await workbook.inspect({
  kind: "table",
  range: "Setup!A4:C6",
  include: "values",
  tableMaxRows: 6,
  tableMaxCols: 6,
});

console.log(check.ndjson);
console.log(outputPath);
