import Link from "next/link";
import { DemoNotice } from "@/components/demo-notice";
import { PageHeading } from "@/components/page-heading";
import { workItems } from "@/lib/demo-data";

export default function TodayPage() {
  return (
    <>
      <PageHeading eyebrow="Work queue" title="Today" description="A single, ordered queue for work that needs attention now." actions={<Link className="button primary" href="/assistant">Prepare with Assistant</Link>} />
      <DemoNotice />
      <section className="panel">
        <div className="panel-header"><div><h2>4 items in the demo queue</h2><p>High urgency first, then nearest due date</p></div><button className="button" type="button">Filter</button></div>
        <ul className="work-list">
          {workItems.map((item) => (
            <li className="work-item" key={item.id}>
              <i className={`urgency-dot ${item.urgency}`} />
              <div><p className="work-title">{item.title}</p><span className="work-meta">{item.client} · {item.authority} · {item.state.replace("-", " ")}</span></div>
              <span className="due">{item.due}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
