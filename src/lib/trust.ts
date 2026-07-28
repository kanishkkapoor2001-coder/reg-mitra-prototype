import type { EvidenceState, ReviewState } from "@/lib/types";

interface StateDefinition {
  label: string;
  description: string;
  tone: "positive" | "warning" | "neutral" | "danger";
}

export const evidenceStates: Record<EvidenceState, StateDefinition> = {
  verified: {
    label: "Verified",
    description: "Matched to an authoritative source and checked by a reviewer.",
    tone: "positive",
  },
  unverified: {
    label: "Source needed",
    description: "No authoritative source has been attached. Do not rely on this item yet.",
    tone: "warning",
  },
  demo: {
    label: "Demo only",
    description: "Illustrative information used to demonstrate the workspace.",
    tone: "neutral",
  },
  stale: {
    label: "Check again",
    description: "The source is older than the workspace review policy allows.",
    tone: "danger",
  },
  "not-connected": {
    label: "Not connected",
    description: "No external system is supplying or confirming this information.",
    tone: "neutral",
  },
  connected: {
    label: "AI connected",
    description: "AI assistance is available through a protected server-side connection.",
    tone: "positive",
  },
};

export const reviewStates: Record<ReviewState, StateDefinition> = {
  "not-reviewed": {
    label: "Not reviewed",
    description: "A qualified professional must review this before it is used.",
    tone: "warning",
  },
  "in-review": {
    label: "In review",
    description: "A reviewer is checking the source, applicability, and proposed action.",
    tone: "neutral",
  },
  approved: {
    label: "Approved",
    description: "A named reviewer approved this specific version.",
    tone: "positive",
  },
};
