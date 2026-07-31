import Link from "next/link";
import type { EvidenceRecord } from "@/lib/types";
import { TrustBadge } from "@/components/trust-badge";

interface EvidencePanelProps {
  evidence: EvidenceRecord;
  compact?: boolean;
}

export function EvidencePanel({ evidence, compact = false }: EvidencePanelProps) {
  return (
    <section className={`evidence-panel ${compact ? "compact" : ""}`} aria-label="Evidence and review status">
      <div className="evidence-heading">
        <div>
          <p className="eyebrow">Evidence</p>
          <h3>{evidence.source ? evidence.source.title : "No official source attached"}</h3>
        </div>
        <div className="trust-badge-row">
          <TrustBadge kind="evidence" state={evidence.state} />
          <TrustBadge kind="review" state={evidence.reviewState} />
        </div>
      </div>

      {!compact ? (
        <dl className="evidence-details">
          <div>
            <dt>Publisher</dt>
            <dd>{evidence.source?.publisher ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt>Last checked</dt>
            <dd>{evidence.source?.checkedAt ?? "Not checked"}</dd>
          </div>
          <div>
            <dt>Applicability</dt>
            <dd>{evidence.applicability}</dd>
          </div>
          <div>
            <dt>Reviewed by</dt>
            <dd>{evidence.reviewedBy ?? "No reviewer"}</dd>
          </div>
        </dl>
      ) : null}

      <p className="evidence-caveat">{evidence.caveat}</p>
      {evidence.source ? (
        <a className="text-link" href={evidence.source.url} target="_blank" rel="noreferrer">
          Open official source ↗
        </a>
      ) : (
        <Link className="button small" href="/settings">Review source setup</Link>
      )}
    </section>
  );
}
