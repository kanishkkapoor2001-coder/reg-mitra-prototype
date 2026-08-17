import {
  daysBetween,
  invoiceNumericTail,
  normalizeInvoiceNo,
} from "./normalize.ts";
import type { MatchedPair, PurchaseRecord, ReconResult, ReconSummary } from "./types.ts";

// The matching ladder, strictest first:
//   1. same GSTIN + same canonical invoice number  -> matched / value_mismatch
//   2. same GSTIN + same numeric tail + close date and amount -> probable_match
//   3. same GSTIN + same amount within tolerance + date within 5 days,
//      unique on both sides                        -> probable_match
// Everything left is genuinely one-sided. Probables are never silently
// upgraded: the CA confirms them, which is the whole trust model.

/** Amounts equal within ₹1 or 0.1%, whichever is larger — rounding, not fraud. */
function amountsClose(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return true; // absent is not a mismatch
  const tolerance = Math.max(1, Math.abs(a) * 0.001);
  return Math.abs(a - b) <= tolerance;
}

function amountFor(record: PurchaseRecord): number | null {
  return record.taxableValue ?? record.invoiceValue;
}

function valueNote(twoB: PurchaseRecord, books: PurchaseRecord): string {
  const a = amountFor(twoB);
  const b = amountFor(books);
  if (a === null || b === null) return "Amount missing on one side.";
  const diff = Math.abs(a - b);
  return `Taxable value differs by ₹${diff.toLocaleString("en-IN", { maximumFractionDigits: 2 })} (2B ₹${a.toLocaleString("en-IN")} vs books ₹${b.toLocaleString("en-IN")}).`;
}

export function reconcile(gstr2b: PurchaseRecord[], books: PurchaseRecord[]): ReconResult {
  const pairs: MatchedPair[] = [];
  const usedBooks = new Set<PurchaseRecord>();

  // Pass 1: exact canonical key.
  const booksByKey = new Map<string, PurchaseRecord[]>();
  for (const record of books) {
    const key = `${record.gstin}|${normalizeInvoiceNo(record.invoiceNo)}`;
    const bucket = booksByKey.get(key);
    if (bucket) bucket.push(record);
    else booksByKey.set(key, [record]);
  }

  const unmatched2b: PurchaseRecord[] = [];
  for (const record of gstr2b) {
    const key = `${record.gstin}|${normalizeInvoiceNo(record.invoiceNo)}`;
    const candidate = (booksByKey.get(key) ?? []).find((entry) => !usedBooks.has(entry));
    if (!candidate) {
      unmatched2b.push(record);
      continue;
    }
    usedBooks.add(candidate);
    if (amountsClose(amountFor(record), amountFor(candidate))) {
      pairs.push({ status: "matched", gstr2b: record, books: candidate, note: "" });
    } else {
      pairs.push({ status: "value_mismatch", gstr2b: record, books: candidate, note: valueNote(record, candidate) });
    }
  }

  // Pass 2: numeric tail within the same supplier — "INV-041" vs "41".
  const remainingBooks = () => books.filter((record) => !usedBooks.has(record));
  const stillUnmatched: PurchaseRecord[] = [];
  for (const record of unmatched2b) {
    const tail = invoiceNumericTail(record.invoiceNo);
    const candidates = remainingBooks().filter((entry) =>
      entry.gstin === record.gstin
      && tail !== null
      && invoiceNumericTail(entry.invoiceNo) === tail
      && amountsClose(amountFor(record), amountFor(entry))
      && (!record.invoiceDate || !entry.invoiceDate || daysBetween(record.invoiceDate, entry.invoiceDate) <= 5),
    );
    const tailHit = candidates.length === 1 ? candidates[0] : undefined;
    if (tailHit) {
      usedBooks.add(tailHit);
      pairs.push({
        status: "probable_match",
        gstr2b: record,
        books: tailHit,
        note: `Invoice numbers differ in form ("${record.invoiceNo}" vs "${tailHit.invoiceNo}") but supplier, amount and date line up. Confirm before relying.`,
      });
    } else {
      stillUnmatched.push(record);
    }
  }

  // Pass 3: same supplier, same amount, close date — both sides unique.
  for (const record of stillUnmatched.slice()) {
    const candidates = remainingBooks().filter((entry) =>
      entry.gstin === record.gstin
      && amountFor(entry) !== null
      && amountFor(record) !== null
      && amountsClose(amountFor(record), amountFor(entry))
      && record.invoiceDate !== null
      && entry.invoiceDate !== null
      && daysBetween(record.invoiceDate, entry.invoiceDate) <= 5,
    );
    const competing = stillUnmatched.filter((other) =>
      other.gstin === record.gstin && amountsClose(amountFor(other), amountFor(record)),
    );
    const amountHit = candidates.length === 1 && competing.length === 1 ? candidates[0] : undefined;
    if (amountHit) {
      usedBooks.add(amountHit);
      stillUnmatched.splice(stillUnmatched.indexOf(record), 1);
      pairs.push({
        status: "probable_match",
        gstr2b: record,
        books: amountHit,
        note: `Same supplier, same amount, dates ${record.invoiceDate} / ${amountHit.invoiceDate} — but invoice numbers do not correspond ("${record.invoiceNo}" vs "${amountHit.invoiceNo}"). Confirm before relying.`,
      });
    }
  }

  for (const record of stillUnmatched) {
    pairs.push({
      status: "missing_in_books",
      gstr2b: record,
      books: null,
      note: "Supplier has filed this invoice; nothing corresponding is booked. Possible unclaimed ITC, or a purchase recorded under another name.",
    });
  }
  for (const record of books.filter((entry) => !usedBooks.has(entry))) {
    pairs.push({
      status: "missing_in_2b",
      gstr2b: null,
      books: record,
      note: "Booked, but the supplier has not filed it in this 2B period. ITC on this line is at risk until it appears.",
    });
  }

  const summary: ReconSummary = {
    total2b: gstr2b.length,
    totalBooks: books.length,
    matched: pairs.filter((pair) => pair.status === "matched").length,
    valueMismatch: pairs.filter((pair) => pair.status === "value_mismatch").length,
    probable: pairs.filter((pair) => pair.status === "probable_match").length,
    missingInBooks: pairs.filter((pair) => pair.status === "missing_in_books").length,
    missingIn2b: pairs.filter((pair) => pair.status === "missing_in_2b").length,
    unbookedTaxable: pairs
      .filter((pair) => pair.status === "missing_in_books")
      .reduce((total, pair) => total + (amountFor(pair.gstr2b!) ?? 0), 0),
    unfiledTaxable: pairs
      .filter((pair) => pair.status === "missing_in_2b")
      .reduce((total, pair) => total + (amountFor(pair.books!) ?? 0), 0),
  };

  return { pairs, summary };
}
