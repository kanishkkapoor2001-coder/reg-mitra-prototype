// Deterministic compliance calculators.
//
// Interest, fee, and due-date arithmetic runs as CODE, never as model arithmetic.
// A language model that "computes" 1% per month across a part-month boundary is
// guessing; these functions are exact, unit-tested, and return their working so a
// professional can check every step.
//
// Every result carries its statutory basis and the caveats that decide whether the
// computation is even the right one (notification-based relief, caps, rate changes).
// The assistant must present those caveats — the number alone is not advice.

export interface CalculationStep {
  label: string;
  detail: string;
}

export interface CalculationResult {
  /** Human-readable headline, e.g. "₹1,500 interest under section 234A". */
  headline: string;
  amount: number | null;
  currency: "INR" | null;
  steps: CalculationStep[];
  statutoryBasis: string;
  caveats: string[];
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function formatInr(value: number): string {
  return `₹${inr.format(Math.round(value))}`;
}

function parseDate(value: string, field: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new CalculatorInputError(`${field} must be an ISO date (YYYY-MM-DD); received "${value}".`);
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime())) throw new CalculatorInputError(`${field} is not a valid date.`);
  return date;
}

export class CalculatorInputError extends Error {}

function requirePositive(value: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new CalculatorInputError(`${field} must be a non-negative number.`);
  }
  return value;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(date);
}

/**
 * Months between two dates counting ANY part of a month as a full month — the
 * "month or part of a month" rule that income-tax interest provisions use, and the
 * single most common source of manual computation error.
 */
export function monthsOrPartThereof(from: Date, to: Date): number {
  if (to <= from) return 0;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12
    + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() > from.getUTCDate()) months += 1;
  return Math.max(1, months);
}

const RUPEE_NOTE = "Amounts are rounded to the nearest rupee.";

// ── Income tax ───────────────────────────────────────────────────────────────

export function interest234A(input: {
  unpaidTax: number;
  dueDate: string;
  filingDate: string;
}): CalculationResult {
  const unpaidTax = requirePositive(input.unpaidTax, "unpaidTax");
  const due = parseDate(input.dueDate, "dueDate");
  const filed = parseDate(input.filingDate, "filingDate");
  const months = monthsOrPartThereof(due, filed);
  const amount = unpaidTax * 0.01 * months;

  return {
    headline: months === 0
      ? "No interest under section 234A — the return was not filed late."
      : `${formatInr(amount)} interest under section 234A`,
    amount: Math.round(amount),
    currency: "INR",
    steps: [
      { label: "Tax on which interest runs", detail: formatInr(unpaidTax) },
      { label: "Period", detail: `${formatDate(due)} (due date) to ${formatDate(filed)} (date of filing)` },
      { label: "Months or part thereof", detail: `${months} — any part of a month counts as a full month` },
      { label: "Rate", detail: "1% per month" },
      { label: "Computation", detail: `${formatInr(unpaidTax)} × 1% × ${months} = ${formatInr(amount)}` },
    ],
    statutoryBasis: "Section 234A, Income-tax Act — interest for default in furnishing the return of income.",
    caveats: [
      "Interest runs on the tax payable as reduced by advance tax, TDS/TCS, and reliefs actually available — confirm the base figure before relying on this.",
      "Where no return is filed, interest runs to the date of completion of the assessment instead.",
      RUPEE_NOTE,
    ],
  };
}

export function interest234B(input: {
  assessedTax: number;
  advanceTaxPaid: number;
  assessmentDate: string;
  financialYearEnd?: string;
}): CalculationResult {
  const assessedTax = requirePositive(input.assessedTax, "assessedTax");
  const advanceTaxPaid = requirePositive(input.advanceTaxPaid, "advanceTaxPaid");
  const assessment = parseDate(input.assessmentDate, "assessmentDate");
  // Interest runs from 1 April of the assessment year.
  const aprilFirst = input.financialYearEnd
    ? (() => {
      const end = parseDate(input.financialYearEnd, "financialYearEnd");
      return new Date(Date.UTC(end.getUTCFullYear(), 3, 1));
    })()
    : new Date(Date.UTC(assessment.getUTCFullYear(), 3, 1));

  const threshold = assessedTax * 0.9;
  const liable = advanceTaxPaid < threshold;
  const shortfall = Math.max(0, assessedTax - advanceTaxPaid);
  const months = monthsOrPartThereof(aprilFirst, assessment);
  const amount = liable ? shortfall * 0.01 * months : 0;

  return {
    headline: liable
      ? `${formatInr(amount)} interest under section 234B`
      : "No interest under section 234B — advance tax paid is at least 90% of assessed tax.",
    amount: Math.round(amount),
    currency: "INR",
    steps: [
      { label: "Assessed tax", detail: formatInr(assessedTax) },
      { label: "Advance tax paid", detail: formatInr(advanceTaxPaid) },
      { label: "90% threshold", detail: `${formatInr(threshold)} — ${liable ? "not met, so section 234B applies" : "met, so section 234B does not apply"}` },
      ...(liable
        ? [
          { label: "Shortfall", detail: `${formatInr(assessedTax)} − ${formatInr(advanceTaxPaid)} = ${formatInr(shortfall)}` },
          { label: "Period", detail: `${formatDate(aprilFirst)} to ${formatDate(assessment)}` },
          { label: "Months or part thereof", detail: String(months) },
          { label: "Computation", detail: `${formatInr(shortfall)} × 1% × ${months} = ${formatInr(amount)}` },
        ]
        : []),
    ],
    statutoryBasis: "Section 234B, Income-tax Act — interest for default in payment of advance tax.",
    caveats: [
      "Assessed tax is computed after TDS/TCS and reliefs; verify the figure used here.",
      "Interest runs to the date of regular assessment, or to the date of determination under section 143(1) where applicable.",
      RUPEE_NOTE,
    ],
  };
}

/** Statutory advance-tax instalment schedule (non-presumptive taxpayers). */
export const ADVANCE_TAX_INSTALMENTS = [
  { label: "15 June", cumulativePercent: 15, monthsOfInterest: 3 },
  { label: "15 September", cumulativePercent: 45, monthsOfInterest: 3 },
  { label: "15 December", cumulativePercent: 75, monthsOfInterest: 3 },
  { label: "15 March", cumulativePercent: 100, monthsOfInterest: 1 },
] as const;

export function interest234C(input: {
  totalTaxLiability: number;
  paidByJune15?: number;
  paidBySeptember15?: number;
  paidByDecember15?: number;
  paidByMarch15?: number;
}): CalculationResult {
  const total = requirePositive(input.totalTaxLiability, "totalTaxLiability");
  const paid = [
    requirePositive(input.paidByJune15 ?? 0, "paidByJune15"),
    requirePositive(input.paidBySeptember15 ?? 0, "paidBySeptember15"),
    requirePositive(input.paidByDecember15 ?? 0, "paidByDecember15"),
    requirePositive(input.paidByMarch15 ?? 0, "paidByMarch15"),
  ];

  const steps: CalculationStep[] = [
    { label: "Total tax liability", detail: formatInr(total) },
  ];
  let amount = 0;
  ADVANCE_TAX_INSTALMENTS.forEach((instalment, index) => {
    const required = total * (instalment.cumulativePercent / 100);
    const cumulativePaid = paid[index] ?? 0;
    const shortfall = Math.max(0, required - cumulativePaid);
    const interest = shortfall * 0.01 * instalment.monthsOfInterest;
    amount += interest;
    steps.push({
      label: `${instalment.label} (${instalment.cumulativePercent}%)`,
      detail: shortfall > 0
        ? `required ${formatInr(required)}, paid ${formatInr(cumulativePaid)}, shortfall ${formatInr(shortfall)}`
          + ` → ${formatInr(shortfall)} × 1% × ${instalment.monthsOfInterest} = ${formatInr(interest)}`
        : `required ${formatInr(required)}, paid ${formatInr(cumulativePaid)} — no shortfall`,
    });
  });
  steps.push({ label: "Total interest", detail: formatInr(amount) });

  return {
    headline: amount > 0
      ? `${formatInr(amount)} interest under section 234C`
      : "No interest under section 234C — every instalment benchmark was met.",
    amount: Math.round(amount),
    currency: "INR",
    steps,
    statutoryBasis: "Section 234C, Income-tax Act — interest for deferment of advance tax, benchmarked at 15%, 45%, 75% and 100%.",
    caveats: [
      "Amounts paid must be CUMULATIVE advance tax paid up to each instalment date.",
      "Statutory relief applies where the shortfall in the first two instalments is within the 12%/36% tolerance, and for income that could not be estimated (capital gains, casual income) — this computation does not apply those reliefs.",
      "Taxpayers under presumptive taxation follow a single 15 March instalment instead.",
      RUPEE_NOTE,
    ],
  };
}

export function lateFilingFee234F(input: {
  totalIncome: number;
  filedAfterDueDate: boolean;
  liableToFile?: boolean;
}): CalculationResult {
  const totalIncome = requirePositive(input.totalIncome, "totalIncome");
  const liable = input.liableToFile ?? true;
  const fee = !liable || !input.filedAfterDueDate ? 0 : totalIncome <= 500_000 ? 1_000 : 5_000;

  return {
    headline: fee > 0 ? `${formatInr(fee)} fee under section 234F` : "No fee under section 234F.",
    amount: fee,
    currency: "INR",
    steps: [
      { label: "Total income", detail: formatInr(totalIncome) },
      { label: "Filed after due date", detail: input.filedAfterDueDate ? "yes" : "no" },
      { label: "Liable to furnish return", detail: liable ? "yes" : "no" },
      {
        label: "Fee",
        detail: fee === 0
          ? "nil"
          : totalIncome <= 500_000
            ? "₹1,000 — total income does not exceed ₹5,00,000"
            : "₹5,000 — total income exceeds ₹5,00,000",
      },
    ],
    statutoryBasis: "Section 234F, Income-tax Act — fee for default in furnishing the return of income.",
    caveats: [
      "No fee arises where the person is not liable to furnish a return.",
      "The fee is in addition to any interest under sections 234A, 234B and 234C.",
    ],
  };
}

export function tdsDefaultInterest(input: {
  amount: number;
  defaultType: "failure-to-deduct" | "failure-to-deposit";
  fromDate: string;
  toDate: string;
}): CalculationResult {
  const amount = requirePositive(input.amount, "amount");
  const from = parseDate(input.fromDate, "fromDate");
  const to = parseDate(input.toDate, "toDate");
  const failureToDeduct = input.defaultType === "failure-to-deduct";
  const rate = failureToDeduct ? 0.01 : 0.015;
  const months = monthsOrPartThereof(from, to);
  const interest = amount * rate * months;

  return {
    headline: `${formatInr(interest)} interest on the TDS default`,
    amount: Math.round(interest),
    currency: "INR",
    steps: [
      { label: "Amount of tax", detail: formatInr(amount) },
      {
        label: "Default",
        detail: failureToDeduct
          ? "failure to deduct — 1% per month from the date tax was deductible to the date it was deducted"
          : "failure to deposit after deduction — 1.5% per month from the date of deduction to the date of payment",
      },
      { label: "Period", detail: `${formatDate(from)} to ${formatDate(to)}` },
      { label: "Months or part thereof", detail: String(months) },
      { label: "Computation", detail: `${formatInr(amount)} × ${(rate * 100).toFixed(1)}% × ${months} = ${formatInr(interest)}` },
    ],
    statutoryBasis: "Section 201(1A), Income-tax Act — interest on failure to deduct or to pay tax deducted at source.",
    caveats: [
      "Interest is in addition to the tax itself and to any penalty or late-filing fee for the TDS statement.",
      "Where the payee has discharged the tax, relief may be available on furnishing the prescribed certificate — check before advising.",
      RUPEE_NOTE,
    ],
  };
}

// ── GST ──────────────────────────────────────────────────────────────────────

export function gstInterestSection50(input: {
  taxAmount: number;
  fromDate: string;
  toDate: string;
  undueItcClaim?: boolean;
}): CalculationResult {
  const taxAmount = requirePositive(input.taxAmount, "taxAmount");
  const from = parseDate(input.fromDate, "fromDate");
  const to = parseDate(input.toDate, "toDate");
  const undue = input.undueItcClaim ?? false;
  const annualRate = undue ? 0.24 : 0.18;
  const days = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const interest = taxAmount * annualRate * (days / 365);

  return {
    headline: `${formatInr(interest)} interest under section 50`,
    amount: Math.round(interest),
    currency: "INR",
    steps: [
      { label: "Tax paid late", detail: formatInr(taxAmount) },
      { label: "Period", detail: `${formatDate(from)} (day after due date) to ${formatDate(to)} (date of payment) — ${days} days` },
      { label: "Rate", detail: undue ? "24% per annum (undue or excess input tax credit)" : "18% per annum" },
      { label: "Computation", detail: `${formatInr(taxAmount)} × ${(annualRate * 100).toFixed(0)}% × ${days}/365 = ${formatInr(interest)}` },
    ],
    statutoryBasis: "Section 50, CGST Act, 2017 — interest on delayed payment of tax. GST interest is computed on a daily basis, not per month.",
    caveats: [
      "Section 50(1) proviso: where the return is furnished after the due date, interest is payable on the portion of tax paid by debiting the electronic CASH ledger — confirm the correct base.",
      "The rate is as notified; verify the notified rate for the relevant period.",
      RUPEE_NOTE,
    ],
  };
}

export function gstLateFeeSection47(input: {
  daysDelayed: number;
  nilReturn?: boolean;
  perActDailyFee?: number;
  perActCap?: number;
}): CalculationResult {
  const days = Math.round(requirePositive(input.daysDelayed, "daysDelayed"));
  const nil = input.nilReturn ?? false;
  // The notified rate is NOT assumed. Section 47 itself provides ₹100 per day per
  // Act (cap ₹5,000); notifications have reduced this for most returns, but which
  // notification applies depends on the return, turnover slab and period. Where the
  // caller has not supplied the notified rate, the statutory rate is computed and
  // the reduction is flagged — an assumed rate presented as a result would be
  // exactly the invented number this system exists to prevent.
  const rateSupplied = typeof input.perActDailyFee === "number";
  const dailyPerAct = input.perActDailyFee ?? 100;
  const capPerAct = input.perActCap ?? (rateSupplied ? Number.POSITIVE_INFINITY : 5_000);
  const computedPerAct = Math.min(days * dailyPerAct, capPerAct);
  const total = computedPerAct * 2;

  return {
    headline: rateSupplied
      ? `${formatInr(total)} late fee (CGST + SGST) at the supplied notified rate`
      : `${formatInr(total)} late fee (CGST + SGST) at the unreduced statutory rate — a reduced notified rate may well apply`,
    amount: Math.round(total),
    currency: "INR",
    steps: [
      { label: "Days of delay", detail: String(days) },
      { label: "Return type", detail: nil ? "nil return" : "return with liability" },
      {
        label: "Rate used (per Act)",
        detail: rateSupplied
          ? `${formatInr(dailyPerAct)} per day as supplied${Number.isFinite(capPerAct) ? `, capped at ${formatInr(capPerAct)}` : ""}`
          : "₹100 per day, capped at ₹5,000 — the rate in section 47 itself, NOT a notified reduced rate",
      },
      { label: "Per Act", detail: `min(${days} × ${formatInr(dailyPerAct)}, ${Number.isFinite(capPerAct) ? formatInr(capPerAct) : "no cap"}) = ${formatInr(computedPerAct)}` },
      { label: "CGST + SGST", detail: `${formatInr(computedPerAct)} × 2 = ${formatInr(total)}` },
      ...(rateSupplied ? [] : [{
        label: "Before relying on this",
        detail: "notifications commonly reduce the daily fee and the cap for GSTR-3B and GSTR-1; the reduced figure will usually be materially lower",
      }]),
    ],
    statutoryBasis: "Section 47, CGST Act, 2017 — levy of late fee, read with any notification reducing the fee for the relevant return and period.",
    caveats: [
      rateSupplied
        ? "This uses the rate supplied to it — confirm that notification actually governs this return, turnover slab and period."
        : "This is the UNREDUCED statutory rate. Notifications reduce the daily fee and cap for most returns, and differ by return type, turnover slab and period — identify the notification in force and recompute before quoting any figure to a client.",
      "The portal computes late fee itself and may carry forward fee from an earlier period.",
      "GSTR-9 late fee is computed differently (a percentage of turnover), not by this daily rate.",
      RUPEE_NOTE,
    ],
  };
}

// ── Due dates ────────────────────────────────────────────────────────────────

/** QRMP quarterly GSTR-3B due date differs by state group (22nd vs 24th). */
const QRMP_GROUP_X = new Set([
  "CH", "TN", "KL", "KA", "AP", "TS", "PY", "AN", "LD", "GA", "MH", "GJ", "DN", "DD", "MP",
]);

export function gstReturnDueDate(input: {
  returnType: "GSTR-1" | "GSTR-3B";
  periodEnd: string;
  filingFrequency?: "monthly" | "quarterly";
  stateCode?: string;
}): CalculationResult {
  const period = parseDate(input.periodEnd, "periodEnd");
  const quarterly = input.filingFrequency === "quarterly";
  const next = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));

  let day: number;
  let basis: string;
  if (input.returnType === "GSTR-1") {
    day = quarterly ? 13 : 11;
    basis = quarterly
      ? "quarterly GSTR-1 (QRMP): 13th of the month following the quarter"
      : "monthly GSTR-1: 11th of the following month";
  } else if (!quarterly) {
    day = 20;
    basis = "monthly GSTR-3B: 20th of the following month";
  } else {
    const state = (input.stateCode ?? "").toUpperCase();
    const groupX = QRMP_GROUP_X.has(state);
    day = groupX ? 22 : 24;
    basis = `quarterly GSTR-3B (QRMP): ${day}th of the month following the quarter for ${groupX ? "the 22nd-day state group" : "the 24th-day state group"}`;
    if (!state) {
      basis = "quarterly GSTR-3B (QRMP): 22nd or 24th of the month following the quarter, depending on the State/UT — state code not supplied, 24th shown";
    }
  }
  const dueDate = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), day));

  return {
    headline: `${input.returnType} for the period ending ${formatDate(period)} is due on ${formatDate(dueDate)}`,
    amount: null,
    currency: null,
    steps: [
      { label: "Return", detail: `${input.returnType} (${quarterly ? "quarterly" : "monthly"})` },
      { label: "Period ends", detail: formatDate(period) },
      { label: "Rule applied", detail: basis },
      { label: "Due date", detail: formatDate(dueDate) },
    ],
    statutoryBasis: "GST portal due dates for Form GSTR-1 and Form GSTR-3B, as notified for the relevant class of taxpayer.",
    caveats: [
      "The Government extends due dates by notification, sometimes for specific States or taxpayer classes — check for an extension covering this period.",
      "QRMP taxpayers also pay tax monthly through Form GST PMT-06 for the first two months of the quarter.",
    ],
  };
}

export function advanceTaxSchedule(input: { financialYearStartYear: number }): CalculationResult {
  const year = input.financialYearStartYear;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new CalculatorInputError("financialYearStartYear must be a four-digit year, e.g. 2026 for FY 2026-27.");
  }
  const dates = [
    { label: "First instalment", date: new Date(Date.UTC(year, 5, 15)), percent: 15 },
    { label: "Second instalment", date: new Date(Date.UTC(year, 8, 15)), percent: 45 },
    { label: "Third instalment", date: new Date(Date.UTC(year, 11, 15)), percent: 75 },
    { label: "Fourth instalment", date: new Date(Date.UTC(year + 1, 2, 15)), percent: 100 },
  ];

  return {
    headline: `Advance tax instalments for FY ${year}-${String((year + 1) % 100).padStart(2, "0")}`,
    amount: null,
    currency: null,
    steps: dates.map((entry) => ({
      label: entry.label,
      detail: `${formatDate(entry.date)} — cumulative ${entry.percent}% of the estimated liability`,
    })),
    statutoryBasis: "Advance-tax instalment benchmarks of 15%, 45%, 75% and 100% underlying section 234C.",
    caveats: [
      "Taxpayers under presumptive taxation pay the whole advance tax by the 15 March instalment.",
      "Shortfalls attract interest under section 234C; overall default attracts section 234B.",
    ],
  };
}
