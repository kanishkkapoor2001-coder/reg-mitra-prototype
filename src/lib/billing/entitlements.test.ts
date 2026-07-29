import assert from "node:assert/strict";
import test from "node:test";
import { hasProductEntitlement, trialDaysRemaining } from "./entitlements.ts";

const now = new Date("2026-07-29T00:00:00.000Z");

test("active subscription is entitled", () => {
  assert.equal(hasProductEntitlement("active", null, now), true);
});

test("unexpired trial is entitled", () => {
  assert.equal(hasProductEntitlement("trialing", "2026-08-02T00:00:00.000Z", now), true);
  assert.equal(trialDaysRemaining("2026-08-02T00:00:00.000Z", now), 4);
});

test("expired, canceled and past-due access fails closed", () => {
  assert.equal(hasProductEntitlement("trialing", "2026-07-28T23:59:59.000Z", now), false);
  assert.equal(hasProductEntitlement("expired", null, now), false);
  assert.equal(hasProductEntitlement("canceled", null, now), false);
  assert.equal(hasProductEntitlement("past_due", null, now), false);
});
