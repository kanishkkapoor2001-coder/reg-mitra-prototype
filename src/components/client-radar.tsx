"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { questionsFor, type ClientImpact } from "@/lib/radar/impact-types";
import { reviewImpact, type ReviewState } from "@/lib/radar/review-client";

// The wedge, on screen: which circulars touch this client, why, and the two
// questions that would settle the rest.
//
// Every flagged item shows the quote it rests on and links to the official
// source. A proposal is never presented as a conclusion — the CA approves or
// dismisses it, and nothing else in the product treats it as settled until
// they do.

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function ImpactCard({
  impact,
  state,
  failed,
  editable,
  onDecide,
}: Readonly<{
  impact: ClientImpact;
  state: ClientImpact["reviewState"];
  failed: boolean;
  editable: boolean;
  onDecide: (impact: ClientImpact, state: ReviewState) => void;
}>) {
  const approved = state === "approved";
  const rejected = state === "rejected";

  // One line on the surface; the citation, the quote and the secondary action
  // all live one click deeper. The old card showed everything at once — a box
  // inside a box with a permanently-open quote block.
  return (
    <details className={`q-item q-impact${approved ? " is-approved" : ""}${rejected ? " is-dismissed" : ""}`}>
      <summary className="q-item-row">
        <span aria-hidden="true" className={`q-mark${approved ? " done" : rejected ? " off" : " q-mark-ask"}`}>
          {approved ? "✓" : rejected ? "—" : "?"}
        </span>
        <span className="q-line">
          <span className="q-line-main">
            {approved
              ? `${impact.source.authority} change applies`
              : rejected
                ? `${impact.source.authority} change — not applicable`
                : `Does this ${impact.source.authority} change apply?`}
          </span>
          <span className="q-line-meta">
            {impact.source.publishedAt ? formatDate(impact.source.publishedAt) : "decide"}
          </span>
        </span>
      </summary>

      <div className="q-detail">
        <a className="q-detail-source" href={impact.source.url} target="_blank" rel="noreferrer">
          {impact.source.title} <span aria-hidden="true">↗</span>
        </a>
        <p className="q-detail-why">{impact.applicability}</p>

        {impact.evidence.length ? (
          <p className="q-detail-quote">
            “{impact.evidence[0]!.quote}”
            <span>{impact.evidence[0]!.location}</span>
          </p>
        ) : null}

        {failed ? (
          <p className="decision-failed" role="alert">Could not record that decision — try again.</p>
        ) : null}

        {editable && !approved && !rejected ? (
          <p className="q-actions">
            <button className="q-act strong" onClick={() => onDecide(impact, "approved")} type="button">
              Applies to this client
            </button>
            <button className="q-act" onClick={() => onDecide(impact, "rejected")} type="button">
              Not applicable
            </button>
          </p>
        ) : editable ? (
          <p className="q-actions">
            <button className="q-act" onClick={() => onDecide(impact, "not_reviewed")} type="button">Undo</button>
          </p>
        ) : null}
      </div>
    </details>
  );
}

export function ClientRadar({
  impacts,
  editable,
  hasRules,
}: Readonly<{
  impacts: ClientImpact[];
  editable: boolean;
  hasRules: boolean;
}>) {
  const router = useRouter();
  // Optimistic decisions: the card flips the moment the button is pressed and
  // the write happens behind it, reverting with an inline error on failure.
  const [overrides, setOverrides] = useState<Record<string, ClientImpact["reviewState"]>>({});
  const [failedId, setFailedId] = useState<string | null>(null);

  const stateOf = (impact: ClientImpact) => overrides[impact.id] ?? impact.reviewState;

  function decide(impact: ClientImpact, state: ReviewState) {
    const previous = stateOf(impact);
    setFailedId(null);
    setOverrides((current) => ({ ...current, [impact.id]: state }));
    void reviewImpact(impact.id, state).then((ok) => {
      if (!ok) {
        setOverrides((current) => ({ ...current, [impact.id]: previous }));
        setFailedId(impact.id);
        return;
      }
      router.refresh();
    });
  }

  // A dismissal hides the card only once the server confirms it on the next
  // render; hiding it optimistically would also remove its Undo.
  const flagged = impacts.filter(
    (i) => i.decision === "direct_relevance" && (i.reviewState !== "rejected" || overrides[i.id]),
  );
  const needsFacts = impacts.filter((i) => i.decision === "more_information_needed");
  const questions = questionsFor(needsFacts, 2);

  return (
    <section className="q-section">
      <h2 className="q-section-head">
        Changes
        <span>{impacts.length ? `${impacts.length} matched` : "none matched"}</span>
      </h2>

      {!hasRules ? (
        <div className="empty-state">
          <h2>No rules imported yet</h2>
          <p>
            Applicability rules arrive from the regulatory feed. Once the first import runs, matches
            for this client appear here.
          </p>
        </div>
      ) : flagged.length === 0 && needsFacts.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing outstanding</h2>
          <p>No current circular matches this client’s confirmed profile.</p>
        </div>
      ) : null}

      {flagged.length ? (
        <div className="radar-list">
          {flagged.map((impact) => (
            <ImpactCard
              key={impact.id}
              impact={impact}
              state={stateOf(impact)}
              failed={failedId === impact.id}
              editable={editable}
              onDecide={decide}
            />
          ))}
        </div>
      ) : null}

      {questions.length ? (
        <div className="radar-questions">
          <p className="radar-questions-title">
            {needsFacts.length} {needsFacts.length === 1 ? "check is" : "checks are"} undecided
          </p>
          <ul>
            {questions.map((question) => (
              <li key={question.key}>
                <strong>{question.definition?.question}</strong>
                <span>Answering this settles {question.resolves} {question.resolves === 1 ? "check" : "checks"}.</span>
              </li>
            ))}
          </ul>
          <Link className="button" href="#profile">Complete the profile</Link>
        </div>
      ) : null}
    </section>
  );
}
