export const connectorSystems = ["tally", "gst", "income_tax", "mca"] as const;
export type ConnectorSystem = typeof connectorSystems[number];

export const actionTruthStates = [
  "identified",
  "prepared",
  "awaiting_approval",
  "submitted",
  "verified_complete",
  "pending",
  "manual_confirmation",
  "failed",
  "stale",
] as const;
export type ActionTruthState = typeof actionTruthStates[number];

export interface ConnectorEvidence {
  system: ConnectorSystem;
  obligationKey: string;
  periodKey: string;
  state: ActionTruthState;
  observedAt: string;
  freshUntil: string;
  sourceReference?: string | null;
  receiptReference?: string | null;
  evidenceSha256: string;
  connectorVersion: string;
}

export interface ConnectorHealth {
  system: ConnectorSystem;
  mode: "local_companion" | "approved_api" | "browser_bridge";
  status: "not_connected" | "pairing" | "healthy" | "attention" | "offline" | "disabled";
  displayName: string;
  lastCheckedAt: string | null;
  lastSucceededAt: string | null;
  lastErrorCode: string | null;
  connectorVersion: string | null;
}
