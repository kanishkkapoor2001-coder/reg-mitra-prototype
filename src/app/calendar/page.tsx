import { PageHeading } from "@/components/page-heading";

export default function CalendarPage() {
  return (
    <>
      <PageHeading eyebrow="Obligations" title="Compliance calendar" description="Plan statutory and client-specific deadlines with accountable owners and source verification." actions={<button className="button primary" type="button">Add deadline</button>} />
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon">□</div>
          <h2>No verified deadlines yet</h2>
          <p>Connect a portal, import an obligation register, or add a deadline manually. Demo dates are intentionally excluded from this operational calendar.</p>
          <button className="button" type="button">Import obligations</button>
        </div>
      </section>
    </>
  );
}
