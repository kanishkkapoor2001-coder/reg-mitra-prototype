import { TrustBadge } from "@/components/trust-badge";

export function WorkspaceTrustSummary() {
  return (
    <section className="trust-summary" aria-label="Workspace trust summary">
      <div>
        <p className="eyebrow">Sample data</p>
        <h2>This workspace contains sample data</h2>
        <p>
          Client profiles and regulatory claims are sample data. Attach current official
          sources and record a reviewer before relying on any item.
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
