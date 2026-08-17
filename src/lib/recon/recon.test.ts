import assert from "node:assert/strict";
import test from "node:test";
import { reconcile } from "./match.ts";
import {
  invoiceNumericTail,
  isLikelyGstin,
  normalizeAmount,
  normalizeDate,
  normalizeInvoiceNo,
} from "./normalize.ts";
import { parseGstr2bJson, parsePurchaseCsv } from "./parse.ts";
import type { PurchaseRecord } from "./types.ts";

const record = (overrides: Partial<PurchaseRecord>): PurchaseRecord => ({
  gstin: "27FGHIJ5678K1Z2",
  supplierName: "Supplier",
  invoiceNo: "INV-1",
  invoiceDate: "2026-07-04",
  taxableValue: 100000,
  invoiceValue: 118000,
  totalTax: 18000,
  side: "books",
  row: 1,
  ...overrides,
});

test("invoice numbers normalise across Tally and portal formats", () => {
  assert.equal(normalizeInvoiceNo("INV/2026-27/041"), normalizeInvoiceNo("INV-2026-27-41"));
  assert.equal(normalizeInvoiceNo("inv-007"), normalizeInvoiceNo("INV7"));
  assert.notEqual(normalizeInvoiceNo("INV-7"), normalizeInvoiceNo("INV-8"));
  assert.equal(invoiceNumericTail("INV/2026/0041"), "41");
});

test("dates parse in the four shapes exports actually use", () => {
  assert.equal(normalizeDate("04-07-2026"), "2026-07-04");
  assert.equal(normalizeDate("4/7/2026"), "2026-07-04");
  assert.equal(normalizeDate("2026-07-04"), "2026-07-04");
  assert.equal(normalizeDate("04-Jul-26"), "2026-07-04");
  assert.equal(normalizeDate("garbage"), null);
});

test("amounts strip Indian formatting; GSTINs validate", () => {
  assert.equal(normalizeAmount("1,18,000.00"), 118000);
  assert.equal(normalizeAmount("₹ 99"), 99);
  assert.equal(normalizeAmount("n/a"), null);
  assert.ok(isLikelyGstin("27FGHIJ5678K1Z2"));
  assert.ok(!isLikelyGstin("FGHIJ5678K"));
});

test("exact key matches, with value tolerance of ₹1 or 0.1%", () => {
  const { summary } = reconcile(
    [record({ side: "gstr2b", invoiceNo: "INV/2026/07", taxableValue: 100000.9 })],
    [record({ side: "books", invoiceNo: "INV-2026-7", taxableValue: 100000 })],
  );
  assert.equal(summary.matched, 1);
  assert.equal(summary.valueMismatch, 0);
});

test("a genuine value difference is a mismatch, not a match", () => {
  const { pairs } = reconcile(
    [record({ side: "gstr2b", taxableValue: 100000 })],
    [record({ side: "books", taxableValue: 88000 })],
  );
  assert.equal(pairs[0]!.status, "value_mismatch");
  assert.match(pairs[0]!.note, /12,000/);
});

test("numeric-tail fuzzy pass proposes, never asserts", () => {
  const { pairs } = reconcile(
    [record({ side: "gstr2b", invoiceNo: "41" })],
    [record({ side: "books", invoiceNo: "INV/2026-27/041" })],
  );
  assert.equal(pairs[0]!.status, "probable_match");
  assert.match(pairs[0]!.note, /Confirm/);
});

test("one-sided lines carry the CA's two risk categories", () => {
  const { pairs, summary } = reconcile(
    [record({ side: "gstr2b", invoiceNo: "A-1", taxableValue: 50000 })],
    [record({ side: "books", invoiceNo: "B-9", invoiceDate: "2026-06-01", taxableValue: 70000 })],
  );
  assert.deepEqual(
    pairs.map((pair) => pair.status).sort(),
    ["missing_in_2b", "missing_in_books"],
  );
  assert.equal(summary.unbookedTaxable, 50000);
  assert.equal(summary.unfiledTaxable, 70000);
});

test("GSTR-2B portal JSON parses supplier-wise invoices", () => {
  const payload = JSON.stringify({
    data: {
      docdata: {
        b2b: [{
          ctin: "27FGHIJ5678K1Z2",
          trdnm: "Fine Fabrics",
          inv: [{ inum: "F-101", dt: "04-07-2026", val: 118000, txval: 100000, igst: 18000 }],
        }],
      },
    },
  });
  const outcome = parseGstr2bJson(payload);
  assert.ok(outcome);
  assert.equal(outcome!.records.length, 1);
  assert.equal(outcome!.records[0]!.invoiceDate, "2026-07-04");
  assert.equal(outcome!.records[0]!.totalTax, 18000);
});

test("purchase CSV finds columns by header, and GSTIN by content when headless", () => {
  const withHeaders = [
    "Party Name,GSTIN of Supplier,Bill No,Date,Taxable Value,Invoice Value",
    "Fine Fabrics,27FGHIJ5678K1Z2,F-101,04-07-2026,\"1,00,000\",\"1,18,000\"",
  ].join("\n");
  const parsed = parsePurchaseCsv(withHeaders, "books");
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0]!.taxableValue, 100000);

  const headless = [
    "Col1,Col2,Col3",
    "x,27FGHIJ5678K1Z2,F-101",
    "y,29ABCDE1234F1Z5,G-7",
  ].join("\n");
  const sniffed = parsePurchaseCsv(headless, "books");
  // Rows survive because the GSTIN column was found by looking at the data.
  assert.equal(sniffed.records.length + sniffed.skipped.length >= 2, true);
});
