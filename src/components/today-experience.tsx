"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircleIcon, ChevronRightIcon, SparklesIcon } from "@/components/icons";
import { TrustBadge } from "@/components/trust-badge";
import type { EvidenceState, RiskLevel } from "@/lib/types";

export interface TodayItem {
  id: string;
  title: string;
  clientId: string | null;
  client: string;
  authority: string;
  due: string;
  dueAt: string | null;
  urgency: RiskLevel;
  needsDecision: boolean;
  evidenceState: Extract<EvidenceState, "verified" | "unverified">;
}

export function TodayExperience({
  items,
  mode,
  verifiedSourceCount,
  hasClients = false,
  notice = "",
}: Readonly<{
  items: readonly TodayItem[];
  mode: "demo" | "public" | "product";
  verifiedSourceCount: number;
  hasClients?: boolean;
  notice?: string;
}>) {
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);
  const [reviewedIds, setReviewedIds] = useState<readonly string[]>([]);
  const [reviewError, setReviewError] = useState("");

  const openItems = useMemo(
    () => items.filter((item) => !reviewedIds.includes(item.id)),
    [items, reviewedIds],
  );
  const decisionCount = openItems.filter((item) => item.needsDecision).length;
  const nextDue = openItems
    .filter((item) => item.dueAt)
    .sort((left, right) => String(left.dueAt).localeCompare(String(right.dueAt)))[0];

  async function markReviewed(id: string) {
    setReviewError("");
    if (mode === "product") {
      const response = await fetch(`/api/tasks/${encodeURIComponent(id)}/review`, { method: "POST" });
      if (!response.ok) {
        setReviewError("This item could not be marked reviewed. Check your reviewer access and try again.");
        return;
      }
    }

    setReviewedIds((current) => [...current, id]);
    const nextItem = items.find((item) => item.id !== id && !reviewedIds.includes(item.id));
    setExpandedId(nextItem?.id ?? null);
  }

  return (
    <>
      {/* Public mode shows a worked example so the page is legible on a first
          visit, but it must never read as the professional's own work. */}
      {mode === "public" ? (
        <div className="sample-banner" role="note">
          <span className="sample-banner-tag">Sample</span>
          <p>
            <strong>This is an example queue.</strong> Sharma Pharma and Royal Spice are
            fictional clients, shown so you can see how the review queue works.
          </p>
          <Link className="button primary" href="/practice">Add your clients</Link>
        </div>
      ) : null}
      <header className="today-hero">
        <div>
          <p className="eyebrow">Today · Review queue</p>
          <h1>
            {decisionCount
              ? `${decisionCount} ${decisionCount === 1 ? "thing needs" : "things need"} your decision`
              : "You’re clear for now"}
          </h1>
          <p>
            {decisionCount
              ? "Start with the highest-priority exception. Everything else can wait."
              : mode === "demo"
                ? "The fictional queue has been reviewed for this session."
                : "No unreviewed client-impact decisions are currently assigned to you."}
          </p>
        </div>
        <div className="today-hero-actions">
          {mode === "product" ? (
            <Link className="button" href="/tasks/new">Add work item</Link>
          ) : null}
          <Link className="button primary" href="/assistant">
            <SparklesIcon /> Assistant
          </Link>
        </div>
      </header>

      {notice ? <p className="today-notice" role="status">{notice}</p> : null}

      <section className="today-summary" aria-label="Today at a glance">
        <span><strong>{openItems.length}</strong><small>open items</small></span>
        <i />
        <span><strong>{decisionCount}</strong><small>need a decision</small></span>
        <i />
        <span><strong>{verifiedSourceCount}</strong><small>sources reviewed</small></span>
        <div className="today-summary-note">
          <TrustBadge kind="evidence" state={mode === "demo" ? "demo" : verifiedSourceCount ? "verified" : "unverified"} />
          <small>
            {mode === "demo"
              ? "Demo progress resets on reload."
              : mode === "public"
                ? "Public workspace progress lasts for this browser session."
                : "Reviews are saved to the workspace audit history."}
          </small>
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

        {reviewError ? <p className="form-error" role="alert">{reviewError}</p> : null}
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
                        {item.evidenceState === "verified"
                          ? "The attached applicability has been reviewed. Confirm current client facts and the intended action before execution."
                          : "No approved applicability is attached. Confirm the official source and client facts before taking action."}
                      </p>
                      <div className="decision-state">
                        <TrustBadge kind="evidence" state={item.evidenceState} />
                        <TrustBadge kind="review" state="not-reviewed" />
                      </div>
                    </div>
                    <div className="decision-actions">
                      {item.clientId ? <Link className="button" href={`/clients/${item.clientId}`}>Open client</Link> : null}
                      <Link className="button" href={`/assistant?prompt=${encodeURIComponent(item.title)}`}>
                        <SparklesIcon /> Prepare review
                      </Link>
                      <button className="button primary" onClick={() => void markReviewed(item.id)} type="button">
                        <CheckCircleIcon /> Mark reviewed
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}

          {!openItems.length ? (
            mode === "product" ? (
              <div className="queue-complete">
                <CheckCircleIcon />
                <h2>{hasClients ? "Your queue is empty" : "Set up your first queue"}</h2>
                <p>
                  {hasClients
                    ? "Build a review queue from the statutory compliance calendar for your clients, or add a work item yourself."
                    : "Add a client first, then build a review queue from the statutory compliance calendar."}
                </p>
                <div className="queue-empty-actions">
                  {hasClients ? (
                    <>
                      <form action="/api/tasks/generate" method="post">
                        <button className="button primary" type="submit">Build my queue from the calendar</button>
                      </form>
                      <Link className="button" href="/tasks/new">Add a work item</Link>
                    </>
                  ) : (
                    <Link className="button primary" href="/clients/new">Add your first client</Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="queue-complete">
                <CheckCircleIcon />
                <h2>No unreviewed work</h2>
                <p>{mode === "demo" ? "Every demo item was handled for this session." : "New source impacts and assigned tasks will appear here."}</p>
              </div>
            )
          ) : null}
        </div>
      </section>

      <section className="next-up">
        <div>
          <p className="eyebrow">Next recorded deadline</p>
          <h2>{nextDue ? `${nextDue.title} · ${nextDue.due}` : "No task deadline recorded"}</h2>
          <p>{nextDue ? `${nextDue.client} · ${nextDue.authority}` : "Open the calendar to review source-linked recurring obligations."}</p>
        </div>
        <Link className="text-link" href="/calendar">Open source-linked calendar →</Link>
      </section>
    </>
  );
}
