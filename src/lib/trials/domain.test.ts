import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeEmail,
  normalizeOrganizationDomain,
  resolveOrganizationDomain,
} from "./domain.ts";

test("normalizes work email and organization domains", () => {
  assert.equal(normalizeEmail(" Partner@Firm.IN "), "partner@firm.in");
  assert.equal(normalizeOrganizationDomain("https://www.Firm.IN/about"), "firm.in");
});

test("uses the work email domain when no website is supplied", () => {
  assert.deepEqual(resolveOrganizationDomain("partner@firm.in", ""), { domain: "firm.in" });
});

test("requires an organization domain for public email providers", () => {
  assert.deepEqual(resolveOrganizationDomain("partner@gmail.com", ""), {
    domain: null,
    reason: "organization_required",
  });
});

test("rejects a mismatched organization domain for a work email", () => {
  assert.deepEqual(resolveOrganizationDomain("partner@firm.in", "other.in"), {
    domain: null,
    reason: "domain_mismatch",
  });
});
