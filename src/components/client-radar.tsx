import Link from "next/link";
import type { ClientImpact } from "@/lib/radar/impacts";
import { questionsFor } from "@/lib/radar/impacts";

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
  editable,
  returnTo,
}: Readonly<{ impact: ClientImpact; editable: boolean; returnTo: string }>) {
  const approved = impact.reviewState === "approved";
  const rejected = impact.reviewState === "rejected";

  return (
    <article className={`radar-item${approved ? " is-approved" : ""}${rejected ? " is-dismissed" : ""}`}>
      <div className="radar-item-head">
        <span className="radar-authority">{impact.source.authority}</span>
        {impact.source.publishedAt ? (
          <span className="radar-date">{formatDate(impact.source.publishedAt)}</span>
        ) : null}
        <span className={`radar-state radar-state-${impact.reviewState}`}>
          {approved ? "Approved" : rejected ? "Dismissed" : "Needs your decision"}
        </span>
      </div>

      <h3 className="radar-title">
        <a href={impact.source.url} target="_blank" rel="noreferrer">
          {impact.source.title} <span aria-hidden="true">↗</span>
        </a>
      </h3>

      <p className="radar-why">{impact.applicability}</p>

      {impact.evidence.length ? (
        <ul className="radar-evidence">
          {impact.evidence.map((item) => (
            <li key={item.id}>
              <span className="radar-quote">“{item.quote}”</span>
              <span className="radar-locator">{item.location}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {editable && !approved && !rejected ? (
        <div className="radar-actions">
          <form action="/api/impacts/review" method="post">
            <input type="hidden" name="impactId" value={impact.id} />
            <input type="hidden" name="state" value="approved" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="button primary" type="submit">Applies to this client</button>
          </form>
          <form action="/api/impacts/review" method="post">
            <input type="hidden" name="impactId" value={impact.id} />
            <input type="hidden" name="state" value="rejected" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="button" type="submit">Not applicable</button>
          </form>
        </div>
      ) : editable ? (
        <div className="radar-actions">
          <form action="/api/impacts/review" method="post">
            <input type="hidden" name="impactId" value={impact.id} />
            <input type="hidden" name="state" value="not_reviewed" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="button quiet" type="submit">Undo</button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export function ClientRadar({
  impacts,
  editable,
  returnTo,
  hasRules,
}: Readonly<{
  impacts: ClientImpact[];
  editable: boolean;
  returnTo: string;
  hasRules: boolean;
}>) {
  const flagged = impacts.filter(
    (i) => i.decision === "direct_relevance" && i.reviewState !== "rejected",
  );
  const needsFacts = impacts.filter((i) => i.decision === "more_information_needed");
  const questions = questionsFor(needsFacts, 2);

  return (
    <section className="panel" id="radar">
      <div className="panel-header">
        <div>
          <h2>Regulatory radar</h2>
          <p>Changes checked against this client’s confirmed profile.</p>
        </div>
        {flagged.length ? (
          <span className="radar-count">{flagged.length} to review</span>
        ) : null}
      </div>

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
            <ImpactCard key={impact.id} impact={impact} editable={editable} returnTo={returnTo} />
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
