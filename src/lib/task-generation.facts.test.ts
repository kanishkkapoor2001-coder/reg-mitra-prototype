import assert from "node:assert/strict";
import test from "node:test";
import { generateCandidateTasks, type SeedClient } from "./task-generation.ts";
import type { FactValue } from "./radar/facts.ts";

// The asymmetry these tests pin down: a deadline is dropped only on a
// *confirmed contradiction*. An unknown fact must still surface the obligation,
// because a missed filing costs far more than an extra item to dismiss.

const now = new Date("2026-08-06T09:00:00+05:30");

function client(facts?: Record<string, FactValue>): SeedClient {
  return {
    id: "c1",
    displayName: "Probe Co",
    sector: null,
    stateCode: null,
    facts: facts ? new Map(Object.entries(facts)) : undefined,
  };
}

function authorities(tasks: ReturnType<typeof generateCandidateTasks>): Set<string> {
  return new Set(tasks.map((task) => String(task.metadata.authority)));
}

test("a client with no recorded facts still gets every obligation", () => {
  const withNothing = generateCandidateTasks([client()], now);
  const withEmpty = generateCandidateTasks([client({})], now);
  assert.ok(withNothing.length > 0, "expected obligations in the horizon");
  assert.equal(withEmpty.length, withNothing.length);
});

test("a confirmed non-GST client loses GST deadlines only", () => {
  const all = generateCandidateTasks([client()], now);
  const notRegistered = generateCandidateTasks([client({ "company.gst_registered": false })], now);

  assert.ok(
    [...authorities(all)].some((a) => /goods and services tax/i.test(a)),
    "baseline should contain GST obligations",
  );
  assert.ok(
    ![...authorities(notRegistered)].some((a) => /goods and services tax/i.test(a)),
    "GST obligations should be excluded",
  );
  // Everything that is not GST survives.
  const others = [...authorities(all)].filter((a) => !/goods and services tax/i.test(a));
  for (const authority of others) {
    assert.ok(authorities(notRegistered).has(authority), `${authority} should remain`);
  }
});

test("a confirmed GST-registered client keeps GST deadlines", () => {
  const registered = generateCandidateTasks([client({ "company.gst_registered": true })], now);
  assert.ok([...authorities(registered)].some((a) => /goods and services tax/i.test(a)));
});

test("a small headcount rules EPF out, a large one does not", () => {
  const small = generateCandidateTasks([client({ "company.employee_count": 4 })], now);
  const large = generateCandidateTasks([client({ "company.employee_count": 250 })], now);
  assert.ok(![...authorities(small)].some((a) => /provident fund/i.test(a)));
  assert.ok([...authorities(large)].some((a) => /provident fund/i.test(a)));
});

test("two differently-profiled clients no longer share one identical calendar", () => {
  const [tasks] = [generateCandidateTasks(
    [
      { ...client({ "company.gst_registered": false, "company.employee_count": 2 }), id: "small" },
      { ...client({ "company.gst_registered": true, "company.employee_count": 400 }), id: "big" },
    ],
    now,
  )];
  const forSmall = tasks.filter((task) => task.clientId === "small").length;
  const forBig = tasks.filter((task) => task.clientId === "big").length;
  assert.ok(forSmall > 0 && forBig > 0);
  assert.notEqual(forSmall, forBig);
});
