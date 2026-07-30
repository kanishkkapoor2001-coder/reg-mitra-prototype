import Link from "next/link";
import { FileIcon, SparklesIcon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { ReviewGate } from "@/components/review-gate";

const demoBriefings = [
  {
    client: "Sharma Pharma",
    title: "IGST rate change: client impact note",
    source: "CBIC · Source review required",
    state: "Needs review",
  },
  {
    client: "Royal Spice Foods",
    title: "FSSAI transition: action summary",
    source: "FSSAI · Draft prepared",
    state: "Draft",
  },
  {
    client: "NexGen IT Services",
    title: "Karnataka overtime amendment",
    source: "State notification · Applicability check",
    state: "Needs facts",
  },
] as const;

export default function BriefingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Prepared work"
        title="Internal drafts and review"
        description="Review source-linked briefs, client requests, checklists, and proposed calendar changes."
        actions={<Link className="button primary" href="/assistant?prompt=Prepare%20an%20internal%20client%20briefing"><SparklesIcon /> Prepare internal draft</Link>}
      />
      <section className="briefing-overview" aria-labelledby="briefing-overview-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sample draft queue</p>
            <h2 id="briefing-overview-title">Three internal drafts awaiting a decision</h2>
            <p>Sample data. Nothing has been sent to a client.</p>
          </div>
        </div>
        <div className="briefing-grid">
          {demoBriefings.map((briefing) => (
            <article className="briefing-card" key={briefing.title}>
              <div className="briefing-card-heading">
                <span className="briefing-icon"><FileIcon /></span>
                <span className="status-pill">{briefing.state}</span>
              </div>
              <p className="eyebrow">{briefing.client}</p>
              <h3>{briefing.title}</h3>
              <p>{briefing.source}</p>
              <Link
                className="text-link"
                href={`/assistant?prompt=${encodeURIComponent(`Prepare a client briefing for ${briefing.client}: ${briefing.title}`)}`}
              >
                Open internal draft →
              </Link>
            </article>
          ))}
        </div>
      </section>
      <div style={{ marginTop: 14 }}>
        <ReviewGate
          title="A reviewer approves every client message"
          description="Before sending, confirm the official source, the client facts, and the recommended action."
        >
          <div className="button-row">
            <Link className="button small" href="/settings">See review settings</Link>
            <span className="locked-action">The demo never sends messages.</span>
          </div>
        </ReviewGate>
      </div>
    </>
  );
}
