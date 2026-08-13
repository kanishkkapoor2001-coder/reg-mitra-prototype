import assert from "node:assert/strict";
import test from "node:test";
import { applyMapping, parseCsv, parseIndianAmount, type ColumnMapping } from "./csv.ts";

// A misparse here does not throw — it writes a wrong fact against a client and
// the matcher then evaluates statutory thresholds against it. These are the
// cases a real Tally or Zoho export actually contains.

test("a comma inside a quoted field is not a column break", () => {
  const rows = parseCsv('Name,Sector\n"Sharma & Co, Pvt Ltd",Pharma\n');
  assert.deepEqual(rows[1], ["Sharma & Co, Pvt Ltd", "Pharma"]);
});

test("escaped quotes and embedded newlines survive", () => {
  const rows = parseCsv('Name,Note\n"He said ""hi""","line one\nline two"\n');
  assert.deepEqual(rows[1], ['He said "hi"', "line one\nline two"]);
});

test("CRLF files and trailing blank lines do not produce empty clients", () => {
  const rows = parseCsv("Name,Sector\r\nAcme,Retail\r\n\r\n");
  assert.equal(rows.length, 2);
});

test("Indian money notation reads the way an accountant writes it", () => {
  assert.equal(parseIndianAmount("4.5 Cr"), 45_000_000);
  assert.equal(parseIndianAmount("₹40,00,000"), 4_000_000);
  assert.equal(parseIndianAmount("25 lakh"), 2_500_000);
  assert.equal(parseIndianAmount("400000000"), 400_000_000);
});

test("an unreadable amount is refused rather than guessed", () => {
  // Wrong turnover is compared against statutory thresholds; absent is safe.
  assert.equal(parseIndianAmount("approx 4-5 cr"), null);
  assert.equal(parseIndianAmount("see attached"), null);
  assert.equal(parseIndianAmount(""), null);
});

const headers = ["Client Name", "Industry", "State", "Turnover", "GST Scheme", "TDS?", "Notes"];
const mapping: ColumnMapping = {
  "Client Name": "display_name",
  Industry: "company.sector",
  State: "company.registered_state",
  Turnover: "company.annual_turnover_inr",
  "GST Scheme": "company.gst_scheme",
  "TDS?": "company.deducts_tds",
  Notes: "ignore",
};

test("a mapped row becomes a client with typed facts", () => {
  const row = applyMapping(
    headers,
    ["Sharma Pharma", "Manufacturing", "Maharashtra", "4.5 Cr", "Regular Scheme", "Yes", "call in May"],
    mapping,
  );
  assert.equal(row.displayName, "Sharma Pharma");
  assert.equal(row.legalName, "Sharma Pharma", "one name column fills both");
  assert.equal(row.facts["company.annual_turnover_inr"], 45_000_000);
  // "Regular Scheme" is what an export writes; the registry says REGULAR.
  assert.equal(row.facts["company.gst_scheme"], "REGULAR");
  assert.equal(row.facts["company.deducts_tds"], true);
  assert.equal(row.sector, "MANUFACTURING");
});

test("cells that cannot be used are reported, never silently dropped", () => {
  const row = applyMapping(
    headers,
    ["Acme", "Manufacturing", "MH", "ask Ramesh", "Regular", "maybe", ""],
    mapping,
  );
  assert.equal(row.facts["company.annual_turnover_inr"], undefined);
  assert.equal(row.facts["company.deducts_tds"], undefined);
  assert.equal(row.skipped.length, 2, "turnover and TDS both surface to the operator");
});

// Accountants put the unit in the header and bare numbers in the cells. Read
// literally, "4.5" under "T/O (Cr)" is ₹4.50 — the difference between a firm
// being over an audit threshold and nowhere near it, with nothing downstream
// to question it.
test("a unit declared in the header scales the cells beneath it", () => {
  const crore = applyMapping(["T/O (Cr)"], ["4.5"], { "T/O (Cr)": "company.annual_turnover_inr" });
  assert.equal(crore.facts["company.annual_turnover_inr"], 45_000_000);

  const lakhs = applyMapping(["Turnover in lakhs"], ["250"], {
    "Turnover in lakhs": "company.annual_turnover_inr",
  });
  assert.equal(lakhs.facts["company.annual_turnover_inr"], 25_000_000);
});

test("a unit in the cell wins, so the scale is never applied twice", () => {
  const row = applyMapping(["T/O (Cr)"], ["4.5 Cr"], { "T/O (Cr)": "company.annual_turnover_inr" });
  assert.equal(row.facts["company.annual_turnover_inr"], 45_000_000);
});

test("a plain turnover header leaves the number alone", () => {
  const row = applyMapping(["Turnover"], ["400000000"], { Turnover: "company.annual_turnover_inr" });
  assert.equal(row.facts["company.annual_turnover_inr"], 400_000_000);
  // "Employees" must not trip the lakh pattern on its trailing letters.
  const staff = applyMapping(["Employees"], ["120"], { Employees: "company.employee_count" });
  assert.equal(staff.facts["company.employee_count"], 120);
});

test("an ignored column contributes nothing", () => {
  const row = applyMapping(headers, ["Acme", "", "", "", "", "", "internal note"], mapping);
  assert.deepEqual(row.facts, {});
  assert.deepEqual(row.skipped, []);
});
