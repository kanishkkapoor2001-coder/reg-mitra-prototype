import assert from "node:assert/strict";
import test from "node:test";
import {
  COVERAGE_FROM,
  COVERAGE_TO,
  OBLIGATION_RULES,
  dueDayFor,
  findExtension,
  isWithinCoverage,
  ruleIsInForce,
  type NotifiedExtension,
} from "./compliance-rules.ts";

// The defect these lock down: six bare day numbers with no sense of time. The
// calendar rendered "GSTR-3B · 20th" for any month from 2024 to 2035, as though
// today's position had always applied — and government extensions, the biggest
// real-world source of date error in Indian compliance, were not modelled at all.

test("every obligation declares a statutory basis and an effective date", () => {
  for (const rule of Object.values(OBLIGATION_RULES)) {
    assert.ok(rule.statutoryBasis.length > 20, `${rule.id} needs a real basis`);
    assert.match(rule.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/, `${rule.id} needs effectiveFrom`);
  }
});

test("a period before the rule took effect is not covered", () => {
  // Previously this returned today's 20th as though it were verified history.
  assert.equal(isWithinCoverage("2024-06-20"), false);
  assert.equal(ruleIsInForce(OBLIGATION_RULES.gstr3b, "2024-06-20"), false);
});

test("a period inside the declared window is covered", () => {
  assert.equal(isWithinCoverage("2026-08-20"), true);
  assert.equal(ruleIsInForce(OBLIGATION_RULES.gstr3b, "2026-08-20"), true);
});

test("a date beyond the coverage horizon is refused rather than forecast", () => {
  assert.equal(isWithinCoverage("2031-01-20"), false);
});

test("the coverage window is a sane, bounded range", () => {
  assert.ok(COVERAGE_FROM < COVERAGE_TO);
  assert.match(COVERAGE_FROM, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(COVERAGE_TO, /^\d{4}-\d{2}-\d{2}$/);
});

test("TDS for March is due 30 April, not 7 April", () => {
  const rule = OBLIGATION_RULES["tds-deposit"];
  assert.equal(dueDayFor(rule, 3), 30, "April (monthIndex 3) carries the March deduction");
  assert.equal(dueDayFor(rule, 6), 7, "every other month is the 7th");
});

test("a rule with an end date stops being in force after it", () => {
  const retired = { ...OBLIGATION_RULES.gstr3b, effectiveTo: "2026-03-31" };
  assert.equal(ruleIsInForce(retired, "2026-03-20"), true);
  assert.equal(ruleIsInForce(retired, "2026-04-20"), false);
});

// ── extensions ───────────────────────────────────────────────────────────────

const EXTENSION: NotifiedExtension = {
  obligationId: "gstr3b",
  period: "2026-07",
  extendedTo: "2026-08-27",
  notification: "Notification No. 00/2026 – Central Tax",
  sourceUrl: "https://example.test/notification",
};

test("no extension is recorded by default — an invented one would be worse than none", () => {
  assert.equal(findExtension("gstr3b", "2026-07"), null);
});

test("a recorded extension is found for its obligation and period only", () => {
  assert.equal(findExtension("gstr3b", "2026-07", [EXTENSION]), EXTENSION);
  assert.equal(findExtension("gstr3b", "2026-06", [EXTENSION]), null, "wrong period");
  assert.equal(findExtension("gstr1", "2026-07", [EXTENSION]), null, "wrong obligation");
});

test("an extension must carry a notification reference", () => {
  // An unsourced extension is not usable: a CA cannot verify or cite it.
  for (const extension of [EXTENSION]) {
    assert.ok(extension.notification.length > 0);
    assert.ok(extension.sourceUrl.startsWith("http"));
  }
});
