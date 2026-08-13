// Spreadsheet import, without a spreadsheet library.
//
// CSV only, deliberately: Excel, Tally and Zoho all export it in two clicks,
// and an .xlsx parser is a large dependency with a long CVE history for a file
// format we would immediately flatten to rows anyway.
//
// The shape of the work: a model maps the HEADER ROW once (see
// /api/clients/import/map), and every row is then parsed here against that
// mapping, deterministically. One model call per file rather than per row —
// so a 500-client Tally export costs the same as a 5-client one, every row is
// parsed the same way, and the result can be explained afterwards.

import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition, type FactValue } from "../radar/facts.ts";

const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;

/** Where a spreadsheet column ends up. */
export type ColumnTarget =
  | "legal_name"
  | "display_name"
  | "ignore"
  | (string & { __attribute?: true });

export type ColumnMapping = Record<string, ColumnTarget>;

export type ParsedRow = {
  legalName: string;
  displayName: string;
  sector: string;
  stateCode: string;
  facts: Record<string, FactValue>;
  /** Values present in the row that could not be used, so nothing vanishes silently. */
  skipped: string[];
};

/**
 * RFC-4180-ish reader: quoted fields, escaped quotes, commas and newlines
 * inside quotes, and CRLF. Written out rather than regexed because a naive
 * split on "," corrupts exactly the rows a CA cares about — "Sharma & Co, Pvt
 * Ltd" is one field, not two.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\r") continue;
    if (char === "\n") {
      row.push(field);
      // Blank lines are separators in exports, not empty clients.
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

/**
 * Indian money as written by accountants: "4.5 Cr", "₹40,00,000", "25 lakh".
 * Returns null rather than a wrong number — a turnover is compared against
 * statutory thresholds, so a misread is worse than an absent one.
 */
export function parseIndianAmount(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/[₹,\s]/g, "");
  if (!raw) return null;

  const match = raw.match(/^([0-9]*\.?[0-9]+)(cr|crore|crores|l|lac|lakh|lakhs|k)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;

  // Deliberately unrounded. A bare "4.5" under a "T/O (Cr)" header is still to
  // be multiplied by ten million, and rounding here first turned 4.5 into 5 —
  // ₹5 crore for a firm with ₹4.5. Callers round once, after any scaling.
  switch (match[2]) {
    case "cr": case "crore": case "crores": return amount * 10_000_000;
    case "l": case "lac": case "lakh": case "lakhs": return amount * 100_000;
    case "k": return amount * 1_000;
    default: return amount;
  }
}

/**
 * The scale a column header declares, e.g. "T/O (Cr)" or "Turnover in lakhs".
 *
 * Accountants put the unit in the header and bare numbers in the cells, so a
 * turnover column reading "4.5" means ₹4.5 crore. Taken literally that is ₹4.50,
 * which is not a small error — it is the difference between a firm being over
 * an audit threshold and being nowhere near it, and nothing downstream would
 * question the number.
 */
export function headerScale(header: string): number {
  const text = header.toLowerCase();
  if (/(^|[\s(\[/_-])(cr|crore|crores)([\s)\]/_-]|$)/.test(text)) return 10_000_000;
  if (/(^|[\s(\[/_-])(l|lac|lacs|lakh|lakhs)([\s)\]/_-]|$)/.test(text)) return 100_000;
  return 1;
}

/** True when the cell states its own unit, in which case the header must not also apply. */
function cellHasUnit(cell: string): boolean {
  return /[0-9]\s*(cr|crore|crores|l|lac|lakh|lakhs|k)\b/i.test(cell.trim());
}

const TRUE_WORDS = new Set(["yes", "y", "true", "1", "registered", "applicable", "have", "has"]);
const FALSE_WORDS = new Set(["no", "n", "false", "0", "not registered", "na", "n/a", "none", "nil"]);

/** Coerces one cell to the registry's type, or returns undefined to skip it. */
function coerceCell(definition: AttributeDefinition, cell: string, scale = 1): FactValue | undefined {
  const value = cell.trim();
  if (!value) return undefined;

  switch (definition.valueType) {
    case "boolean": {
      const word = value.toLowerCase();
      if (TRUE_WORDS.has(word)) return true;
      if (FALSE_WORDS.has(word)) return false;
      return undefined;
    }
    case "number": {
      const parsed = parseIndianAmount(value);
      if (parsed === null) return undefined;
      // A unit written in the cell wins; the header's scale applies only when
      // the cell is a bare number, so "4.5 Cr" under "T/O (Cr)" is not squared.
      return Math.round(cellHasUnit(value) ? parsed : parsed * scale);
    }
    case "string_list": {
      const list = value.split(/[,;/]/)
        .map((item) => item.trim().toUpperCase().replaceAll(" ", "_"))
        .filter(Boolean)
        .filter((item) => !definition.allowedValues || definition.allowedValues.includes(item));
      return list.length ? list : undefined;
    }
    default: {
      if (!definition.allowedValues) return value;
      const upper = value.toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
      // Exact first, then a contained match: exports write "Regular Scheme"
      // where the registry says "REGULAR".
      if (definition.allowedValues.includes(upper)) return upper;
      const near = definition.allowedValues.find((allowed) => upper.includes(allowed));
      return near ?? undefined;
    }
  }
}

/** Applies a header mapping to one data row. */
export function applyMapping(
  headers: readonly string[],
  cells: readonly string[],
  mapping: ColumnMapping,
): ParsedRow {
  const result: ParsedRow = {
    legalName: "", displayName: "", sector: "", stateCode: "", facts: {}, skipped: [],
  };

  headers.forEach((header, index) => {
    const target = mapping[header];
    const cell = (cells[index] ?? "").trim();
    if (!target || target === "ignore" || !cell) return;

    if (target === "legal_name") { result.legalName = cell.slice(0, 240); return; }
    if (target === "display_name") { result.displayName = cell.slice(0, 160); return; }

    const definition = DEFINITIONS.find((candidate) => candidate.key === target);
    if (!definition) { result.skipped.push(`${header}: ${cell}`); return; }

    const coerced = coerceCell(definition, cell, headerScale(header));
    if (coerced === undefined) { result.skipped.push(`${header}: ${cell}`); return; }
    result.facts[definition.key] = coerced;

    // Sector and state also live as columns on the client row itself.
    if (definition.key === "company.sector") result.sector = String(coerced).replaceAll("_", " ");
    if (definition.key === "company.registered_state") result.stateCode = String(coerced).slice(0, 12);
  });

  // A spreadsheet usually carries one name. Use it for both rather than
  // refusing the row over a column nobody exports.
  if (!result.legalName && result.displayName) result.legalName = result.displayName;
  if (!result.displayName && result.legalName) result.displayName = result.legalName.slice(0, 160);

  return result;
}
