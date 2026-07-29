import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionActionTruth,
  effectiveActionTruthState,
  validateConnectorEvidence,
} from "./truth.ts";

const hash = "a".repeat(64);
const now = new Date("2026-07-29T12:00:00.000Z");

test("prepared work cannot jump directly to submitted", () => {
  assert.equal(canTransitionActionTruth("prepared", "submitted"), false);
  assert.equal(canTransitionActionTruth("prepared", "awaiting_approval"), true);
});

test("submitted state requires an external receipt", () => {
  const result = validateConnectorEvidence({
    system: "gst",
    obligationKey: "gstr_3b",
    periodKey: "2026-06",
    state: "submitted",
    observedAt: "2026-07-29T11:00:00.000Z",
    freshUntil: "2026-07-30T11:00:00.000Z",
    evidenceSha256: hash,
    connectorVersion: "0.1.0",
  }, now);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["submitted_requires_receipt"]);
});

test("verified complete requires source read-back", () => {
  const result = validateConnectorEvidence({
    system: "mca",
    obligationKey: "dir_3_kyc",
    periodKey: "FY2026-27",
    state: "verified_complete",
    observedAt: "2026-07-29T11:00:00.000Z",
    freshUntil: "2026-07-30T11:00:00.000Z",
    evidenceSha256: hash,
    connectorVersion: "0.1.0",
  }, now);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["verified_requires_source_reference"]);
});

test("expired evidence becomes stale even if it was once verified", () => {
  assert.equal(effectiveActionTruthState({
    state: "verified_complete",
    freshUntil: "2026-07-29T11:59:59.000Z",
  }, now), "stale");
});
