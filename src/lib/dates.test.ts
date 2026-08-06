import assert from "node:assert/strict";
import test from "node:test";
import { daysFromTodayIST, istDateToInstant, todayInIST } from "./dates.ts";

// The bug these lock down: between 00:00 and 05:30 IST the UTC date is still
// yesterday, so a UTC-derived "today" told the assistant the wrong date and the
// notice countdown reported a passed deadline as still open (or vice versa).

test("just after IST midnight, today is the new IST day and not the UTC day", () => {
  // 2026-08-06 00:15 IST === 2026-08-05 18:45 UTC
  const justAfterMidnightIST = new Date("2026-08-05T18:45:00Z");
  assert.equal(justAfterMidnightIST.toISOString().slice(0, 10), "2026-08-05", "precondition: UTC is a day behind");
  assert.equal(todayInIST(justAfterMidnightIST), "2026-08-06");
});

test("just before IST midnight, today is still the current IST day", () => {
  // 2026-08-06 23:45 IST === 2026-08-06 18:15 UTC
  assert.equal(todayInIST(new Date("2026-08-06T18:15:00Z")), "2026-08-06");
});

test("through the whole 00:00-05:30 IST window the IST date is stable", () => {
  // 18:30 UTC (00:00 IST) through 23:59 UTC (05:29 IST) — all 6 August IST.
  for (const utc of ["18:30", "20:00", "22:30", "23:59"]) {
    assert.equal(todayInIST(new Date(`2026-08-05T${utc}:00Z`)), "2026-08-06", `failed at ${utc}Z`);
  }
});

test("a deadline today reads as 0 days, not 1", () => {
  const inTheWindow = new Date("2026-08-05T19:00:00Z"); // 00:30 IST on 6 Aug
  assert.equal(daysFromTodayIST("2026-08-06", inTheWindow), 0);
});

test("a deadline yesterday reads as passed", () => {
  const inTheWindow = new Date("2026-08-05T19:00:00Z"); // 00:30 IST on 6 Aug
  assert.equal(daysFromTodayIST("2026-08-05", inTheWindow), -1);
});

test("future and past deadlines count in whole calendar days", () => {
  const noon = new Date("2026-08-06T06:30:00Z"); // 12:00 IST
  assert.equal(daysFromTodayIST("2026-08-20", noon), 14);
  assert.equal(daysFromTodayIST("2026-07-31", noon), -6);
});

test("month and year boundaries are handled", () => {
  assert.equal(todayInIST(new Date("2026-03-31T18:30:00Z")), "2026-04-01");
  assert.equal(todayInIST(new Date("2026-12-31T18:30:00Z")), "2027-01-01");
});

test("a leap day is a real IST date", () => {
  assert.equal(todayInIST(new Date("2028-02-28T18:30:00Z")), "2028-02-29");
});

test("malformed input yields null rather than a wrong number", () => {
  assert.equal(daysFromTodayIST("not-a-date"), null);
  assert.equal(daysFromTodayIST(""), null);
});

test("IST midnight is 18:30 UTC the previous day", () => {
  assert.equal(istDateToInstant("2026-08-06").toISOString(), "2026-08-05T18:30:00.000Z");
});
