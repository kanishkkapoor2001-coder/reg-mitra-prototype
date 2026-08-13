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

// A bare `node server.js` on a VPS has no NODE_ENV. If the guard only excluded
// "production", that host would satisfy it — so one stray .env.local copied to
// a server would expose every firm's client roster.
test("an unset or unexpected NODE_ENV never opens the product", () => {
  assert.equal(isDevAuthBypassEnabled(undefined, "1"), false);
  assert.equal(isDevAuthBypassEnabled("", "1"), false);
  assert.equal(isDevAuthBypassEnabled("staging", "1"), false);
  assert.equal(isDevAuthBypassEnabled("test", "1"), false);
});

test("the flag is exact — near-misses do not open the product", () => {
  assert.equal(isDevAuthBypassEnabled("development", "0"), false);
  assert.equal(isDevAuthBypassEnabled("development", "true"), false);
  assert.equal(isDevAuthBypassEnabled("development", "yes"), false);
});

test("the dev bypass applies in local development when explicitly enabled", () => {
  assert.equal(isDevAuthBypassEnabled("development", "1"), true);
});
