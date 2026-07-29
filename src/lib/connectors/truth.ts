import type { ActionTruthState, ConnectorEvidence } from "@/lib/connectors/types";

const transitions: Record<ActionTruthState, ReadonlySet<ActionTruthState>> = {
  identified: new Set(["prepared", "pending", "manual_confirmation", "failed", "stale"]),
  prepared: new Set(["awaiting_approval", "manual_confirmation", "failed", "stale"]),
  awaiting_approval: new Set(["prepared", "submitted", "manual_confirmation", "failed", "stale"]),
  submitted: new Set(["verified_complete", "pending", "failed", "stale"]),
  verified_complete: new Set(["pending", "stale"]),
  pending: new Set(["prepared", "submitted", "verified_complete", "failed", "stale"]),
  manual_confirmation: new Set(["prepared", "pending", "failed", "stale"]),
  failed: new Set(["identified", "prepared", "pending", "stale"]),
  stale: new Set(["pending", "verified_complete", "manual_confirmation", "failed"]),
};

export function canTransitionActionTruth(
  current: ActionTruthState,
  next: ActionTruthState,
) {
  return current === next || transitions[current].has(next);
}

export function validateConnectorEvidence(evidence: ConnectorEvidence, now = new Date()) {
  const errors: string[] = [];
  const observedAt = new Date(evidence.observedAt);
  const freshUntil = new Date(evidence.freshUntil);

  if (!Number.isFinite(observedAt.getTime())) errors.push("observed_at_invalid");
  if (!Number.isFinite(freshUntil.getTime())) errors.push("fresh_until_invalid");
  if (
    Number.isFinite(observedAt.getTime())
    && Number.isFinite(freshUntil.getTime())
    && freshUntil <= observedAt
  ) {
    errors.push("freshness_window_invalid");
  }
  if (!/^[a-f0-9]{64}$/.test(evidence.evidenceSha256)) errors.push("evidence_hash_invalid");
  if (evidence.state === "submitted" && !evidence.receiptReference?.trim()) {
    errors.push("submitted_requires_receipt");
  }
  if (evidence.state === "verified_complete" && !evidence.sourceReference?.trim()) {
    errors.push("verified_requires_source_reference");
  }
  if (
    evidence.state !== "stale"
    && Number.isFinite(freshUntil.getTime())
    && freshUntil <= now
  ) {
    errors.push("evidence_is_stale");
  }

  return { valid: errors.length === 0, errors };
}

export function effectiveActionTruthState(
  evidence: Pick<ConnectorEvidence, "state" | "freshUntil">,
  now = new Date(),
): ActionTruthState {
  const freshUntil = new Date(evidence.freshUntil);
  if (!Number.isFinite(freshUntil.getTime()) || freshUntil <= now) return "stale";
  return evidence.state;
}
