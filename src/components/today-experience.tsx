"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { CheckCircleIcon, ChevronRightIcon, SparklesIcon } from "@/components/icons";
import { TrustBadge } from "@/components/trust-badge";
import { recordEfficiencyEvent } from "@/lib/efficiency-store";
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
}: Readonly<{
  items: readonly TodayItem[];
  mode: "demo" | "public" | "product";
  verifiedSourceCount: number;
}>) {
  const [focusedId, setFocusedId] = useState<string | null>(items[0]?.id ?? null);
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
  const focusedItem = openItems.find((item) => item.id === focusedId) ?? openItems[0] ?? null;
  const queuedItems = openItems.filter((item) => item.id !== focusedItem?.id);

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
    recordEfficiencyEvent("review-recorded");
    const nextItem = openItems.find((item) => item.id !== id);
    setFocusedId(nextItem?.id ?? null);
  }

  return (
    <div className="today-page">
      <header className="today-hero">
        <div>
          <p className="eyebrow">Your daily workspace</p>
          <h1>Today</h1>
          <p>
            {decisionCount
              ? `${decisionCount} ${decisionCount === 1 ? "decision needs" : "decisions need"} you. Reg Mitra has put the most important one first.`
              : mode === "demo"
                ? "The fictional queue has been reviewed for this session."
                : "No unreviewed client-impact decisions are currently assigned to you."}
          </p>
        </div>
        <Link className="button today-assistant-button" href="/assistant?prompt=What%20should%20I%20focus%20on%20today%3F">
          <SparklesIcon /> Ask about today
        </Link>
      </header>

      <section className="today-method" aria-label="How Today works">
        <div><span>1</span><strong>Review the evidence</strong><small>See what changed and what is still unverified.</small></div>
        <i />
        <div><span>2</span><strong>Check the client</strong><small>Bring the relevant client context into view.</small></div>
        <i />
        <div><span>3</span><strong>Record your decision</strong><small>Leave a clear review trail for the firm.</small></div>
      </section>

      <div className="today-command-grid">
        <main className="today-primary-column">
          {reviewError ? <p className="form-error" role="alert">{reviewError}</p> : null}

          {focusedItem ? (
            <section className="today-focus-card" aria-labelledby="today-focus-title">
              <header>
                <div>
                  <p className="eyebrow">
                    Start here · 1 of {openItems.length}
                    <InfoTip label="Explain how Start here is selected">
                      The highest-priority unreviewed item is shown first. Selecting an item below moves it into focus.
                    </InfoTip>
                  </p>
                  <h2 id="today-focus-title">{focusedItem.title}</h2>
                </div>
                <span className={`today-focus-due ${focusedItem.urgency}`}>{focusedItem.due}</span>
              </header>

              <div className="today-focus-context">
                <span>{focusedItem.client}</span>
                <i />
                <span>{focusedItem.authority}</span>
              </div>

              <div className="today-focus-reason">
                <strong className="label-with-tip">
                  Why this needs you
                  <InfoTip label="Explain why this item needs review">
                    Reg Mitra has found an unresolved source, applicability, or professional-review state. It does not mean a filing is automatically due.
                  </InfoTip>
                </strong>
                <p>
                  {focusedItem.evidenceState === "verified"
                    ? "The applicability has been reviewed. Confirm the current client facts and intended action before execution."
                    : "The source or client applicability has not been approved. Confirm both before advice or action."}
                </p>
                <div className="decision-state">
                  <TrustBadge kind="evidence" state={focusedItem.evidenceState} />
                  <TrustBadge kind="review" state="not-reviewed" />
                </div>
              </div>

              <div className="today-focus-actions">
                {focusedItem.clientId ? (
                  <Link className="button" href={`/clients/${focusedItem.clientId}`}>Open client</Link>
                ) : null}
                <Link className="button" href={`/assistant?prompt=${encodeURIComponent(focusedItem.title)}`}>
                  <SparklesIcon /> Prepare review
                </Link>
                <button className="button primary" onClick={() => void markReviewed(focusedItem.id)} type="button">
                  <CheckCircleIcon /> Mark reviewed
                </button>
              </div>
            </section>
          ) : (
            <section className="queue-complete">
              <CheckCircleIcon />
              <h2>No unreviewed work</h2>
              <p>{mode === "demo" ? "Every demo item was handled for this session." : "New source impacts and assigned tasks will appear here."}</p>
            </section>
          )}

          {queuedItems.length ? (
            <section className="today-up-next" aria-labelledby="today-up-next-title">
              <header>
                <div>
                  <p className="eyebrow">Up next</p>
                  <h2 id="today-up-next-title">The rest of your queue</h2>
                </div>
                <span>{queuedItems.length} after this</span>
              </header>
              <div>
                {queuedItems.map((item, index) => (
                  <button className="today-queue-row" key={item.id} onClick={() => setFocusedId(item.id)} type="button">
                    <span className={`decision-rank ${item.urgency}`}>{index + 2}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.client} · {item.authority}</small>
                    </span>
                    <span className={`decision-due ${item.urgency}`}>{item.due}</span>
                    <ChevronRightIcon />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </main>

        <aside className="today-side-column" aria-label="Today at a glance">
          <section className="today-glance-card">
            <p className="eyebrow">
              At a glance
              <InfoTip label="Explain the Today summary">
                A live count of the work still visible in this review session.
              </InfoTip>
            </p>
            <dl>
              <div><dt>Open work</dt><dd>{openItems.length}</dd></div>
              <div>
                <dt className="label-with-tip">
                  Needs your decision
                  <InfoTip label="Explain needs your decision">
                    Items without an approved client-impact decision. They require professional judgement before advice or action.
                  </InfoTip>
                </dt>
                <dd>{decisionCount}</dd>
              </div>
              <div>
                <dt className="label-with-tip">
                  Reviewed sources
                  <InfoTip label="Explain reviewed sources">
                    Items whose attached source and applicability have already passed the recorded review gate.
                  </InfoTip>
                </dt>
                <dd>{verifiedSourceCount}</dd>
              </div>
            </dl>
            <div className="today-trust-note">
              <TrustBadge kind="evidence" state={mode === "demo" ? "demo" : verifiedSourceCount ? "verified" : "unverified"} />
              <small>
                {mode === "demo"
                  ? "Sample progress resets when the demo resets."
                  : mode === "public"
                    ? "Progress is kept in this browser session."
                    : "Reviews are saved to your workspace history."}
              </small>
            </div>
          </section>

          <section className="today-purpose-card">
            <p className="eyebrow">What this page does</p>
            <h2>A shorter path from change to decision.</h2>
            <ul>
              <li><CheckCircleIcon /><span>Prioritises unresolved client impact.</span></li>
              <li><CheckCircleIcon /><span>Keeps the source and client one click away.</span></li>
              <li><CheckCircleIcon /><span>Records what has—and has not—been reviewed.</span></li>
            </ul>
          </section>

          <section className="today-deadline-card">
            <p className="eyebrow">Next deadline</p>
            <h2>{nextDue ? nextDue.title : "No deadline recorded"}</h2>
            <p>{nextDue ? `${nextDue.due} · ${nextDue.client}` : "Use the calendar for recurring and source-linked obligations."}</p>
            <Link className="text-link" href="/calendar">Open calendar <ChevronRightIcon /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
