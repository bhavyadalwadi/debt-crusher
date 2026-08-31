import ExcelJS from "exceljs";

export type WorkbookSheet = unknown[][];
export type WorkbookSheets = Record<string, WorkbookSheet>;

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if ("result" in value) return value.result ?? "";
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return value.text;
  return String(value);
}

export async function readWorkbookSheets(buffer: ArrayBuffer): Promise<WorkbookSheets> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheets: WorkbookSheets = {};

  workbook.eachSheet((worksheet) => {
    const rows: WorkbookSheet = [];
    const columnCount = worksheet.actualColumnCount;
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const values: unknown[] = [];
      for (let column = 1; column <= columnCount; column += 1) {
        values.push(cellValue(row.getCell(column).value));
      }
      rows.push(values);
    });
    sheets[worksheet.name] = rows;
  });

  return sheets;
}

export async function writeWorkbookSheets(sheets: WorkbookSheets): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(name);
    worksheet.addRows(rows);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as unknown as ArrayBuffer).slice().buffer;
}

export function rowsToRecords(rows: WorkbookSheet): Record<string, unknown>[] {
  const [headerRow = [], ...dataRows] = rows;
  const headers = headerRow.map((value) => String(value ?? ""));
  return dataRows
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(headers.flatMap((header, index) => header ? [[header, row[index] ?? null]] : [])));
}
