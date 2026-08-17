// Invoice-level reconciliation between GSTR-2B (what suppliers filed) and the
// purchase register (what the books say). The categories are the CA's working
// vocabulary, not ours: matched, value differs, supplier filed but not booked,
// booked but supplier has not filed.

export type PurchaseSide = "gstr2b" | "books";

export type PurchaseRecord = {
  /** Supplier GSTIN, normalised to uppercase, no spaces. */
  gstin: string;
  supplierName: string;
  /** Invoice number exactly as supplied. */
  invoiceNo: string;
  /** ISO date (yyyy-mm-dd) or null when unparseable. */
  invoiceDate: string | null;
  /** Taxable value in rupees. */
  taxableValue: number | null;
  /** Total invoice value in rupees (taxable + taxes) when known. */
  invoiceValue: number | null;
  /** Total tax (IGST + CGST + SGST + cess) when known. */
  totalTax: number | null;
  side: PurchaseSide;
  /** Row number in the uploaded file, for pointing back at the source. */
  row: number;
};

export type MatchStatus =
  | "matched"
  | "value_mismatch"
  | "probable_match"
  | "missing_in_books"
  | "missing_in_2b";

export type MatchedPair = {
  status: MatchStatus;
  gstr2b: PurchaseRecord | null;
  books: PurchaseRecord | null;
  /** Human reason for anything that is not a clean match. */
  note: string;
};

export type ReconSummary = {
  total2b: number;
  totalBooks: number;
  matched: number;
  valueMismatch: number;
  probable: number;
  missingInBooks: number;
  missingIn2b: number;
  /** Taxable value of 2B lines with no booked counterpart — ITC visibility. */
  unbookedTaxable: number;
  /** Taxable value of booked lines absent from 2B — claim-risk visibility. */
  unfiledTaxable: number;
};

export type ReconResult = {
  pairs: MatchedPair[];
  summary: ReconSummary;
};
