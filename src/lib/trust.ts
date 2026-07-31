import type { EvidenceState, ReviewState } from "@/lib/types";

interface StateDefinition {
  label: string;
  description: string;
  tone: "positive" | "warning" | "neutral" | "danger";
}

export const evidenceStates: Record<EvidenceState, StateDefinition> = {
  verified: {
    label: "Source reviewed",
    description: "A reviewer checked the official source for this specific item.",
    tone: "positive",
  },
  unverified: {
    label: "Source not reviewed",
    description: "An official source may be linked, but a reviewer has not approved this item.",
    tone: "warning",
  },
  demo: {
    label: "Sample data",
    description: "Sample information used to preview the workspace.",
    tone: "neutral",
  },
  stale: {
    label: "Source may be outdated",
    description: "The source is older than the workspace review policy allows.",
    tone: "danger",
  },
  "not-connected": {
    label: "No connection",
    description: "No external system is supplying or confirming this information.",
    tone: "neutral",
  },
  connected: {
    label: "Indexed",
    description: "Official documents or source summaries are available in workspace search.",
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
