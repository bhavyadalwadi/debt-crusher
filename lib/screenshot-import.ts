import { createRequire } from "node:module";
import { createWorker, PSM } from "tesseract.js";
import type { ScreenshotImportExtraction } from "@/lib/types";

const require = createRequire(import.meta.url);
const engData = require("@tesseract.js-data/eng") as {
  code: string;
  gzip: boolean;
  langPath: string;
};

export interface ScreenshotBalanceCandidate {
  id: string;
  line: string;
  label: string;
  value: number;
  raw: string;
}

export interface ScreenshotImportAnalysis {
  extractedText: string;
  extraction: ScreenshotImportExtraction;
  candidates: ScreenshotBalanceCandidate[];
  warnings: string[];
}

function cleanText(text: string) {
  return text
    .replace(/[|]/g, " ")
    .replace(/[Ss](?=\d)/g, "$")
    .replace(/\u2014/g, "-")
    .replace(/\r/g, "")
    .trim();
}

function normalizeMoney(raw: string) {
  const normalized = raw.replace(/[$,\s]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function toIsoDate(raw: string) {
  const trimmed = raw.trim();
  const slashMatch = trimmed.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (slashMatch) {
    const [, mm, dd, yyyyRaw] = slashMatch;
    const yyyy =
      yyyyRaw.length === 2 ? `20${yyyyRaw.padStart(2, "0")}` : yyyyRaw;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const dashMatch = trimmed.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (dashMatch) {
    return dashMatch[0];
  }

  return null;
}

function pickInstitution(lines: string[]) {
  return (
    lines.find((line) => {
      const lower = line.toLowerCase();
      return (
        line.length >= 3 &&
        !/\$|\d{2,}/.test(line) &&
        !lower.includes("available") &&
        !lower.includes("balance") &&
        !lower.includes("account")
      );
    }) ?? null
  );
}

function pickAccountName(lines: string[]) {
  return (
    lines.find((line) => {
      const lower = line.toLowerCase();
      return (
        lower.includes("checking") ||
        lower.includes("savings") ||
        lower.includes("credit") ||
        lower.includes("visa") ||
        lower.includes("mastercard") ||
        lower.includes("ending") ||
        lower.includes("account")
      );
    }) ?? null
  );
}

function pickCandidates(text: string) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const currencyRegex = /-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\$?\d+(?:\.\d{2})/g;
  const candidates: ScreenshotBalanceCandidate[] = [];

  for (const line of lines) {
    const matches = line.match(currencyRegex);
    if (!matches) {
      continue;
    }

    for (const raw of matches) {
      const value = normalizeMoney(raw);
      if (value === null) {
        continue;
      }

      candidates.push({
        id: `${candidates.length + 1}`,
        line,
        raw,
        value,
        label: line.replace(raw, "").replace(/\s+/g, " ").trim() || "Detected amount",
      });
    }
  }

  return candidates;
}

function chooseCurrentBalance(candidates: ScreenshotBalanceCandidate[]) {
  const preferred = candidates.find((candidate) => {
    const lower = candidate.line.toLowerCase();
    return (
      lower.includes("current balance") ||
      lower.includes("statement balance") ||
      lower.includes("total balance") ||
      lower === candidate.raw.toLowerCase()
    );
  });
  if (preferred) {
    return preferred;
  }

  const genericBalance = candidates.find((candidate) =>
    candidate.line.toLowerCase().includes("balance"),
  );
  if (genericBalance) {
    return genericBalance;
  }

  return [...candidates].sort((left, right) => Math.abs(right.value) - Math.abs(left.value))[0] ?? null;
}

function chooseAvailableBalance(candidates: ScreenshotBalanceCandidate[], current: ScreenshotBalanceCandidate | null) {
  const available = candidates.find((candidate) =>
    candidate.line.toLowerCase().includes("available"),
  );
  if (available) {
    return available;
  }

  return candidates.find((candidate) => candidate.id !== current?.id) ?? null;
}

function inferKind(lines: string[], currentLine: string) {
  const haystack = `${lines.join(" ")} ${currentLine}`.toLowerCase();
  if (
    haystack.includes("credit") ||
    haystack.includes("visa") ||
    haystack.includes("mastercard") ||
    haystack.includes("minimum payment")
  ) {
    return "credit";
  }

  return "cash";
}

export async function analyzeScreenshotImport(imageData: Buffer): Promise<ScreenshotImportAnalysis> {
  const worker = await createWorker("eng", 1, {
    langPath: engData.langPath,
    gzip: engData.gzip,
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });

    const result = await worker.recognize(imageData);
    const extractedText = cleanText(result.data.text);
    const lines = extractedText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const candidates = pickCandidates(extractedText);
    const currentBalance = chooseCurrentBalance(candidates);
    const availableBalance = chooseAvailableBalance(candidates, currentBalance);
    const extraction: ScreenshotImportExtraction = {
      accountKind: inferKind(lines, currentBalance?.line ?? ""),
      institution: pickInstitution(lines),
      accountName: pickAccountName(lines),
      currentBalance: currentBalance?.value ?? 0,
      availableBalance: availableBalance?.value ?? null,
      capturedAt:
        lines
          .map((line) => toIsoDate(line))
          .find((value): value is string => Boolean(value)) ?? null,
      balanceCandidates: candidates.length,
      lowConfidence:
        (result.data.confidence ?? 0) < 55 ||
        !currentBalance ||
        candidates.length !== 1,
    };

    const warnings: string[] = [];
    if (!currentBalance) {
      warnings.push("No clear balance was detected. Review the OCR result manually.");
    }
    if (candidates.length > 1) {
      warnings.push("Multiple balance candidates were found. Pick the right amount before saving.");
    }
    if ((result.data.confidence ?? 0) < 55) {
      warnings.push("OCR confidence is low. Double-check all extracted fields.");
    }

    return {
      extractedText,
      extraction,
      candidates,
      warnings,
    };
  } finally {
    await worker.terminate();
  }
}
