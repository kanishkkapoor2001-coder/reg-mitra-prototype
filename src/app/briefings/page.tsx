import { PageHeading } from "@/components/page-heading";
import { ReviewGate } from "@/components/review-gate";

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
      <div style={{ marginTop: 14 }}>
        <ReviewGate
          title="Sending is locked until approval"
          description="A named reviewer must confirm every source, client-specific implication, and recommended action before a briefing can be sent."
        >
          <div className="button-row">
            <button className="button small" type="button">View review policy</button>
            <button className="button small" type="button" disabled>Send briefing</button>
          </div>
        </ReviewGate>
      </div>
    </>
  );
}
