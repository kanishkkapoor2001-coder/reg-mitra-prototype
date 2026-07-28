import { EvidencePanel } from "@/components/evidence-panel";
import { PageHeading } from "@/components/page-heading";
import { WorkspaceTrustSummary } from "@/components/workspace-trust-summary";
import { regulations } from "@/lib/demo-data";

export default function RegulationsPage() {
  return (
    <>
      <PageHeading eyebrow="Intelligence" title="Regulations" description="Track regulatory changes with explicit verification and applicability states." />
      <WorkspaceTrustSummary />
      <div className="filter-bar">
        <input className="filter-input" aria-label="Search regulatory items" placeholder="Search regulatory items…" />
        <button className="button" type="button">Filter authorities</button>
      </div>
      <section className="regulation-list" aria-label="Regulatory items">
        {regulations.map((regulation) => (
          <article className="regulation-card" key={regulation.id}>
            <div className="regulation-card-head">
              <div>
                <p className="eyebrow">{regulation.authority}</p>
                <h2>{regulation.title}</h2>
                <span className="regulation-meta">
                  Claimed publication: {regulation.published} · Claimed effective date: {regulation.effective} · {regulation.impact}
                </span>
              </div>
            </div>
            <EvidencePanel evidence={regulation.evidence} />
          </article>
        ))}
      </section>
    </>
  );
}
