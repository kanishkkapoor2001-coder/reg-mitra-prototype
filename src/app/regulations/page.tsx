import { DemoNotice } from "@/components/demo-notice";
import { PageHeading } from "@/components/page-heading";
import { regulations } from "@/lib/demo-data";

export default function RegulationsPage() {
  return (
    <>
      <PageHeading eyebrow="Intelligence" title="Regulations" description="Track regulatory changes with explicit verification and applicability states." />
      <DemoNotice />
      <section className="panel">
        <div className="panel-header"><div><h2>Recent demo updates</h2><p>Each item requires source verification</p></div><button className="button" type="button">Filter authorities</button></div>
        <ul className="work-list">
          {regulations.map((regulation) => (
            <li className="work-item" key={regulation.id}>
              <i className="urgency-dot medium" />
              <div><p className="work-title">{regulation.title}</p><span className="work-meta">{regulation.authority} · Published {regulation.published} · Effective {regulation.effective}</span></div>
              <span className="status-pill">Unverified · {regulation.impact}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
