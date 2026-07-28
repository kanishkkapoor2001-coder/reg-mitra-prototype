import Link from "next/link";
import { FileIcon, SparklesIcon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { ReviewGate } from "@/components/review-gate";

export default function BriefingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Client communication"
        title="Briefings"
        description="Prepare concise client updates, then review and approve them before sending."
        actions={<Link className="button primary" href="/assistant?prompt=Prepare%20a%20client%20briefing"><SparklesIcon /> Prepare briefing</Link>}
      />
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><FileIcon /></div>
          <h2>No verified briefing is ready</h2>
          <p>Use Ask Reg Mitra to prepare a local draft, then attach authoritative sources and complete professional review.</p>
          <Link className="button primary" href="/assistant?prompt=Prepare%20a%20client%20briefing"><SparklesIcon /> Prepare a draft</Link>
        </div>
      </section>
      <div style={{ marginTop: 14 }}>
        <ReviewGate
          title="Sending is locked until approval"
          description="A named reviewer must confirm every source, client-specific implication, and recommended action before a briefing can be sent."
        >
          <div className="button-row">
            <Link className="button small" href="/settings">View review policy</Link>
            <span className="locked-action">Sending becomes available after a verified draft is approved.</span>
          </div>
        </ReviewGate>
      </div>
    </>
  );
}
