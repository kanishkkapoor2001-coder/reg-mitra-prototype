"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircleIcon, ChevronRightIcon, SparklesIcon } from "@/components/icons";
import { TrustBadge } from "@/components/trust-badge";
import { workItems } from "@/lib/demo-data";

export function TodayExperience() {
  const [expandedId, setExpandedId] = useState<string | null>(workItems[0]?.id ?? null);
  const [reviewedIds, setReviewedIds] = useState<readonly string[]>([]);

  const openItems = useMemo(
    () => workItems.filter((item) => !reviewedIds.includes(item.id)),
    [reviewedIds],
  );
  const decisionCount = openItems.filter((item) => item.state === "needs-review").length;

  function markReviewed(id: string) {
    setReviewedIds((current) => [...current, id]);
    const nextItem = workItems.find((item) => item.id !== id && !reviewedIds.includes(item.id));
    setExpandedId(nextItem?.id ?? null);
  }

  return (
    <>
      <header className="today-hero">
        <div>
          <p className="eyebrow">Today · Partner workspace</p>
          <h1>
            {decisionCount
              ? `${decisionCount} ${decisionCount === 1 ? "thing needs" : "things need"} your decision`
              : "You’re clear for now"}
          </h1>
          <p>
            {decisionCount
              ? "Start with the highest-risk exception. Everything else can wait."
              : "The current queue has been reviewed for this session."}
          </p>
        </div>
        <Link className="button primary" href="/assistant">
          <SparklesIcon /> Ask Reg Mitra
        </Link>
      </header>

      <section className="today-summary" aria-label="Today at a glance">
        <span><strong>{openItems.length}</strong><small>open items</small></span>
        <i />
        <span><strong>{decisionCount}</strong><small>need a decision</small></span>
        <i />
        <span><strong>0</strong><small>verified sources</small></span>
        <div className="today-summary-note">
          <TrustBadge kind="evidence" state="demo" />
          <small>Progress resets when this local session reloads.</small>
        </div>
      </section>

      <section className="focus-section">
        <div className="focus-heading">
          <div>
            <p className="eyebrow">Your queue</p>
            <h2>Do the important work first</h2>
          </div>
          <span>{openItems.length} remaining</span>
        </div>

        <div className="decision-list">
          {openItems.map((item, index) => {
            const expanded = expandedId === item.id;
            return (
              <article className={`decision-item ${expanded ? "expanded" : ""}`} key={item.id}>
                <button
                  aria-expanded={expanded}
                  className="decision-trigger"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  type="button"
                >
                  <span className={`decision-rank ${item.urgency}`}>{index + 1}</span>
                  <span className="decision-copy">
                    <strong>{item.title}</strong>
                    <small>{item.client} · {item.authority}</small>
                  </span>
                  <span className={`decision-due ${item.urgency}`}>{item.due}</span>
                  <ChevronRightIcon className="decision-chevron" />
                </button>

                {expanded ? (
                  <div className="decision-detail">
                    <div>
                      <p className="decision-why">
                        {item.state === "needs-review"
                          ? "The underlying regulatory claim has no authoritative source attached. Confirm the rule and client applicability before taking action."
                          : "This item uses illustrative workspace data. Review the period, client records, and authoritative portal before using it."}
                      </p>
                      <div className="decision-state">
                        <TrustBadge kind="evidence" state="unverified" />
                        <TrustBadge kind="review" state="not-reviewed" />
                      </div>
                    </div>
                    <div className="decision-actions">
                      <Link className="button" href={`/clients/${item.clientId}`}>Open client</Link>
                      <Link className="button" href={`/assistant?prompt=${encodeURIComponent(item.title)}`}>
                        <SparklesIcon /> Prepare review
                      </Link>
                      <button className="button primary" onClick={() => markReviewed(item.id)} type="button">
                        <CheckCircleIcon /> Mark reviewed
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}

          {!openItems.length ? (
            <div className="queue-complete">
              <CheckCircleIcon />
              <h2>Queue reviewed</h2>
              <p>You handled every item in this session. No external action was taken.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="next-up">
        <div>
          <p className="eyebrow">Next up</p>
          <h2>Q1 quarterly TDS statement · 31 July</h2>
          <p>General statutory date from the Income Tax Department. Confirm client applicability and any later notification.</p>
        </div>
        <Link className="text-link" href="/calendar">Open source-linked calendar →</Link>
      </section>
    </>
  );
}
