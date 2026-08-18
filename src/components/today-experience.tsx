"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircleIcon, ChevronRightIcon, SparklesIcon } from "@/components/icons";
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

/**
 * Rows arrive labelled — "GSTR-1 · Sharma Pharma" — which names a thing rather
 * than asking for an act. A queue is read fastest when every line starts with
 * the verb, so the eye can skim what to DO down the left edge.
 */
function asInstruction(title: string, client: string): string {
  const head = title.split("·")[0]?.trim() ?? title;
  if (/^apply:/i.test(head)) return head.replace(/^apply:\s*/i, "Apply ");
  const verb = /statement|return|gstr|itr|form|tds\b/i.test(head)
    ? "File"
    : /deposit|payment|challan/i.test(head)
      ? "Pay"
      : /epf|esi|pf\b/i.test(head)
        ? "File"
        : "Complete";
  return client && client !== "Firm-wide" ? `${verb} ${head} — ${client}` : `${verb} ${head}`;
}

type Bucket = { overdue: TodayItem[]; thisWeek: TodayItem[]; later: TodayItem[] };

// A CA reads a workload by when it falls due, not by a priority integer. Thirty
// items in one flat list is a wall; the same thirty as "1 overdue, 6 this week,
// 23 later" is a morning's plan — and the two urgent ones stop hiding behind
// twenty-eight that can wait.
const GROUPS: readonly {
  key: "overdue" | "week" | "later";
  label: string;
  pick: (bucket: Bucket) => TodayItem[];
}[] = [
  { key: "overdue", label: "Overdue", pick: (b) => b.overdue },
  { key: "week", label: "Due this week", pick: (b) => b.thisWeek },
  { key: "later", label: "Later", pick: (b) => b.later },
];

export function TodayExperience({
  items,
  mode,
  hasClients = false,
  notice = "",
  watching,
}: Readonly<{
  items: readonly TodayItem[];
  mode: "demo" | "public" | "product";
  hasClients?: boolean;
  notice?: string;
  /** One sentence: what is being watched, for whom, and when it was last checked. */
  watching?: string;
}>) {
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);
  const [reviewedIds, setReviewedIds] = useState<readonly string[]>([]);
  const [reviewError, setReviewError] = useState("");

  const openItems = useMemo(
    () => items.filter((item) => !reviewedIds.includes(item.id)),
    [items, reviewedIds],
  );
  // Bucketed against today in IST, since every statutory date in the product is
  // an IST date. An item with no recorded due date is not urgent by default —
  // it sorts to "Later" rather than inventing a deadline for it.
  const { overdue, thisWeek, later } = useMemo(() => {
    const startOfToday = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
    const weekOut = new Date(startOfToday);
    weekOut.setDate(weekOut.getDate() + 7);
    const bucket: Bucket = { overdue: [], thisWeek: [], later: [] };
    for (const item of openItems) {
      if (!item.dueAt) {
        bucket.later.push(item);
        continue;
      }
      const due = new Date(item.dueAt);
      if (due < startOfToday) bucket.overdue.push(item);
      else if (due <= weekOut) bucket.thisWeek.push(item);
      else bucket.later.push(item);
    }
    const byDate = (a: TodayItem, b: TodayItem) => String(a.dueAt ?? "").localeCompare(String(b.dueAt ?? ""));
    bucket.overdue.sort(byDate);
    bucket.thisWeek.sort(byDate);
    bucket.later.sort(byDate);
    return bucket;
  }, [openItems]);

  /**
   * Completing a row asserts the filing was DONE — or that it did not arise
   * this period. The old button stamped "reviewed", so a filed return stayed
   * open forever and the page tracked reading instead of compliance.
   *
   * Optimistic, like every other decision in the product: the row leaves on
   * press and the write happens behind it.
   */
  function complete(id: string, outcome: "filed" | "not_applicable") {
    setReviewError("");
    setReviewedIds((current) => [...current, id]);
    const nextItem = items.find((item) => item.id !== id && !reviewedIds.includes(item.id));
    setExpandedId(nextItem?.id ?? null);

    if (mode === "product") {
      void fetch(`/api/tasks/${encodeURIComponent(id)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
        })
        .catch(() => {
          setReviewedIds((current) => current.filter((item) => item !== id));
          setExpandedId(id);
          setReviewError("That could not be saved. Check your workspace access and try again.");
        });
    }
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
          {/* What is true and actionable, not a count of everything that exists.
              "29 things need your decision" was both wrong — these are
              scheduled filings, not decisions — and alarming, which is the
              opposite of what a work queue is for. */}
          <h1>
            {overdue.length
              ? `${overdue.length} ${overdue.length === 1 ? "filing is" : "filings are"} overdue`
              : thisWeek.length
                ? `${thisWeek.length} due this week`
                : openItems.length
                  ? "Nothing due this week"
                  : "You’re clear for now"}
          </h1>
          <p>
            {overdue.length
              ? "Start here. Everything else has time."
              : thisWeek.length
                ? "The rest can wait — they are listed below by when they fall due."
                : openItems.length
                  ? `${openItems.length} ${openItems.length === 1 ? "item" : "items"} scheduled later.`
                  : mode === "demo"
                    ? "The fictional queue has been reviewed for this session."
                    : "No client work is currently assigned to you."}
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

      <section className="focus-section">

        {reviewError ? <p className="form-error" role="alert">{reviewError}</p> : null}
        {GROUPS.map((group) => {
          const items = group.pick({ overdue, thisWeek, later });
          if (!items.length) return null;
          return (
            <div className="queue-group" key={group.key}>
              <div className="queue-group-head">
                <h2>{group.label}</h2>
                <span>{items.length}</span>
              </div>
              <div className="decision-list">
                {items.map((item) => {
                  const expanded = expandedId === item.id;
                  return (
                    <article className={`decision-item ${expanded ? "expanded" : ""}`} key={item.id}>
                      <button
                        aria-expanded={expanded}
                        className="decision-trigger"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                        type="button"
                      >
                        <span className="decision-copy">
                          <strong>{asInstruction(item.title, item.client)}</strong>
                          <small>{item.authority}</small>
                        </span>
                        <span className={`decision-due ${group.key === "overdue" ? "high" : item.urgency}`}>
                          {group.key === "overdue" ? `Was due ${item.due}` : item.due}
                        </span>
                        <ChevronRightIcon className="decision-chevron" />
                      </button>

                      {expanded ? (
                        <div className="decision-detail">
                          {/* Was: "No approved applicability is attached. Confirm
                              the official source and client facts before taking
                              action." — internal state, in language nobody uses. */}
                          <p className="decision-why">
                            {item.evidenceState === "verified"
                              ? "An approved regulation is attached to this item. Check the client’s current position before you file."
                              : "This is a scheduled obligation, not tied to a reviewed regulation. Confirm it still applies to this client."}
                          </p>
                          <div className="decision-actions">
                            <button className="button primary" onClick={() => complete(item.id, "filed")} type="button">
                              <CheckCircleIcon /> Mark filed
                            </button>
                            <button className="button" onClick={() => complete(item.id, "not_applicable")} type="button">
                              Not applicable this period
                            </button>
                            <span className="decision-actions-spacer" />
                            {item.clientId ? <Link className="text-link" href={`/clients/${item.clientId}`}>Open client</Link> : null}
                            <Link className="text-link" href={`/assistant?prompt=${encodeURIComponent(item.title)}`}>
                              Ask the assistant
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="decision-list">

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

      {/* The whole reason to trust the page, in one sentence, once — replacing
          the badges, the "sources reviewed" count and the audit reassurance
          that were interleaved with the work. */}
      <p className="today-watching">
        {watching ?? "Reg Mitra checks the official sources for you."}
        {" "}
        <Link className="text-link" href="/calendar">See the calendar</Link>
      </p>
    </>
  );
}
