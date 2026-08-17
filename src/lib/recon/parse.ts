import { parseCsv } from "../clients/csv.ts";
import {
  isLikelyGstin,
  normalizeAmount,
  normalizeDate,
  normalizeGstin,
} from "./normalize.ts";
import type { PurchaseRecord, PurchaseSide } from "./types.ts";

// Two input shapes per side, no configuration:
//  - GSTR-2B: the portal's own JSON download (docdata.b2b[]), or a CSV export.
//  - Books:   any CSV with headers — Tally, Zoho, Excel. Columns are found by
//    header name first, and by looking at the data itself when headers are
//    unhelpful, because "Dump.csv" with headers like "Col3" is a real thing
//    accountants send each other.

export type ParseOutcome = {
  records: PurchaseRecord[];
  /** Rows skipped and why, so nothing vanishes silently. */
  skipped: { row: number; reason: string }[];
  sourceLabel: string;
};

/* ── GSTR-2B JSON ───────────────────────────────────────────────────────── */

type TwoBInvoice = {
  inum?: string; dt?: string; val?: number; txval?: number;
  igst?: number; cgst?: number; sgst?: number; cess?: number;
};
type TwoBSupplier = { ctin?: string; trdnm?: string; inv?: TwoBInvoice[] };

export function parseGstr2bJson(text: string): ParseOutcome | null {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }
  // The portal wraps the document in {data: {...}}; tolerate both.
  const root = (payload as { data?: unknown })?.data ?? payload;
  const docdata = (root as { docdata?: { b2b?: TwoBSupplier[] } })?.docdata;
  const suppliers = docdata?.b2b;
  if (!Array.isArray(suppliers)) return null;

  const records: PurchaseRecord[] = [];
  const skipped: ParseOutcome["skipped"] = [];
  let row = 0;
  for (const supplier of suppliers) {
    const gstin = normalizeGstin(String(supplier.ctin ?? ""));
    for (const invoice of supplier.inv ?? []) {
      row += 1;
      if (!gstin || !invoice.inum) {
        skipped.push({ row, reason: "Missing GSTIN or invoice number" });
        continue;
      }
      const igst = invoice.igst ?? 0;
      const cgst = invoice.cgst ?? 0;
      const sgst = invoice.sgst ?? 0;
      const cess = invoice.cess ?? 0;
      records.push({
        gstin,
        supplierName: String(supplier.trdnm ?? ""),
        invoiceNo: String(invoice.inum),
        invoiceDate: invoice.dt ? normalizeDate(String(invoice.dt)) : null,
        taxableValue: normalizeAmount(invoice.txval ?? null),
        invoiceValue: normalizeAmount(invoice.val ?? null),
        totalTax: igst || cgst || sgst || cess ? igst + cgst + sgst + cess : null,
        side: "gstr2b",
        row,
      });
    }
  }
  return { records, skipped, sourceLabel: "GSTR-2B (portal JSON)" };
}

/* ── CSV, either side ───────────────────────────────────────────────────── */

const HEADER_HINTS: Record<string, RegExp> = {
  gstin: /gstin|gst\s*no|gst\s*number|ctin/i,
  supplier: /supplier|party|trade|vendor|name\s*of/i,
  invoiceNo: /inv(oice)?\s*(no|num|number|#)|bill\s*no|voucher\s*no|document\s*no/i,
  invoiceDate: /date/i,
  taxable: /taxable/i,
  total: /invoice\s*value|total|gross|amount/i,
};

function findColumn(headers: string[], hint: RegExp, exclude: number[] = []): number {
  return headers.findIndex((header, index) => !exclude.includes(index) && hint.test(header));
}

export function parsePurchaseCsv(text: string, side: PurchaseSide): ParseOutcome {
  const rows = parseCsv(text);
  if (!rows.length) return { records: [], skipped: [], sourceLabel: "empty file" };

  const headers = (rows[0] ?? []).map((cell) => cell.trim());
  let gstinCol = findColumn(headers, HEADER_HINTS.gstin!);
  const invoiceCol = findColumn(headers, HEADER_HINTS.invoiceNo!);
  const dateCol = findColumn(headers, HEADER_HINTS.invoiceDate!);
  const taxableCol = findColumn(headers, HEADER_HINTS.taxable!);
  const totalCol = findColumn(headers, HEADER_HINTS.total!, [taxableCol]);
  const supplierCol = findColumn(headers, HEADER_HINTS.supplier!);

  // Headerless or headers like "Col3": find the GSTIN column by its content.
  const body = gstinCol === -1 && invoiceCol === -1 ? rows : rows.slice(1);
  if (gstinCol === -1) {
    const probe = body.slice(0, 20);
    const width = Math.max(...probe.map((cells) => cells.length));
    for (let column = 0; column < width; column += 1) {
      const hits = probe.filter((cells) => isLikelyGstin(cells[column] ?? "")).length;
      if (hits >= Math.max(2, probe.length / 2)) {
        gstinCol = column;
        break;
      }
    }
  }

  const records: PurchaseRecord[] = [];
  const skipped: ParseOutcome["skipped"] = [];
  body.forEach((cells, index) => {
    const rowNumber = index + (body === rows ? 1 : 2);
    const gstin = gstinCol >= 0 ? normalizeGstin(cells[gstinCol] ?? "") : "";
    if (!gstin || !isLikelyGstin(gstin)) {
      skipped.push({ row: rowNumber, reason: "No valid GSTIN on this row" });
      return;
    }
    const invoiceNo = invoiceCol >= 0 ? (cells[invoiceCol] ?? "").trim() : "";
    if (!invoiceNo) {
      skipped.push({ row: rowNumber, reason: "No invoice number" });
      return;
    }
    records.push({
      gstin,
      supplierName: supplierCol >= 0 ? (cells[supplierCol] ?? "").trim() : "",
      invoiceNo,
      invoiceDate: dateCol >= 0 ? normalizeDate(cells[dateCol] ?? "") : null,
      taxableValue: taxableCol >= 0 ? normalizeAmount(cells[taxableCol]) : null,
      invoiceValue: totalCol >= 0 ? normalizeAmount(cells[totalCol]) : null,
      totalTax: null,
      side,
      row: rowNumber,
    });
  });

  return {
    records,
    skipped,
    sourceLabel: side === "gstr2b" ? "GSTR-2B (CSV)" : "Purchase register (CSV)",
  };
}

/** One entry point per side; 2B accepts the portal JSON or a CSV. */
export function parseSide(text: string, side: PurchaseSide): ParseOutcome {
  if (side === "gstr2b") {
    const asJson = parseGstr2bJson(text);
    if (asJson) return asJson;
  }
  return parsePurchaseCsv(text, side);
}
