import assert from "node:assert/strict";
import test from "node:test";
import {
  getFounderAccessEmails,
  isValidFounderAccessCode,
} from "./founder-access.ts";

test("founder codes ignore surrounding whitespace and letter case", () => {
  assert.equal(isValidFounderAccessCode("  rm-owner-2026  ", "RM-OWNER-2026"), true);
});

test("founder codes reject empty, missing, and incorrect values", () => {
  assert.equal(isValidFounderAccessCode("", "RM-OWNER-2026"), false);
  assert.equal(isValidFounderAccessCode("RM-OWNER-2026", ""), false);
  assert.equal(isValidFounderAccessCode("RM-OTHER-2026", "RM-OWNER-2026"), false);
});

test("founder emails are normalized and empty entries are removed", () => {
  assert.deepEqual(
    getFounderAccessEmails(" Founder@Lerno.ai, ,second@lerno.ai "),
    ["founder@lerno.ai", "second@lerno.ai"],
  );
});
