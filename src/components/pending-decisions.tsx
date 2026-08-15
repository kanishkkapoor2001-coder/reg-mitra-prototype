"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { reviewImpact, type ReviewState } from "@/lib/radar/review-client";
import type { ClientImpact } from "@/lib/radar/impact-types";

// The queue the whole product exists for: new circulars matched to clients,
// waiting on a yes or no. Grouped by circular, because one change usually
// touches several clients and a CA decides them together.
//
// Decisions are optimistic: the row leaves the moment the button is pressed and
// the write happens behind it, reverting with an error only if it fails. The
// old form-post flow re-rendered the entire page per decision, which made the
// core loop of the product feel like paperwork — five decisions cost five full
// page loads.
//
// Collapsible via <details>, because it sits above the day's review queue and a
// busy book can push that queue off the screen entirely.

export function PendingDecisions({ impacts }: Readonly<{ impacts: ClientImpact[] }>) {
  const router = useRouter();
  const [decided, setDecided] = useState<Record<string, ReviewState>>({});
  const [failedId, setFailedId] = useState<string | null>(null);

  const open = impacts.filter((impact) => !decided[impact.id]);

  const groups = new Map<string, { title: string; authority: string; url: string; items: ClientImpact[] }>();
  for (const impact of open) {
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

  function decide(impact: ClientImpact, state: ReviewState) {
    setFailedId(null);
    setDecided((current) => ({ ...current, [impact.id]: state }));
    void reviewImpact(impact.id, state).then((ok) => {
      if (!ok) {
        // Revert: the row comes back with an inline explanation. A decision
        // that silently failed to record is worse than one that visibly did.
        setDecided((current) => {
          const next = { ...current };
          delete next[impact.id];
          return next;
        });
        setFailedId(impact.id);
        return;
      }
      // Background sync so the server tree (counts, audit trail, this panel's
      // own presence) agrees on the next navigation. Nothing waits on it.
      router.refresh();
    });
  }

  return (
    <details className="panel decisions-panel" open>
      <summary className="panel-header decisions-summary">
        <div>
          <h2>Changes needing your decision</h2>
          <p>Matched to your client book against the facts you have confirmed.</p>
        </div>
        <span className="radar-count">{open.length}</span>
        <span aria-hidden="true" className="decisions-chevron"><ChevronRightIcon /></span>
      </summary>

      {open.length === 0 ? (
        <p className="decisions-done" role="status">
          All decided. Approved changes are on each client’s page; this panel clears on your next visit.
        </p>
      ) : (
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
                    {failedId === impact.id ? (
                      <span className="decision-failed" role="alert">Could not record — try again</span>
                    ) : null}
                    <span className="decision-actions">
                      <button
                        className="button small primary"
                        onClick={() => decide(impact, "approved")}
                        type="button"
                      >
                        Applies
                      </button>
                      <button
                        className="button small"
                        onClick={() => decide(impact, "rejected")}
                        type="button"
                      >
                        Not applicable
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </details>
  );
}
