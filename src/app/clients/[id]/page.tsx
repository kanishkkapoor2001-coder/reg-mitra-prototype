import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoNotice } from "@/components/demo-notice";
import { EvidencePanel } from "@/components/evidence-panel";
import { ReviewGate } from "@/components/review-gate";
import { clients, getClient, workItems } from "@/lib/demo-data";
import type { EvidenceRecord } from "@/lib/types";

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return clients.map((client) => ({ id: client.id }));
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();
  const items = workItems.filter((item) => item.client === client.shortName);
  const clientEvidence: EvidenceRecord = {
    state: "demo",
    source: null,
    applicability: `Illustrative profile for ${client.sector} workflows.`,
    reviewState: "not-reviewed",
    reviewedBy: null,
    caveat: "Identifiers, obligations, scores, and statuses are illustrative. Confirm against client records and authoritative portals.",
  };

  return (
    <>
      <Link className="text-link" href="/clients">← All clients</Link>
      <section className="detail-hero" style={{ marginTop: 16 }}>
        <span className="detail-avatar">{client.initials}</span>
        <div>
          <p className="eyebrow">Client workspace</p>
          <h1>{client.name}</h1>
          <p className="page-subtitle">{client.sector} · {client.location}</p>
          <div className="identifier-list">{client.identifiers.map((identifier) => <span className="identifier" key={identifier}>{identifier}</span>)}</div>
        </div>
        <div className="detail-risk"><strong>{client.riskScore}</strong><span>Illustrative risk score · {client.risk}</span></div>
      </section>
      <DemoNotice />
      <div style={{ marginBottom: 18 }}>
        <EvidencePanel evidence={clientEvidence} />
      </div>
      <section className="kpi-grid">
        <article className="kpi-card"><span className="kpi-label">Pending actions</span><div className="kpi-value">{client.pending}</div><div className="kpi-meta"><span>Needs review</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Due this week</span><div className="kpi-value">{client.dueThisWeek}</div><div className="kpi-meta"><span>Illustrative deadlines</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Marked compliant</span><div className="kpi-value">{client.compliant}</div><div className="kpi-meta"><span>Not portal-verified</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Connected sources</span><div className="kpi-value">0</div><div className="kpi-meta"><span>Set up in Settings</span></div></article>
      </section>
      <section className="panel">
        <div className="panel-header"><div><h2>Open work</h2><p>Items associated with this client profile</p></div><Link className="button" href={`/assistant?prompt=${encodeURIComponent(`What needs attention for ${client.shortName}?`)}`}>Ask about client</Link></div>
        {items.length ? (
          <ul className="work-list">{items.map((item) => <li className="work-item" key={item.id}><i className={`urgency-dot ${item.urgency}`} /><div><p className="work-title">{item.title}</p><span className="work-meta">{item.authority} · {item.state.replace("-", " ")}</span></div><span className="due">{item.due}</span></li>)}</ul>
        ) : (
          <div className="empty-state"><h2>No actions listed</h2><p>Prepare a review path in Ask Reg Mitra, or connect a verified source before tracking live work.</p><Link className="button" href={`/assistant?prompt=${encodeURIComponent(`Prepare a compliance review for ${client.shortName}`)}`}>Prepare review</Link></div>
        )}
      </section>
      <div style={{ marginTop: 14 }}>
        <ReviewGate
          title="Professional review required before action"
          description="Confirm the source, period, client applicability, and filing position. Reg Mitra does not replace professional judgement or an authoritative portal."
        >
          <div className="button-row">
            <Link className="button small" href={`/assistant?prompt=${encodeURIComponent(`Prepare a review checklist for ${client.shortName}`)}`}>Prepare review checklist</Link>
            <span className="locked-action">Approval unlocks after evidence and a reviewer are recorded.</span>
          </div>
        </ReviewGate>
      </div>
    </>
  );
}
