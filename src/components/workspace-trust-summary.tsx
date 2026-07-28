import { TrustBadge } from "@/components/trust-badge";

export function WorkspaceTrustSummary() {
  return (
    <section className="trust-summary" aria-label="Workspace trust summary">
      <div>
        <p className="eyebrow">Data confidence</p>
        <h2>Nothing here is represented as live or verified</h2>
        <p>
          This workspace contains illustrative client profiles and regulatory claims.
          Connect authoritative sources and record a reviewer before relying on an item.
        </p>
      </div>
      <div className="trust-summary-states">
        <span><TrustBadge kind="evidence" state="demo" /><small>Client and work data</small></span>
        <span><TrustBadge kind="evidence" state="unverified" /><small>Regulatory claims</small></span>
        <span><TrustBadge kind="evidence" state="not-connected" /><small>External systems</small></span>
      </div>
    </section>
  );
}
