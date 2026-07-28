import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoNotice } from "@/components/demo-notice";
import { clients, getClient, workItems } from "@/lib/demo-data";

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
        <div className="detail-risk"><strong>{client.riskScore}</strong><span>Demo risk score · {client.risk}</span></div>
      </section>
      <DemoNotice />
      <section className="kpi-grid">
        <article className="kpi-card"><span className="kpi-label">Pending actions</span><div className="kpi-value">{client.pending}</div><div className="kpi-meta"><span>Needs review</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Due this week</span><div className="kpi-value">{client.dueThisWeek}</div><div className="kpi-meta"><span>Illustrative deadlines</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Marked compliant</span><div className="kpi-value">{client.compliant}</div><div className="kpi-meta"><span>Not portal-verified</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Connected sources</span><div className="kpi-value">0</div><div className="kpi-meta"><span>Set up in Settings</span></div></article>
      </section>
      <section className="panel">
        <div className="panel-header"><div><h2>Open work</h2><p>Items associated with this demo client</p></div><Link className="button" href="/assistant">Ask about client</Link></div>
        {items.length ? (
          <ul className="work-list">{items.map((item) => <li className="work-item" key={item.id}><i className={`urgency-dot ${item.urgency}`} /><div><p className="work-title">{item.title}</p><span className="work-meta">{item.authority} · {item.state.replace("-", " ")}</span></div><span className="due">{item.due}</span></li>)}</ul>
        ) : (
          <div className="empty-state"><div className="empty-state-icon">✓</div><h2>No demo actions listed</h2><p>Connect verified sources or add an obligation to begin tracking work for this client.</p><button className="button" type="button">Add obligation</button></div>
        )}
      </section>
    </>
  );
}
