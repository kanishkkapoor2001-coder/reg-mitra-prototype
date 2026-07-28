import Link from "next/link";
import { DemoNotice } from "@/components/demo-notice";
import { PageHeading } from "@/components/page-heading";
import { workItems } from "@/lib/demo-data";

const activity = [
  ["Demo scan completed", "38 sample filings evaluated against configured rules", "9:15 AM"],
  ["Draft prepared", "TDS working paper generated for Sharma Pharma", "9:17 AM"],
  ["Review flag added", "FSSAI transition for Royal Spice needs verification", "9:24 AM"],
] as const;

export default function HomePage() {
  return (
    <>
      <PageHeading
        eyebrow="Monday · 28 July"
        title="Good morning, Mehta Shah"
        description="A focused view of what needs attention across your compliance workspace."
        actions={<Link className="button primary" href="/assistant">Ask Reg Mitra <span aria-hidden="true">→</span></Link>}
      />
      <DemoNotice />

      <section className="kpi-grid" aria-label="Workspace summary">
        <article className="kpi-card"><span className="kpi-label">Needs review</span><div className="kpi-value">7</div><div className="kpi-meta"><span>Across 4 demo clients</span><span className="trend">2 high priority</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Due this week</span><div className="kpi-value">12</div><div className="kpi-meta"><span>5 filing types</span><span>Next: 7 May</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Drafts ready</span><div className="kpi-value">6</div><div className="kpi-meta"><span>Awaiting partner review</span><span className="trend">Review queue</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Verified sources</span><div className="kpi-value">0</div><div className="kpi-meta"><span>No portals connected</span><Link className="text-link" href="/settings">Connect</Link></div></article>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header"><div><h2>Priority work</h2><p>Ordered by urgency and due date</p></div><Link className="text-link" href="/today">Open Today →</Link></div>
          <ul className="work-list">
            {workItems.map((item) => (
              <li className="work-item" key={item.id}>
                <i className={`urgency-dot ${item.urgency}`} />
                <div><p className="work-title">{item.title}</p><span className="work-meta">{item.client} · {item.authority}</span></div>
                <span className="due">{item.due}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-header"><div><h2>Workspace activity</h2><p>Illustrative events</p></div><span className="status-pill">Demo</span></div>
          <ul className="activity-list">
            {activity.map(([title, detail, time]) => (
              <li className="activity-item" key={title}><p><strong>{title}</strong><br />{detail}</p><time>{time}</time></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
