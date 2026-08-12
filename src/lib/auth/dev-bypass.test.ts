import assert from "node:assert/strict";
import test from "node:test";
import { isDevAuthBypassEnabled } from "./dev-bypass.ts";

// The bypass skips authentication, the approval gate and the workspace check in
// one step. If it could ever be switched on in a deployment, any visitor would
// reach every firm's client roster. These assert that it cannot.

test("the dev bypass cannot be enabled in production", () => {
  assert.equal(isDevAuthBypassEnabled("production", "1"), false);
  assert.equal(isDevAuthBypassEnabled("production", "true"), false);
});

test("the dev bypass requires the flag, not merely a non-production build", () => {
  assert.equal(isDevAuthBypassEnabled("development", undefined), false);
  assert.equal(isDevAuthBypassEnabled("development", ""), false);
  assert.equal(isDevAuthBypassEnabled("test", undefined), false);
});

test("the flag is exact — near-misses do not open the product", () => {
  assert.equal(isDevAuthBypassEnabled("development", "0"), false);
  assert.equal(isDevAuthBypassEnabled("development", "true"), false);
  assert.equal(isDevAuthBypassEnabled("development", "yes"), false);
});

test("the dev bypass applies in local development when explicitly enabled", () => {
  assert.equal(isDevAuthBypassEnabled("development", "1"), true);
  assert.equal(isDevAuthBypassEnabled("test", "1"), true);
});

test("an unset NODE_ENV still requires the flag", () => {
  assert.equal(isDevAuthBypassEnabled(undefined, undefined), false);
  assert.equal(isDevAuthBypassEnabled(undefined, "1"), true);
});
