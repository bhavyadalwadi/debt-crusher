export function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[%?()]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sanitizeNumberString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const negativeWrapped = /^\(.*\)$/.test(trimmed);
  const unsigned = trimmed.replace(/[,$%]/g, "").replace(/[()]/g, "");
  return negativeWrapped ? `-${unsigned}` : unsigned;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = sanitizeNumberString(value);
    if (!normalized) {
      return fallback;
    }

    const directParsed = Number(normalized);
    if (Number.isFinite(directParsed)) {
      return directParsed;
    }

    const extracted = normalized.match(/-?\d+(?:\.\d+)?/);
    const parsed = extracted ? Number(extracted[0]) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toPercentNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "string" && value.includes("%")) {
    return toNumber(value, 0);
  }

  const numeric = toNumber(value, 0);
  return Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "yes", "y", "1", "promo", "on"].includes(normalized);
  }

  return false;
}

export function toISODate(
  value: unknown,
  options?: { fallbackYear?: number },
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/(\d+)(st|nd|rd|th)/gi, "$1").trim();
    if (options?.fallbackYear && /^[a-z]{3,9}\s+\d{1,2}$/i.test(cleaned)) {
      const parsedWithYear = new Date(`${cleaned}, ${options.fallbackYear}`);
      if (!Number.isNaN(parsedWithYear.getTime())) {
        return parsedWithYear.toISOString().slice(0, 10);
      }
    }

    const parsed = new Date(cleaned);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    if (
      options?.fallbackYear &&
      /^[0-9]{1,2}\/[0-9]{1,2}$/i.test(cleaned)
    ) {
      const parsedWithYear = new Date(`${cleaned}/${options.fallbackYear}`);
      if (!Number.isNaN(parsedWithYear.getTime())) {
        return parsedWithYear.toISOString().slice(0, 10);
      }
    }

    if (
      options?.fallbackYear &&
      /^[0-9]{1,2}-[0-9]{1,2}$/i.test(cleaned)
    ) {
      const parsedWithYear = new Date(`${cleaned}-${options.fallbackYear}`);
      if (!Number.isNaN(parsedWithYear.getTime())) {
        return parsedWithYear.toISOString().slice(0, 10);
      }
    }

  }

  return null;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
