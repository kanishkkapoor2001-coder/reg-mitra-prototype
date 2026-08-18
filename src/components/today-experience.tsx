"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircleIcon, ChevronRightIcon, SparklesIcon } from "@/components/icons";
import { reviewImpact } from "@/lib/radar/review-client";
import { asInstruction } from "@/lib/format";
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

/** A regulation change waiting on a decision, folded into its client. */
export type TodayChange = {
  id: string;
  clientId: string;
  clientName: string;
  authority: string;
  title: string;
  url: string;
  applicability: string;
};

type ClientSession = {
  clientId: string | null;
  clientName: string;
  items: TodayItem[];
  changes: TodayChange[];
  overdue: number;
  dueThisWeek: number;
  /** Earliest date across the client's open work, for ordering. */
  soonest: string | null;
  oldestOverdue: string | null;
};

// A CA does not do thirty filings; they do six clients. They open one client's
// file, clear everything that client needs, and close it. Grouping by deadline
// meant regrouping thirty rows into six work sessions in your head, every time
// you opened the page — which is the friction that survived every layer of
// visual tidying. Deadline still decides the ORDER; the client is the unit.

function startOfTodayIST(): Date {
  return new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
}

function buildSessions(items: readonly TodayItem[], changes: readonly TodayChange[]): ClientSession[] {
  const today = startOfTodayIST();
  const weekOut = new Date(today);
  weekOut.setDate(weekOut.getDate() + 7);

  const byClient = new Map<string, ClientSession>();
  const keyFor = (id: string | null, name: string) => id ?? `name:${name}`;

  const ensure = (clientId: string | null, clientName: string): ClientSession => {
    const key = keyFor(clientId, clientName);
    let session = byClient.get(key);
    if (!session) {
      session = {
        clientId, clientName, items: [], changes: [],
        overdue: 0, dueThisWeek: 0, soonest: null, oldestOverdue: null,
      };
      byClient.set(key, session);
    }
    return session;
  };

  for (const item of items) {
    const session = ensure(item.clientId, item.client);
    session.items.push(item);
    if (item.dueAt) {
      const due = new Date(item.dueAt);
      if (due < today) {
        session.overdue += 1;
        if (!session.oldestOverdue || item.dueAt < session.oldestOverdue) session.oldestOverdue = item.dueAt;
      } else if (due <= weekOut) {
        session.dueThisWeek += 1;
      }
      if (!session.soonest || item.dueAt < session.soonest) session.soonest = item.dueAt;
    }
  }
  for (const change of changes) {
    ensure(change.clientId, change.clientName).changes.push(change);
  }

  for (const session of byClient.values()) {
    session.items.sort((a, b) => String(a.dueAt ?? "").localeCompare(String(b.dueAt ?? "")));
  }

  // Most trouble first: overdue count, then oldest overdue, then next deadline.
  return [...byClient.values()].sort((a, b) => {
    if (a.overdue !== b.overdue) return b.overdue - a.overdue;
    if (a.oldestOverdue && b.oldestOverdue) return a.oldestOverdue.localeCompare(b.oldestOverdue);
    if (a.changes.length !== b.changes.length) return b.changes.length - a.changes.length;
    return String(a.soonest ?? "9999").localeCompare(String(b.soonest ?? "9999"));
  });
}

/** The one line under a client's name: how much trouble they are in. */
function sessionSummary(session: ClientSession, formatDate: (iso: string) => string): string {
  const parts: string[] = [];
  if (session.overdue) {
    parts.push(`${session.overdue} overdue${session.oldestOverdue ? ` · oldest ${formatDate(session.oldestOverdue)}` : ""}`);
  }
  if (session.dueThisWeek) parts.push(`${session.dueThisWeek} due this week`);
  if (session.changes.length) {
    parts.push(`${session.changes.length} new ${session.changes.length === 1 ? "change" : "changes"}`);
  }
  if (!parts.length) {
    const remaining = session.items.length;
    parts.push(remaining ? `${remaining} scheduled later` : "nothing due");
  }
  return parts.join(" · ");
}

export function TodayExperience({
  items,
  mode,
  changes = [],
  hasClients = false,
  notice = "",
  watching,
}: Readonly<{
  items: readonly TodayItem[];
  changes?: readonly TodayChange[];
  mode: "demo" | "public" | "product";
  hasClients?: boolean;
  notice?: string;
  /** One sentence: what is being watched, for whom, and when it was last checked. */
  watching?: string;
}>) {
  const [reviewedIds, setReviewedIds] = useState<readonly string[]>([]);
  const [decidedChanges, setDecidedChanges] = useState<readonly string[]>([]);
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");

  const openItems = useMemo(
    () => items.filter((item) => !reviewedIds.includes(item.id)),
    [items, reviewedIds],
  );
  const openChanges = useMemo(
    () => changes.filter((change) => !decidedChanges.includes(change.id)),
    [changes, decidedChanges],
  );

  const sessions = useMemo(
    () => buildSessions(openItems, openChanges),
    [openItems, openChanges],
  );

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
      .format(new Date(iso));

  const totalOverdue = sessions.reduce((total, session) => total + session.overdue, 0);
  const clientsInTrouble = sessions.filter((session) => session.overdue).length;
  // The most urgent client opens by itself: the page should present one obvious
  // first move rather than a row of equal options.
  const activeKey = openClient ?? (sessions[0] ? (sessions[0].clientId ?? sessions[0].clientName) : null);

  function decideChange(change: TodayChange, state: "approved" | "rejected") {
    setDecidedChanges((current) => [...current, change.id]);
    void reviewImpact(change.id, state).then((ok) => {
      if (!ok) {
        setDecidedChanges((current) => current.filter((id) => id !== change.id));
        setReviewError("That decision could not be saved. Try again.");
      }
    });
  }

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
            {clientsInTrouble
              ? `${clientsInTrouble} ${clientsInTrouble === 1 ? "client needs" : "clients need"} you today`
              : sessions.length
                ? "Nothing overdue"
                : "You’re clear for now"}
          </h1>
          <p>
            {clientsInTrouble
              ? `${totalOverdue} ${totalOverdue === 1 ? "filing is" : "filings are"} past due. Start at the top and clear one client at a time.`
              : sessions.length
                ? "Work is grouped by client, most urgent first."
                : mode === "demo"
                  ? "The fictional queue has been cleared for this session."
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

        <div className="session-list">
          {sessions.map((session) => {
            const key = session.clientId ?? session.clientName;
            const open = activeKey === key;
            return (
              <article className={`session ${open ? "open" : ""} ${session.overdue ? "is-late" : ""}`} key={key}>
                <button
                  aria-expanded={open}
                  className="session-head"
                  onClick={() => setOpenClient(open ? "" : key)}
                  type="button"
                >
                  <span className="session-name">
                    <strong>{session.clientName}</strong>
                    <small>{sessionSummary(session, formatDate)}</small>
                  </span>
                  <span className="session-open">{open ? "Close" : "Start"}</span>
                  <ChevronRightIcon className="session-chevron" />
                </button>

                {open ? (
                  <div className="session-body">
                    {/* A change waiting on a decision belongs with its client,
                        not in a separate panel above the work. */}
                    {session.changes.map((change) => (
                      <div className="session-change" key={change.id}>
                        <p className="session-change-ask">
                          <span className="radar-authority">{change.authority}</span>
                          Does this apply to {session.clientName}?
                        </p>
                        <a href={change.url} target="_blank" rel="noreferrer" className="session-change-title">
                          {change.title} <span aria-hidden="true">↗</span>
                        </a>
                        <p className="session-change-why">{change.applicability}</p>
                        <div className="session-change-actions">
                          <button className="button small primary" onClick={() => decideChange(change, "approved")} type="button">
                            Applies — add to work
                          </button>
                          <button className="button small" onClick={() => decideChange(change, "rejected")} type="button">
                            Not applicable
                          </button>
                        </div>
                      </div>
                    ))}

                    {session.items.map((item) => {
                      const late = Boolean(item.dueAt && new Date(item.dueAt) < startOfTodayIST());
                      return (
                        <div className={`session-item ${late ? "late" : ""}`} key={item.id}>
                          <span className="session-item-copy">
                            <strong>{asInstruction(item.title, "")}</strong>
                            <small>{item.authority}</small>
                          </span>
                          <span className={`decision-due ${late ? "high" : item.urgency}`}>
                            {late ? `Was due ${item.due}` : item.due}
                          </span>
                          <span className="session-item-actions">
                            <button className="button small primary" onClick={() => complete(item.id, "filed")} type="button">
                              <CheckCircleIcon /> Filed
                            </button>
                            <button className="button small" onClick={() => complete(item.id, "not_applicable")} type="button">
                              N/A
                            </button>
                          </span>
                        </div>
                      );
                    })}

                    <div className="session-foot">
                      {session.clientId ? (
                        <Link className="text-link" href={`/clients/${session.clientId}`}>Open {session.clientName}</Link>
                      ) : null}
                      <Link className="text-link" href={`/assistant?prompt=${encodeURIComponent(`What needs attention for ${session.clientName}?`)}`}>
                        Ask the assistant about this client
                      </Link>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

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
