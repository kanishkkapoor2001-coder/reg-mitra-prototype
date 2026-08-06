import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CalculatorInputError,
  advanceTaxSchedule,
  gstInterestSection50,
  gstLateFeeSection47,
  gstReturnDueDate,
  interest234A,
  interest234B,
  interest234C,
  lateFilingFee234F,
  monthsOrPartThereof,
  tdsDefaultInterest,
} from "./calculators.ts";
import { runCalculator } from "./registry.ts";

const utc = (value: string) => new Date(`${value}T00:00:00Z`);

test("counts any part of a month as a full month", () => {
  // Exactly one month.
  assert.equal(monthsOrPartThereof(utc("2026-07-31"), utc("2026-08-31")), 1);
  // One day past the due date is already a full month.
  assert.equal(monthsOrPartThereof(utc("2026-07-31"), utc("2026-08-01")), 1);
  // Three complete months plus five days = four.
  assert.equal(monthsOrPartThereof(utc("2026-07-31"), utc("2026-11-05")), 4);
  // Mid-month spans.
  assert.equal(monthsOrPartThereof(utc("2026-01-15"), utc("2026-03-20")), 3);
  assert.equal(monthsOrPartThereof(utc("2026-01-15"), utc("2026-03-15")), 2);
  // No delay at all.
  assert.equal(monthsOrPartThereof(utc("2026-07-31"), utc("2026-07-31")), 0);
});

test("section 234A charges 1% per month or part on unpaid tax", () => {
  const result = interest234A({ unpaidTax: 50_000, dueDate: "2026-07-31", filingDate: "2026-11-05" });
  assert.equal(result.amount, 2_000); // 50,000 × 1% × 4 months
  assert.match(result.statutoryBasis, /234A/);
  assert.ok(result.steps.some((step) => step.detail.includes("4")));

  const onTime = interest234A({ unpaidTax: 50_000, dueDate: "2026-07-31", filingDate: "2026-07-31" });
  assert.equal(onTime.amount, 0);
  assert.match(onTime.headline, /No interest/);
});

test("section 234B applies only below the 90% advance-tax threshold", () => {
  const liable = interest234B({
    assessedTax: 100_000,
    advanceTaxPaid: 50_000,
    assessmentDate: "2026-12-15",
    financialYearEnd: "2026-03-31",
  });
  // Shortfall 50,000 × 1% × 9 months (1 Apr → 15 Dec).
  assert.equal(liable.amount, 4_500);

  const safe = interest234B({
    assessedTax: 100_000,
    advanceTaxPaid: 95_000,
    assessmentDate: "2026-12-15",
    financialYearEnd: "2026-03-31",
  });
  assert.equal(safe.amount, 0);
  assert.match(safe.headline, /No interest/);
});

test("section 234C measures each instalment against its benchmark", () => {
  const met = interest234C({
    totalTaxLiability: 100_000,
    paidByJune15: 15_000,
    paidBySeptember15: 45_000,
    paidByDecember15: 75_000,
    paidByMarch15: 100_000,
  });
  assert.equal(met.amount, 0);

  const nothingPaid = interest234C({ totalTaxLiability: 100_000 });
  // 15,000×1%×3 + 45,000×1%×3 + 75,000×1%×3 + 100,000×1%×1
  assert.equal(nothingPaid.amount, 450 + 1_350 + 2_250 + 1_000);
  assert.ok(nothingPaid.caveats.some((caveat) => /presumptive/i.test(caveat)));
});

test("section 234F fee steps at the ₹5,00,000 income threshold", () => {
  assert.equal(lateFilingFee234F({ totalIncome: 400_000, filedAfterDueDate: true }).amount, 1_000);
  assert.equal(lateFilingFee234F({ totalIncome: 500_000, filedAfterDueDate: true }).amount, 1_000);
  assert.equal(lateFilingFee234F({ totalIncome: 500_001, filedAfterDueDate: true }).amount, 5_000);
  assert.equal(lateFilingFee234F({ totalIncome: 900_000, filedAfterDueDate: false }).amount, 0);
  assert.equal(
    lateFilingFee234F({ totalIncome: 900_000, filedAfterDueDate: true, liableToFile: false }).amount,
    0,
  );
});

test("TDS default interest distinguishes non-deduction from late deposit", () => {
  const notDeducted = tdsDefaultInterest({
    amount: 100_000, defaultType: "failure-to-deduct", fromDate: "2026-05-07", toDate: "2026-07-15",
  });
  assert.equal(notDeducted.amount, 3_000); // 1% × 3 months

  const notDeposited = tdsDefaultInterest({
    amount: 100_000, defaultType: "failure-to-deposit", fromDate: "2026-05-07", toDate: "2026-07-15",
  });
  assert.equal(notDeposited.amount, 4_500); // 1.5% × 3 months
});

test("GST interest under section 50 runs daily, not monthly", () => {
  const result = gstInterestSection50({
    taxAmount: 100_000, fromDate: "2026-04-21", toDate: "2026-05-21",
  });
  assert.equal(result.amount, Math.round(100_000 * 0.18 * (30 / 365))); // 1,479
  assert.match(result.statutoryBasis, /daily basis/);

  const undue = gstInterestSection50({
    taxAmount: 100_000, fromDate: "2026-04-21", toDate: "2026-05-21", undueItcClaim: true,
  });
  assert.equal(undue.amount, Math.round(100_000 * 0.24 * (30 / 365)));
});

test("GST late fee uses the statutory rate and never assumes a notified reduction", () => {
  // No notified rate supplied → section 47's own ₹100/day per Act, clearly labelled.
  const statutory = gstLateFeeSection47({ daysDelayed: 10 });
  assert.equal(statutory.amount, 2_000); // 10 × ₹100 × 2 Acts
  assert.match(statutory.headline, /unreduced statutory rate/);
  assert.ok(statutory.caveats.some((caveat) => /UNREDUCED statutory rate/.test(caveat)));

  // Statutory cap of ₹5,000 per Act still binds.
  assert.equal(gstLateFeeSection47({ daysDelayed: 200 }).amount, 10_000);

  // A supplied notified rate is used as given and labelled as such.
  const notified = gstLateFeeSection47({ daysDelayed: 10, perActDailyFee: 25, perActCap: 2_500 });
  assert.equal(notified.amount, 500);
  assert.match(notified.headline, /supplied notified rate/);
  assert.ok(notified.caveats.some((caveat) => /confirm that notification/i.test(caveat)));
});

test("GST return due dates follow the monthly and QRMP rules", () => {
  assert.match(
    gstReturnDueDate({ returnType: "GSTR-3B", periodEnd: "2026-07-31" }).headline,
    /20 Aug 2026/,
  );
  assert.match(
    gstReturnDueDate({ returnType: "GSTR-1", periodEnd: "2026-07-31" }).headline,
    /11 Aug 2026/,
  );
  assert.match(
    gstReturnDueDate({
      returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly", stateCode: "MH",
    }).headline,
    /22 Jul 2026/,
  );
  assert.match(
    gstReturnDueDate({
      returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly", stateCode: "UP",
    }).headline,
    /24 Jul 2026/,
  );
});

test("advance tax schedule lists the four statutory instalments", () => {
  const schedule = advanceTaxSchedule({ financialYearStartYear: 2026 });
  assert.equal(schedule.steps.length, 4);
  assert.match(schedule.steps[0]?.detail ?? "", /15 Jun 2026.*15%/);
  assert.match(schedule.steps[3]?.detail ?? "", /15 Mar 2027.*100%/);
});

test("bad parameters surface as readable errors, never as invented numbers", () => {
  assert.throws(
    () => interest234A({ unpaidTax: 1_000, dueDate: "31-07-2026", filingDate: "2026-08-01" }),
    CalculatorInputError,
  );
  const outcome = runCalculator("interest_234A", { unpaidTax: 1_000, dueDate: "oops", filingDate: "2026-08-01" });
  assert.equal(outcome.result, null);
  assert.match(outcome.error ?? "", /ISO date/);

  const unknown = runCalculator("compute_vibes", {});
  assert.equal(unknown.result, null);
  assert.match(unknown.error ?? "", /Unknown calculator/);
});

test("registry executes a known calculator end to end", () => {
  const outcome = runCalculator("gst_late_fee_section_47", { daysDelayed: 10 });
  assert.equal(outcome.error, null);
  assert.equal(outcome.result?.amount, 2_000); // statutory ₹100/day × 10 × 2 Acts
});

// ── Audit regressions (2026-08-06) ───────────────────────────────────────────
// Each of these encodes a defect found in the product audit. They assert the
// statutory position, not the previous behaviour.

test("QRMP: Chhattisgarh is a 22nd state and Chandigarh is a 24th state", () => {
  // These two were swapped: CG (Chhattisgarh) was missing and CH (Chandigarh)
  // was in the 22nd group, so each returned the other's due date.
  const cg = gstReturnDueDate({
    returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly", stateCode: "CG",
  });
  assert.match(cg.headline, /22 Jul 2026/);
  assert.match(cg.steps.find((x) => x.label === "Rule applied")!.detail, /Category X/);

  const ch = gstReturnDueDate({
    returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly", stateCode: "CH",
  });
  assert.match(ch.headline, /24 Jul 2026/);
  assert.match(ch.steps.find((x) => x.label === "Rule applied")!.detail, /Category Y/);
});

test("QRMP: a full state name resolves instead of silently missing", () => {
  const byName = gstReturnDueDate({
    returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly", stateCode: "Maharashtra",
  });
  const byCode = gstReturnDueDate({
    returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly", stateCode: "MH",
  });
  assert.equal(byName.headline, byCode.headline);
  assert.match(byName.headline, /22 Jul 2026/);
});

test("QRMP: an unrecognised state is hedged, never stated as a group", () => {
  for (const stateCode of ["XX", "MAH", "Atlantis"]) {
    const result = gstReturnDueDate({
      returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly", stateCode,
    });
    const rule = result.steps.find((x) => x.label === "Rule applied")!.detail;
    assert.match(rule, /not recognised/i, `${stateCode} should be hedged`);
    assert.doesNotMatch(rule, /Category [XY]/, `${stateCode} must not claim a group`);
  }
});

test("QRMP: a missing state code is hedged", () => {
  const result = gstReturnDueDate({
    returnType: "GSTR-3B", periodEnd: "2026-06-30", filingFrequency: "quarterly",
  });
  assert.match(result.steps.find((x) => x.label === "Rule applied")!.detail, /no State code was supplied/i);
});

test("234B: interest runs from 1 April of the assessment year, not the assessment event year", () => {
  // FY 2024-25 assessed on 10 Sep 2026. Interest must run from 1 Apr 2025
  // (18 months), not 1 Apr 2026 (6 months) — the old fallback understated ~3x.
  const result = interest234B({
    assessedTax: 1_000_000,
    advanceTaxPaid: 0,
    assessmentDate: "2026-09-10",
    financialYearEnd: "2025-03-31",
  });
  const period = result.steps.find((s) => s.label === "Period");
  assert.match(period!.detail, /1 Apr 2025/);
  assert.equal(result.steps.find((s) => s.label === "Months or part thereof")!.detail, "18");
  assert.equal(result.amount, 180_000);
});

test("234B: refuses rather than guessing when the financial year is not supplied", () => {
  assert.throws(
    () => interest234B({ assessedTax: 1_000_000, advanceTaxPaid: 0, assessmentDate: "2026-09-10" }),
    /financialYearEnd is required/,
  );
});

test("234B: rejects an assessment date before the assessment year begins", () => {
  assert.throws(
    () => interest234B({
      assessedTax: 100_000, advanceTaxPaid: 0,
      assessmentDate: "2025-01-10", financialYearEnd: "2025-03-31",
    }),
    /before 1 April/,
  );
});

test("s.47: a nil return is recorded but does not silently change the figure", () => {
  const withLiability = gstLateFeeSection47({ daysDelayed: 10 });
  const nil = gstLateFeeSection47({ daysDelayed: 10, nilReturn: true });
  // Same statutory figure — the reduction is notification-based, not s.47.
  assert.equal(nil.amount, withLiability.amount);
  // But the user must be told why it did not change.
  assert.match(
    nil.steps.find((s) => s.label === "Return type")!.detail,
    /NOT applied|not applied/,
  );
});
