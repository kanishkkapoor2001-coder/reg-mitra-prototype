import assert from "node:assert/strict";
import { test } from "node:test";
import { callerKey, checkRateLimit, resetRateLimits } from "./rate-limit.ts";

const rule = { limit: 3, windowMs: 60_000 };

test("allows up to the limit, then blocks", () => {
  resetRateLimits();
  const now = 1_000_000;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const verdict = checkRateLimit("k", rule, now);
    assert.equal(verdict.allowed, true, `attempt ${attempt} should be allowed`);
    assert.equal(verdict.remaining, 3 - attempt);
  }
  const blocked = checkRateLimit("k", rule, now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds > 0, "must tell the caller when to retry");
});

test("the window resets", () => {
  resetRateLimits();
  const now = 2_000_000;
  for (let attempt = 0; attempt < 3; attempt += 1) checkRateLimit("k", rule, now);
  assert.equal(checkRateLimit("k", rule, now).allowed, false);
  // One millisecond past the window and the caller is allowed again.
  assert.equal(checkRateLimit("k", rule, now + rule.windowMs + 1).allowed, true);
});

test("callers are counted independently", () => {
  resetRateLimits();
  const now = 3_000_000;
  for (let attempt = 0; attempt < 3; attempt += 1) checkRateLimit("a", rule, now);
  assert.equal(checkRateLimit("a", rule, now).allowed, false, "a is exhausted");
  assert.equal(checkRateLimit("b", rule, now).allowed, true, "b must be unaffected");
});

test("caller key uses the forwarded client IP and is scoped", () => {
  const request = new Request("https://example.test", {
    headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
  });
  assert.equal(callerKey(request, "chat"), "chat:203.0.113.7");
  // Same IP under a different scope is a different bucket, so an upload cannot
  // consume a caller's question allowance.
  assert.notEqual(callerKey(request, "chat"), callerKey(request, "upload"));
});

test("a caller with no identifying headers still gets a bucket", () => {
  const request = new Request("https://example.test");
  assert.equal(callerKey(request, "chat"), "chat:unknown");
});

test("the eval escape hatch cannot be enabled in production", () => {
  const prevEnv = process.env.NODE_ENV;
  const prevFlag = process.env.REGMITRA_DISABLE_RATE_LIMIT;
  try {
    resetRateLimits();
    // Flag set, but production: the limiter must still bite.
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.REGMITRA_DISABLE_RATE_LIMIT = "true";
    const rule = { limit: 1, windowMs: 60_000 };
    assert.equal(checkRateLimit("prod-key", rule).allowed, true);
    assert.equal(checkRateLimit("prod-key", rule).allowed, false);

    // Same flag outside production: bypassed.
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    resetRateLimits();
    assert.equal(checkRateLimit("dev-key", rule).allowed, true);
    assert.equal(checkRateLimit("dev-key", rule).allowed, true);

    // Not set at all outside production: limiter active.
    delete process.env.REGMITRA_DISABLE_RATE_LIMIT;
    resetRateLimits();
    assert.equal(checkRateLimit("dev-key2", rule).allowed, true);
    assert.equal(checkRateLimit("dev-key2", rule).allowed, false);
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
    if (prevFlag === undefined) delete process.env.REGMITRA_DISABLE_RATE_LIMIT;
    else process.env.REGMITRA_DISABLE_RATE_LIMIT = prevFlag;
  }
});
