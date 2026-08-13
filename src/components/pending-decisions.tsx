import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import type { ClientImpact } from "@/lib/radar/impacts";

// The queue the whole product exists for: new circulars matched to clients,
// waiting on a yes or no. Grouped by circular, because one change usually
// touches several clients and a CA decides them together.
//
// Collapsible, because it sits above the day's review queue and a busy book can
// push that queue off the screen entirely. <details> rather than React state:
// the decision buttons are plain form posts, so this whole panel stays a server
// component. It reopens on the next load, which is right — deciding one change
// should not hide the rest.

export function PendingDecisions({ impacts }: Readonly<{ impacts: ClientImpact[] }>) {
  const groups = new Map<string, { title: string; authority: string; url: string; items: ClientImpact[] }>();
  for (const impact of impacts) {
    const existing = groups.get(impact.source.id);
    if (existing) existing.items.push(impact);
    else {
      groups.set(impact.source.id, {
        title: impact.source.title,
        authority: impact.source.authority,
        url: impact.source.url,
        items: [impact],
      });
    }
  }

  return (
    <details className="panel decisions-panel" open>
      <summary className="panel-header decisions-summary">
        <div>
          <h2>Changes needing your decision</h2>
          <p>Matched to your client book against the facts you have confirmed.</p>
        </div>
        <span className="radar-count">{impacts.length}</span>
        <span aria-hidden="true" className="decisions-chevron"><ChevronRightIcon /></span>
      </summary>

      <div className="decisions-list">
        {[...groups.values()].map((group) => (
          <article className="decision-group" key={group.url}>
            <div className="decision-head">
              <span className="radar-authority">{group.authority}</span>
              <a href={group.url} target="_blank" rel="noreferrer" className="decision-title">
                {group.title} <span aria-hidden="true">↗</span>
              </a>
            </div>

            <p className="decision-why">{group.items[0]?.applicability}</p>

            {group.items[0]?.evidence.length ? (
              <p className="decision-quote">“{group.items[0].evidence[0]!.quote}”</p>
            ) : null}

            <ul className="decision-clients">
              {group.items.map((impact) => (
                <li key={impact.id}>
                  <Link className="decision-client" href={`/clients/${impact.clientId}#radar`}>
                    {impact.clientName}
                  </Link>
                  <span className="decision-actions">
                    <form action="/api/impacts/review" method="post">
                      <input type="hidden" name="impactId" value={impact.id} />
                      <input type="hidden" name="state" value="approved" />
                      <input type="hidden" name="returnTo" value="/today" />
                      <button className="button small primary" type="submit">Applies</button>
                    </form>
                    <form action="/api/impacts/review" method="post">
                      <input type="hidden" name="impactId" value={impact.id} />
                      <input type="hidden" name="state" value="rejected" />
                      <input type="hidden" name="returnTo" value="/today" />
                      <button className="button small" type="submit">Not applicable</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </details>
  );
}
