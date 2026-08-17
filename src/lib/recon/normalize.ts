// Normalisation is where reconciliation is won or lost. The same invoice is
// "INV/2026-27/041" in Tally and "INV2026270041" in the supplier's filing, and
// a matcher that treats those as different produces hundreds of false
// exceptions — which is why the manual Excel version of this job takes hours.

const GSTIN_PATTERN = /^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/;

export function normalizeGstin(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isLikelyGstin(value: string): boolean {
  return GSTIN_PATTERN.test(normalizeGstin(value));
}

/**
 * Canonical form of an invoice number: uppercase, split on separators, each
 * digit-run inside each segment stripped of leading zeros, segments rejoined
 * bare. So "INV/2026-27/041", "INV-2026-27-41" and "inv 2026 27 041" all key
 * as "INV20262741", and "INV/2026/07" meets "INV-2026-7". Zeros are stripped
 * per segment BEFORE segments merge — stripping after merging turns 2026/07
 * into 202607, which can never meet 2026-7's 20267.
 */
export function normalizeInvoiceNo(value: string): string {
  return value
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.replace(/\d+/g, (run) => String(Number(run))))
    .join("");
}

/** Trailing digit-run of the invoice number, for the fuzzy pass. */
export function invoiceNumericTail(value: string): string | null {
  const match = value.toUpperCase().match(/(\d+)\s*$/);
  return match ? String(Number(match[1])) : null;
}

/**
 * Dates as they actually arrive: dd-mm-yyyy and dd/mm/yyyy (GST portal and
 * Tally), yyyy-mm-dd (exports), dd-MMM-yy ("04-Jul-26", Tally's favourite).
 * Returns ISO yyyy-mm-dd or null — never a guess.
 */
const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

export function normalizeDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${match[2]!.padStart(2, "0")}-${match[3]!.padStart(2, "0")}`;

  match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return `${match[3]}-${match[2]!.padStart(2, "0")}-${match[1]!.padStart(2, "0")}`;

  match = raw.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[a-z]*[-/. ](\d{2,4})$/);
  if (match) {
    const month = MONTHS[match[2]!.toUpperCase()];
    if (!month) return null;
    const year = match[3]!.length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${month}-${match[1]!.padStart(2, "0")}`;
  }

  return null;
}

/** "1,18,000.00", "₹ 1.18 L"-free plain numbers only — invoices are exact. */
export function normalizeAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = value.replace(/[₹,\s]/g, "");
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

export function daysBetween(isoA: string, isoB: string): number {
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) / 86_400_000;
}
