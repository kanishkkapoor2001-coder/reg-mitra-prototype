"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircleIcon, FileIcon, SyncIcon } from "@/components/icons";
import { reconcile } from "@/lib/recon/match";
import { parseSide, type ParseOutcome } from "@/lib/recon/parse";
import type { MatchStatus, MatchedPair, PurchaseRecord } from "@/lib/recon/types";

// GSTR-2B ↔ purchase register reconciliation, in the browser.
//
// Both files are parsed and matched locally — purchase data never leaves the
// machine, which for a CA's client ledger is not a nicety but the difference
// between usable and not. The engine (lib/recon) is pure and unit-tested; this
// component is only file handling and presentation.

const STATUS_META: Record<MatchStatus, { label: string; tone: "good" | "warn" | "bad" }> = {
  matched: { label: "Matched", tone: "good" },
  probable_match: { label: "Probable — confirm", tone: "warn" },
  value_mismatch: { label: "Value differs", tone: "bad" },
  missing_in_books: { label: "In 2B, not booked", tone: "warn" },
  missing_in_2b: { label: "Booked, not in 2B", tone: "bad" },
};

const inr = (value: number | null) =>
  value === null ? "—" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/* Sample period so the flow can be felt before any real export is at hand.
   Covers every category: clean matches, a form-variant invoice number, a value
   difference, one unbooked 2B line and one unfiled booked line. */
const SAMPLE_2B = JSON.stringify({
  data: { docdata: { b2b: [
    { ctin: "27AAACF1234A1Z5", trdnm: "Fine Fabrics Pvt Ltd", inv: [
      { inum: "FF/2026-27/041", dt: "04-07-2026", txval: 250000, igst: 45000, val: 295000 },
      { inum: "FF/2026-27/058", dt: "18-07-2026", txval: 118000, igst: 21240, val: 139240 },
    ] },
    { ctin: "29AABCT9876B1Z1", trdnm: "Techno Traders", inv: [
      { inum: "TT-882", dt: "09-07-2026", txval: 64000, cgst: 5760, sgst: 5760, val: 75520 },
      { inum: "TT-897", dt: "27-07-2026", txval: 40000, cgst: 3600, sgst: 3600, val: 47200 },
    ] },
    { ctin: "24AAHCS4321C1Z8", trdnm: "Shakti Chemicals", inv: [
      { inum: "SC/107", dt: "22-07-2026", txval: 92000, igst: 16560, val: 108560 },
    ] },
  ] } },
});

const SAMPLE_BOOKS = [
  "Party Name,GSTIN,Bill No,Date,Taxable Value,Invoice Value",
  'Fine Fabrics Pvt Ltd,27AAACF1234A1Z5,41,04-07-2026,"2,50,000","2,95,000"',
  'Fine Fabrics Pvt Ltd,27AAACF1234A1Z5,FF/2026-27/058,18-07-2026,"1,08,000","1,27,440"',
  'Techno Traders,29AABCT9876B1Z1,TT-882,09-07-2026,"64,000","75,520"',
  'Ganga Enterprises,33AADCG5678D1Z3,GE-224,15-07-2026,"55,000","64,900"',
].join("\n");

export function ReconcileExperience() {
  const [twoB, setTwoB] = useState<ParseOutcome | null>(null);
  const [books, setBooks] = useState<ParseOutcome | null>(null);
  const [filter, setFilter] = useState<MatchStatus | "all">("all");
  const [error, setError] = useState("");
  const twoBInput = useRef<HTMLInputElement>(null);
  const booksInput = useRef<HTMLInputElement>(null);

  async function readFile(file: File, side: "gstr2b" | "books") {
    setError("");
    try {
      const text = await file.text();
      const outcome = parseSide(text, side);
      if (!outcome.records.length) {
        setError(`No usable rows found in ${file.name} — check it has GSTINs and invoice numbers.`);
        return;
      }
      if (side === "gstr2b") setTwoB(outcome);
      else setBooks(outcome);
    } catch {
      setError(`${file.name} could not be read.`);
    }
  }

  function loadSample() {
    setError("");
    setTwoB(parseSide(SAMPLE_2B, "gstr2b"));
    setBooks(parseSide(SAMPLE_BOOKS, "books"));
  }

  const result = useMemo(
    () => (twoB && books ? reconcile(twoB.records, books.records) : null),
    [twoB, books],
  );

  const visible: MatchedPair[] = useMemo(() => {
    if (!result) return [];
    const pairs = filter === "all"
      ? result.pairs.filter((pair) => pair.status !== "matched")
      : result.pairs.filter((pair) => pair.status === filter);
    return pairs;
  }, [result, filter]);

  function exportExceptions() {
    if (!result) return;
    const lines = [
      "Status,Supplier,GSTIN,Invoice (2B),Invoice (books),Date (2B),Date (books),Taxable (2B),Taxable (books),Note",
      ...result.pairs
        .filter((pair) => pair.status !== "matched")
        .map((pair) => {
          const cell = (value: string | number | null | undefined) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;
          const anyRecord = (pair.gstr2b ?? pair.books) as PurchaseRecord;
          return [
            STATUS_META[pair.status].label,
            anyRecord.supplierName,
            anyRecord.gstin,
            pair.gstr2b?.invoiceNo,
            pair.books?.invoiceNo,
            pair.gstr2b?.invoiceDate,
            pair.books?.invoiceDate,
            pair.gstr2b?.taxableValue,
            pair.books?.taxableValue,
            pair.note,
          ].map(cell).join(",");
        }),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reconciliation-exceptions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const filters: { key: MatchStatus | "all"; label: string; count: number }[] = result
    ? [
      { key: "all", label: "All exceptions", count: result.pairs.length - result.summary.matched },
      { key: "value_mismatch", label: "Value differs", count: result.summary.valueMismatch },
      { key: "missing_in_books", label: "In 2B, not booked", count: result.summary.missingInBooks },
      { key: "missing_in_2b", label: "Booked, not in 2B", count: result.summary.missingIn2b },
      { key: "probable_match", label: "Probable", count: result.summary.probable },
      { key: "matched", label: "Matched", count: result.summary.matched },
    ]
    : [];

  return (
    <>
      <div className="recon-uploads">
        <button className="recon-drop" onClick={() => twoBInput.current?.click()} type="button">
          <FileIcon />
          <strong>{twoB ? twoB.sourceLabel : "GSTR-2B"}</strong>
          <span>
            {twoB
              ? `${twoB.records.length} invoices${twoB.skipped.length ? ` · ${twoB.skipped.length} rows skipped` : ""}`
              : "Portal JSON download, or a CSV"}
          </span>
          {twoB ? <em className="recon-loaded"><CheckCircleIcon /> Loaded</em> : null}
        </button>
        <input
          accept=".json,.csv,application/json,text/csv"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file, "gstr2b");
            event.target.value = "";
          }}
          ref={twoBInput}
          type="file"
          aria-label="Upload GSTR-2B"
        />

        <button className="recon-drop" onClick={() => booksInput.current?.click()} type="button">
          <FileIcon />
          <strong>{books ? "Purchase register" : "Purchase register"}</strong>
          <span>
            {books
              ? `${books.records.length} invoices${books.skipped.length ? ` · ${books.skipped.length} rows skipped` : ""}`
              : "CSV from Tally, Zoho or Excel"}
          </span>
          {books ? <em className="recon-loaded"><CheckCircleIcon /> Loaded</em> : null}
        </button>
        <input
          accept=".csv,text/csv"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file, "books");
            event.target.value = "";
          }}
          ref={booksInput}
          type="file"
          aria-label="Upload purchase register"
        />
      </div>

      <p className="recon-privacy">
        Both files are read and matched in this browser. Nothing is uploaded, and nothing is saved
        when you leave.{" "}
        <button className="text-link" onClick={loadSample} type="button">
          Try it with sample data
        </button>
      </p>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {result ? (
        <>
          <section className="recon-summary" aria-label="Reconciliation result">
            <div className="recon-headline">
              <CheckCircleIcon />
              <p>
                <strong>{result.summary.matched} of {result.summary.total2b}</strong> supplier
                invoices matched the books.
                {result.summary.unbookedTaxable > 0 ? (
                  <> Unbooked 2B lines carry <strong>{inr(result.summary.unbookedTaxable)}</strong> of taxable value.</>
                ) : null}
                {result.summary.unfiledTaxable > 0 ? (
                  <> Booked lines worth <strong>{inr(result.summary.unfiledTaxable)}</strong> are not in 2B — ITC at risk.</>
                ) : null}
              </p>
              <button className="button" onClick={exportExceptions} type="button">
                Export exceptions CSV
              </button>
            </div>
            <div className="recon-filters" role="tablist" aria-label="Filter results">
              {filters.map((entry) => (
                <button
                  aria-pressed={filter === entry.key}
                  className={`recon-filter ${filter === entry.key ? "active" : ""}`}
                  key={entry.key}
                  onClick={() => setFilter(entry.key)}
                  type="button"
                >
                  {entry.label} <span>{entry.count}</span>
                </button>
              ))}
            </div>
          </section>

          {visible.length ? (
            <div className="recon-table-wrap">
              <table className="recon-table">
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Invoice</th>
                    <th scope="col">Date</th>
                    <th scope="col">Taxable (2B)</th>
                    <th scope="col">Taxable (books)</th>
                    <th scope="col">What to check</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((pair, index) => {
                    const meta = STATUS_META[pair.status];
                    const anyRecord = (pair.gstr2b ?? pair.books) as PurchaseRecord;
                    return (
                      <tr key={`${anyRecord.gstin}-${anyRecord.invoiceNo}-${index}`}>
                        <td><span className={`recon-status is-${meta.tone}`}>{meta.label}</span></td>
                        <td>
                          <strong>{anyRecord.supplierName || "—"}</strong>
                          <small>{anyRecord.gstin}</small>
                        </td>
                        <td>
                          {pair.gstr2b?.invoiceNo ?? "—"}
                          {pair.books && pair.books.invoiceNo !== pair.gstr2b?.invoiceNo
                            ? <small>books: {pair.books.invoiceNo}</small>
                            : null}
                        </td>
                        <td>{pair.gstr2b?.invoiceDate ?? pair.books?.invoiceDate ?? "—"}</td>
                        <td className="recon-amount">{inr(pair.gstr2b?.taxableValue ?? null)}</td>
                        <td className="recon-amount">{inr(pair.books?.taxableValue ?? null)}</td>
                        <td className="recon-note">{pair.note || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h2>Nothing in this view</h2>
              <p>{filter === "all" ? "Every invoice matched cleanly. That is the good outcome." : "No lines in this category."}</p>
            </div>
          )}
        </>
      ) : (
        <div className="recon-await">
          <SyncIcon />
          <p>Load both files and the match runs by itself — nothing else to configure.</p>
        </div>
      )}
    </>
  );
}
