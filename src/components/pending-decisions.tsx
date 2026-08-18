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

/** The recorded fact behind a match — "Sector is Food" from the stored rule. */
function matchedFact(applicability: string): string {
  return applicability
    .replace(/^\s*Examine this circular if\s*/i, "")
    .replace(/\.\s*$/, "")
    .trim() || "matching this client's profile";
}

/**
 * The stored applicability reads as the matcher's own instruction — "Examine
 * this circular if Sector is Food." A CA looking at a named client needs the
 * fact that matched, not the machine's conditional.
 */
function plainMatch(applicability: string): string {
  const condition = applicability
    .replace(/^\s*Examine this circular if\s*/i, "")
    .replace(/\.\s*$/, "")
    .trim();
  if (!condition) return "Matched on this client's recorded profile";
  return `Matched because ${condition.charAt(0).toLowerCase()}${condition.slice(1)}`;
}

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
          <p>Say whether each one applies. Approving adds it to your work queue.</p>
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
              {/* The question first, the citation under it. This card used to
                  lead with a ninety-character instrument name and then explain
                  the matcher's own rule ("Examine this circular if Sector is
                  Food") — the software describing itself, in a place where a CA
                  is trying to decide something. */}
              <p className="decision-ask">
                Does this {group.authority} change apply to{" "}
                {group.items.length === 1
                  ? group.items[0]!.clientName
                  : `these ${group.items.length} clients`}?
              </p>

              <div className="decision-head">
                <span className="radar-authority">{group.authority}</span>
                <a href={group.url} target="_blank" rel="noreferrer" className="decision-title">
                  {group.title} <span aria-hidden="true">↗</span>
                </a>
              </div>

              <ul className="decision-clients">
                {group.items.map((impact) => (
                  <li key={impact.id}>
                    <span className="decision-client-block">
                      <Link className="decision-client" href={`/clients/${impact.clientId}#radar`}>
                        {impact.clientName}
                      </Link>
                      {/* Why THIS client, in their terms — not the rule's. */}
                      <small>{plainMatch(impact.applicability)}</small>
                    </span>
                    {failedId === impact.id ? (
                      <span className="decision-failed" role="alert">Could not record — try again</span>
                    ) : null}
                    <span className="decision-actions">
                      <button
                        className="button small primary"
                        onClick={() => decide(impact, "approved")}
                        type="button"
                      >
                        Applies — add to work
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

              {/* Justification, not the decision — so it folds away. Opened, it
                  shows the reasoning as two halves rather than one bare quote:
                  the fact recorded about the client, and the scope the official
                  text sets. A quote on its own never said why THIS client. */}
              {group.items[0]?.evidence.length ? (
                <details className="decision-evidence">
                  <summary>Why Reg Mitra thinks this may apply</summary>
                  <div className="decision-reasoning">
                    <p>
                      <span>You recorded</span>
                      {group.items.map((impact) => impact.clientName).join(", ")}
                      {" as "}
                      <strong>{matchedFact(group.items[0]!.applicability)}</strong>.
                    </p>
                    <p>
                      <span>The change is addressed to</span>
                      “{group.items[0].evidence[0]!.quote}”
                    </p>
                    <p className="decision-evidence-note">
                      That overlap is why it is here. It is a proposal, not a
                      conclusion — confirm against the client’s actual position.
                    </p>
                  </div>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </details>
  );
}
