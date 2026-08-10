import assert from "node:assert/strict";
import test from "node:test";
import { getComplianceEvents } from "./compliance-calendar.ts";

// Integration of the effective-dated rules into the rendered calendar.
// The behaviour that matters to a filing professional: a date is shown only for
// a period the rule set actually describes, and never silently projected.

test("a covered month renders its obligations with a statutory basis", () => {
  const events = getComplianceEvents(2026, 7); // August 2026
  assert.ok(events.length > 0);
  for (const event of events) {
    assert.ok(event.statutoryBasis, `${event.shortTitle} must cite the provision fixing the date`);
    assert.match(event.date, /^2026-08-\d{2}$/);
  }
});

test("GSTR-3B falls on the 20th in a covered month", () => {
  const gstr3b = getComplianceEvents(2026, 7).find((e) => e.shortTitle === "GSTR-3B");
  assert.equal(gstr3b?.date, "2026-08-20");
  assert.match(gstr3b!.statutoryBasis!, /Section 39, CGST Act/);
});

test("TDS for March is shown on 30 April", () => {
  const tds = getComplianceEvents(2026, 3).find((e) => e.shortTitle === "TDS deposit");
  assert.equal(tds?.date, "2026-04-30");
});

test("a month before coverage renders NOTHING rather than today's dates", () => {
  // This is the fix. Previously June 2024 rendered the full set of 2026 dates.
  assert.deepEqual(getComplianceEvents(2024, 5), []);
});

test("a month beyond the horizon renders nothing rather than a forecast", () => {
  assert.deepEqual(getComplianceEvents(2031, 0), []);
});

test("no event carries an extension while none is recorded", () => {
  for (const event of getComplianceEvents(2026, 7)) {
    assert.equal(event.extension, undefined);
  }
});

test("quarterly and instalment obligations only appear in their own months", () => {
  const august = getComplianceEvents(2026, 7).map((e) => e.shortTitle);
  assert.ok(!august.includes("Advance tax"), "August is not an instalment month");

  const september = getComplianceEvents(2026, 8).map((e) => e.shortTitle);
  assert.ok(september.includes("Advance tax"), "15 September is an instalment date");

  const july = getComplianceEvents(2026, 6).map((e) => e.shortTitle);
  assert.ok(july.includes("TDS statement"), "31 July is the Q1 statement date");
});

test("events are ordered by date", () => {
  const dates = getComplianceEvents(2026, 7).map((e) => e.date);
  assert.deepEqual([...dates].sort(), dates);
});
