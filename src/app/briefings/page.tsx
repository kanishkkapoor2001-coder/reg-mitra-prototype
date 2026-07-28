import { PageHeading } from "@/components/page-heading";

export default function BriefingsPage() {
  return (
    <>
      <PageHeading eyebrow="Client communication" title="Briefings" description="Prepare concise client updates, then review and approve them before sending." actions={<button className="button primary" type="button">New briefing</button>} />
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon">▤</div>
          <h2>No verified briefing is ready</h2>
          <p>The six previous items in the prototype were illustrative. Connect a trusted source or create a draft manually to begin.</p>
          <button className="button primary" type="button">Create draft briefing</button>
        </div>
      </section>
    </>
  );
}
