import assert from "node:assert/strict";
import test from "node:test";
import { corpusFreshness } from "./freshness.ts";

const now = new Date("2026-08-06T12:00:00+05:30");

test("a corpus built today is current and carries no warning", () => {
  const f = corpusFreshness("2026-08-06T07:00:00.000Z", now);
  assert.equal(f.level, "current");
  assert.equal(f.warning, null);
  assert.match(f.label, /today/);
});

test("the real audit-day corpus (31 Jul) is reported as ageing, with its age stated", () => {
  const f = corpusFreshness("2026-07-31T07:57:44.298Z", now);
  assert.equal(f.ageDays, 6);
  assert.match(f.label, /31 Jul 2026/);
  assert.match(f.label, /6 days ago/);
});

test("past a week the reader is told what is missing", () => {
  const f = corpusFreshness("2026-07-29T00:00:00.000Z", now);
  assert.equal(f.level, "ageing");
  assert.match(f.warning!, /not in these sources yet/);
});

test("past three weeks it is a warning, not a caveat", () => {
  const f = corpusFreshness("2026-07-01T00:00:00.000Z", now);
  assert.equal(f.level, "stale");
  assert.match(f.warning!, /significantly out of date/);
});

test("an unparseable build date is treated as stale, never as current", () => {
  const f = corpusFreshness("not-a-date", now);
  assert.equal(f.level, "stale");
  assert.ok(f.warning);
});

test("a future build date does not produce a negative age", () => {
  assert.equal(corpusFreshness("2026-09-01T00:00:00.000Z", now).ageDays, 0);
});
