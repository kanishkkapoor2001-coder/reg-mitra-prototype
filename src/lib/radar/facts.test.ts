import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRIBUTE_DEFINITIONS,
  expiryFor,
  getAttributeDefinition,
  isStale,
  isUsableFact,
  validateFact,
  type CompanyFact,
} from "./facts.ts";

const fact = (over: Partial<CompanyFact> & Pick<CompanyFact, "key" | "value">): CompanyFact => ({
  source: "ca_confirmed",
  observedAt: new Date("2026-01-01").toISOString(),
  ...over,
});

test("every attribute key is unique", () => {
  const keys = ATTRIBUTE_DEFINITIONS.map((d) => d.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("enumerated attributes accept only listed values", () => {
  assert.deepEqual(validateFact(fact({ key: "company.gst_scheme", value: "COMPOSITION" })), []);
  assert.equal(validateFact(fact({ key: "company.gst_scheme", value: "MADE_UP" })).length, 1);
});

test("value type is enforced", () => {
  assert.equal(validateFact(fact({ key: "company.annual_turnover_inr", value: "lots" })).length, 1);
  assert.deepEqual(validateFact(fact({ key: "company.annual_turnover_inr", value: 25_000_000 })), []);
  assert.equal(validateFact(fact({ key: "company.is_listed", value: "yes" })).length, 1);
  assert.deepEqual(validateFact(fact({ key: "company.is_listed", value: false })), []);
});

test("unknown keys are rejected rather than silently stored", () => {
  assert.equal(validateFact(fact({ key: "company.vibes", value: "good" })).length, 1);
});

test("null means not answered and is always valid", () => {
  assert.deepEqual(validateFact(fact({ key: "company.sector", value: null })), []);
});

test("a fact with no expiry never goes stale", () => {
  const permanent = fact({ key: "company.entity_type", value: "LLP", expiresAt: null });
  assert.equal(isUsableFact(permanent), true);
  assert.equal(isStale(permanent), false);
});

test("an expired fact stops being usable", () => {
  const expired = fact({
    key: "company.is_listed",
    value: true,
    expiresAt: new Date("2026-01-01").toISOString(),
  });
  const now = new Date("2026-06-01");
  assert.equal(isUsableFact(expired, now), false);
  assert.equal(isStale(expired, now), true);
});

test("expiry is computed from the registry", () => {
  const observed = new Date("2026-01-01T00:00:00.000Z");
  // is_listed expires after 90 days
  assert.equal(expiryFor("company.is_listed", observed), new Date("2026-04-01T00:00:00.000Z").toISOString());
  // entity_type never expires
  assert.equal(expiryFor("company.entity_type", observed), null);
});

test("registry entries all carry a reason and a question", () => {
  for (const definition of ATTRIBUTE_DEFINITIONS) {
    assert.ok(definition.why.length > 10, `${definition.key} needs a why`);
    assert.ok(definition.question.endsWith("?"), `${definition.key} question must be a question`);
    assert.ok(getAttributeDefinition(definition.key));
  }
});
