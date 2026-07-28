import type { EvidenceState, ReviewState } from "@/lib/types";
import { evidenceStates, reviewStates } from "@/lib/trust";

interface TrustBadgeProps {
  kind: "evidence";
  state: EvidenceState;
}

interface ReviewBadgeProps {
  kind: "review";
  state: ReviewState;
}

type BadgeProps = TrustBadgeProps | ReviewBadgeProps;

export function TrustBadge(props: BadgeProps) {
  const definition = props.kind === "evidence"
    ? evidenceStates[props.state]
    : reviewStates[props.state];

  return (
    <span className={`trust-badge ${definition.tone}`} title={definition.description}>
      <i aria-hidden="true" />
      {definition.label}
    </span>
  );
}
