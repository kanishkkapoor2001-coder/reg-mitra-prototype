import assert from "node:assert/strict";
import test from "node:test";
import type { CompanyFact } from "./facts.ts";
import { evaluateApplicability, rankAdaptiveQuestions } from "./evaluate.ts";
import { explainApplicabilityRule } from "./explain.ts";
import { parseApplicabilityRule, collectAttributes } from "./rules.ts";
import type { ApplicabilityRule, RuleNode } from "./rules.ts";

const evidence = [{ id: "e1", marker: "§1", quote: "applies to licensed food businesses", location: "para 1" }];

function rule(root: RuleNode, over: Partial<ApplicabilityRule> = {}): ApplicabilityRule {
  return { version: 1, status: "verified", sourceCompleteness: "complete", root, evidence, ...over };
}

function fact(key: string, value: CompanyFact["value"], over: Partial<CompanyFact> = {}): CompanyFact {
  return { key, value, source: "ca_confirmed", observedAt: new Date("2026-01-01").toISOString(), ...over };
}

const foodRule = rule({
  type: "all",
  children: [
    { type: "predicate", attribute: "company.fssai_licensed", operator: "equals", value: true, evidenceIds: ["e1"] },
    { type: "predicate", attribute: "company.sector", operator: "one_of", value: ["FOOD", "MANUFACTURING"], evidenceIds: ["e1"] },
  ],
});

test("a client meeting every condition is flagged", () => {
  const result = evaluateApplicability(foodRule, [
    fact("company.fssai_licensed", true),
    fact("company.sector", "FOOD"),
  ]);
  assert.equal(result.decision, "direct_relevance");
  assert.deepEqual(result.missingAttributes, []);
});

test("a conflicting fact clears the client rather than leaving it pending", () => {
  const result = evaluateApplicability(foodRule, [
    fact("company.fssai_licensed", false),
    fact("company.sector", "TECHNOLOGY"),
  ]);
  assert.equal(result.decision, "no_detected_connection");
});

test("a missing fact is undecided, never assumed false", () => {
  const result = evaluateApplicability(foodRule, [fact("company.fssai_licensed", true)]);
  assert.equal(result.decision, "more_information_needed");
  assert.deepEqual(result.missingAttributes, ["company.sector"]);
});

test("one false in an all-group decides it even when a sibling is unknown", () => {
  const result = evaluateApplicability(foodRule, [fact("company.fssai_licensed", false)]);
  assert.equal(result.decision, "no_detected_connection");
});

test("an expired fact stops counting as known", () => {
  const stale = fact("company.sector", "FOOD", { expiresAt: new Date("2026-01-02").toISOString() });
  const result = evaluateApplicability(
    foodRule,
    [fact("company.fssai_licensed", true), stale],
    new Date("2026-09-01"),
  );
  assert.equal(result.decision, "more_information_needed");
  assert.deepEqual(result.missingAttributes, ["company.sector"]);
});

test("an unverified rule never produces a conclusion", () => {
  const withheld = rule(foodRule.root, { status: "withheld" });
  const result = evaluateApplicability(withheld, [
    fact("company.fssai_licensed", true),
    fact("company.sector", "FOOD"),
  ]);
  assert.equal(result.decision, "unable_to_determine_safely");
  assert.equal(result.trace, null);
});

test("an incomplete source never produces a conclusion", () => {
  const incomplete = rule(foodRule.root, { sourceCompleteness: "incomplete", status: "withheld" });
  assert.equal(
    evaluateApplicability(incomplete, [fact("company.sector", "FOOD")]).decision,
    "unable_to_determine_safely",
  );
});

test("a threshold against a non-number is unknown, not a clearance", () => {
  const turnover = rule({
    type: "predicate",
    attribute: "company.annual_turnover_inr",
    operator: "greater_than",
    value: 50_000_000,
    evidenceIds: ["e1"],
  });
  // A fact recorded with the wrong shape must not quietly clear the client.
  const result = evaluateApplicability(turnover, [fact("company.annual_turnover_inr", "big")]);
  assert.equal(result.decision, "more_information_needed");
});

test("turnover thresholds compare correctly", () => {
  const turnover = rule({
    type: "predicate",
    attribute: "company.annual_turnover_inr",
    operator: "greater_than",
    value: 50_000_000,
    evidenceIds: ["e1"],
  });
  assert.equal(
    evaluateApplicability(turnover, [fact("company.annual_turnover_inr", 60_000_000)]).decision,
    "direct_relevance",
  );
  assert.equal(
    evaluateApplicability(turnover, [fact("company.annual_turnover_inr", 10_000_000)]).decision,
    "no_detected_connection",
  );
});

test("any-of passes on a single satisfied branch", () => {
  const either = rule({
    type: "any",
    children: [
      { type: "predicate", attribute: "company.is_listed", operator: "equals", value: true, evidenceIds: ["e1"] },
      { type: "predicate", attribute: "company.gst_registered", operator: "equals", value: true, evidenceIds: ["e1"] },
    ],
  });
  assert.equal(
    evaluateApplicability(either, [fact("company.gst_registered", true)]).decision,
    "direct_relevance",
  );
});

test("adaptive questions rank the fact that unblocks the most checks", () => {
  const sectorOnly = rule({
    type: "predicate", attribute: "company.sector", operator: "equals", value: "FOOD", evidenceIds: ["e1"],
  });
  const evaluations = [
    evaluateApplicability(foodRule, []),
    evaluateApplicability(sectorOnly, []),
  ];
  const ranked = rankAdaptiveQuestions(evaluations);
  assert.equal(ranked[0]?.key, "company.sector");
  assert.equal(ranked[0]?.resolves, 2);
  assert.ok(ranked[0]?.definition?.question);
});

test("the explanation is generated from the same tree that was evaluated", () => {
  const explanation = explainApplicabilityRule(foodRule.root);
  assert.match(explanation.statement, /^Examine this circular if /);
  assert.equal(explanation.criteria.length, 2);
  assert.ok(explanation.criteria.some((line) => /Fssai Licence|FSSAI/i.test(line)));
});

// ---- parser: untrusted payloads ----

test("a well-formed payload parses", () => {
  const parsed = parseApplicabilityRule(JSON.parse(JSON.stringify(foodRule)));
  assert.ok(parsed.rule);
  assert.deepEqual(collectAttributes(parsed.rule!.root).sort(), [
    "company.fssai_licensed",
    "company.sector",
  ]);
});

test("a predicate citing no evidence is rejected", () => {
  const parsed = parseApplicabilityRule({
    ...foodRule,
    root: { type: "predicate", attribute: "company.sector", operator: "equals", value: "FOOD", evidenceIds: [] },
  });
  assert.equal(parsed.rule, null);
  assert.ok(parsed.errors.length);
});

test("a rule referencing an unknown attribute is rejected, not stored", () => {
  const parsed = parseApplicabilityRule({
    ...foodRule,
    root: { type: "predicate", attribute: "company.astrology_sign", operator: "equals", value: "LEO", evidenceIds: ["e1"] },
  });
  assert.equal(parsed.rule, null);
  assert.ok(parsed.errors.some((error) => /Unknown attribute/.test(error)));
});

test("a value outside the registered vocabulary is rejected", () => {
  const parsed = parseApplicabilityRule({
    ...foodRule,
    root: { type: "predicate", attribute: "company.gst_scheme", operator: "equals", value: "BARTER", evidenceIds: ["e1"] },
  });
  assert.equal(parsed.rule, null);
});

test("evidence quotes must be real strings", () => {
  const parsed = parseApplicabilityRule({ ...foodRule, evidence: [{ id: "e1", marker: "§1", quote: "x", location: "p" }] });
  assert.equal(parsed.rule, null);
});

test("a predicate pointing at absent evidence is rejected", () => {
  const parsed = parseApplicabilityRule({
    ...foodRule,
    root: { type: "predicate", attribute: "company.sector", operator: "equals", value: "FOOD", evidenceIds: ["nope"] },
  });
  assert.equal(parsed.rule, null);
  assert.ok(parsed.errors.some((error) => /missing evidence/.test(error)));
});

test("deeply nested payloads are refused rather than overflowing the stack", () => {
  let node: unknown = { type: "predicate", attribute: "company.sector", operator: "equals", value: "FOOD", evidenceIds: ["e1"] };
  for (let i = 0; i < 60; i += 1) node = { type: "not", child: node };
  const parsed = parseApplicabilityRule({ ...foodRule, root: node });
  assert.equal(parsed.rule, null);
});

test("garbage input is rejected without throwing", () => {
  for (const bad of [null, 42, "rule", [], {}, { version: 0 }]) {
    const parsed = parseApplicabilityRule(bad);
    assert.equal(parsed.rule, null);
    assert.ok(parsed.errors.length);
  }
});
