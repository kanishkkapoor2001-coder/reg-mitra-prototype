"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircleIcon, SparklesIcon } from "@/components/icons";
import { reviewImpact } from "@/lib/radar/review-client";
import { asInstruction } from "@/lib/format";
import type { EvidenceState, RiskLevel } from "@/lib/types";

// The queue, under one presentation system with four priority classes:
//
//   1. the verdict  — one line, the only large text on the page
//   2. the list     — one plain line per client, hairlines, no boxes
//   3. metadata     — small, grey, right-aligned, never in a filled pill
//   4. actions      — hidden until a row is opened
//
// Density is fixed by LAYERING, not by shrinking: the surface carries the
// minimum a CA needs to choose what to touch, and every supporting detail —
// authority, evidence, secondary actions — lives one click deeper. Nothing is
// boxed inside anything else; whitespace and type scale do the separating.

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
  soonest: string | null;
  oldestOverdue: string | null;
};

function startOfTodayIST(): Date {
  return new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
}

// A CA does not do thirty filings; they do six clients — open one client's
// file, clear what it needs, close it. Deadline decides the ORDER; the client
// is the UNIT.
function buildSessions(items: readonly TodayItem[], changes: readonly TodayChange[]): ClientSession[] {
  const today = startOfTodayIST();
  const weekOut = new Date(today);
  weekOut.setDate(weekOut.getDate() + 7);

  const byClient = new Map<string, ClientSession>();

  const ensure = (clientId: string | null, clientName: string): ClientSession => {
    const key = clientId ?? `name:${clientName}`;
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

  return [...byClient.values()].sort((a, b) => {
    if (a.overdue !== b.overdue) return b.overdue - a.overdue;
    if (a.oldestOverdue && b.oldestOverdue) return a.oldestOverdue.localeCompare(b.oldestOverdue);
    if (a.changes.length !== b.changes.length) return b.changes.length - a.changes.length;
    return String(a.soonest ?? "9999").localeCompare(String(b.soonest ?? "9999"));
  });
}

/** Class 3, next to a client's name: how much trouble they are in. */
function sessionSummary(session: ClientSession): string {
  const parts: string[] = [];
  if (session.overdue) parts.push(`${session.overdue} overdue`);
  if (session.dueThisWeek) parts.push(`${session.dueThisWeek} due`);
  if (session.changes.length) parts.push(`${session.changes.length} to decide`);
  if (parts.length) return parts.join(" · ");
  return session.items.length ? `${session.items.length} later` : "clear";
}

export function TodayExperience({
  items,
  changes = [],
  mode,
  hasClients = false,
  notice = "",
  watching,
}: Readonly<{
  items: readonly TodayItem[];
  changes?: readonly TodayChange[];
  mode: "demo" | "public" | "product";
  hasClients?: boolean;
  notice?: string;
  /** One sentence: what is being watched and when it was last checked. */
  watching?: string;
}>) {
  const [reviewedIds, setReviewedIds] = useState<readonly string[]>([]);
  const [decidedChanges, setDecidedChanges] = useState<readonly string[]>([]);
  const [openClient, setOpenClient] = useState<string | null>(null);
  // One open row at a time. Actions are class 4, and two open action strips on
  // screen is exactly the noise this system exists to remove.
  const [openRow, setOpenRow] = useState<string | null>(null);
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

  const totalOverdue = sessions.reduce((total, session) => total + session.overdue, 0);
  const clientsInTrouble = sessions.filter((session) => session.overdue).length;
  const first = sessions[0];
  const activeKey = openClient ?? (first ? (first.clientId ?? first.clientName) : null);

  const dateLine = new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  }).format(new Date());

  // Class 1. Not a count of what exists — the next move, named.
  const verdict = totalOverdue && first
    ? `Start with ${first.clientName}`
    : openChanges.length && first
      ? `Decide ${first.clientName}’s change`
      : openItems.length
        ? "Nothing overdue"
        : "You’re clear";

  const subline = totalOverdue
    ? `${totalOverdue} ${totalOverdue === 1 ? "filing" : "filings"} past due across ${clientsInTrouble} ${clientsInTrouble === 1 ? "client" : "clients"}. Everything else has time.`
    : openItems.length
      ? "Listed by client, most urgent first."
      : mode === "demo"
        ? "The sample queue has been cleared for this session."
        : "No client work is currently assigned to you.";

  function complete(id: string, outcome: "filed" | "not_applicable") {
    setReviewError("");
    setReviewedIds((current) => [...current, id]);
    setOpenRow(null);

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

  function decideChange(change: TodayChange, state: "approved" | "rejected") {
    setDecidedChanges((current) => [...current, change.id]);
    setOpenRow(null);
    void reviewImpact(change.id, state).then((ok) => {
      if (!ok) {
        setDecidedChanges((current) => current.filter((id) => id !== change.id));
        setReviewError("That decision could not be saved. Try again.");
      }
    });
  }

  return (
    <div className="q">
      {mode === "public" ? (
        <p className="q-sample" role="note">
          <strong>Sample queue.</strong> These are fictional clients, shown so you can see
          how the review flow works. <Link className="text-link" href="/practice">Add your clients</Link>
        </p>
      ) : null}

      <header className="q-head">
        <p className="q-date">{dateLine}</p>
        <h1 className="q-verdict">{verdict}</h1>
        <p className="q-sub">{subline}</p>
        <p className="q-head-links">
          {mode === "product" ? <Link className="text-link" href="/tasks/new">Add work</Link> : null}
          <Link className="text-link" href="/assistant"><SparklesIcon /> Assistant</Link>
        </p>
      </header>

      {notice ? <p className="q-notice" role="status">{notice}</p> : null}
      {reviewError ? <p className="form-error" role="alert">{reviewError}</p> : null}

      <div className="q-list">
        {sessions.map((session) => {
          const key = session.clientId ?? session.clientName;
          const open = activeKey === key;
          return (
            <section className={`q-client${open ? " open" : ""}`} key={key}>
              <button
                aria-expanded={open}
                className="q-client-row"
                onClick={() => setOpenClient(open ? "" : key)}
                type="button"
              >
                <span className="q-client-name">{session.clientName}</span>
                <span className={`q-client-sum${session.overdue ? " late" : ""}`}>
                  {sessionSummary(session)}
                </span>
              </button>

              {open ? (
                <div className="q-client-body">
                  {session.changes.map((change) => {
                    const expanded = openRow === change.id;
                    return (
                      <div className="q-item" key={change.id}>
                        <div className="q-item-row">
                          <span aria-hidden="true" className="q-mark q-mark-ask">?</span>
                          <button
                            aria-expanded={expanded}
                            className="q-line"
                            onClick={() => setOpenRow(expanded ? null : change.id)}
                            type="button"
                          >
                            <span className="q-line-main">Does this {change.authority} change apply?</span>
                            <span className="q-line-meta">decide</span>
                          </button>
                        </div>
                        {expanded ? (
                          <div className="q-detail">
                            <a className="q-detail-source" href={change.url} target="_blank" rel="noreferrer">
                              {change.title} <span aria-hidden="true">↗</span>
                            </a>
                            <p className="q-detail-why">{change.applicability}</p>
                            <p className="q-actions">
                              <button className="q-act strong" onClick={() => decideChange(change, "approved")} type="button">
                                Applies — add to work
                              </button>
                              <button className="q-act" onClick={() => decideChange(change, "rejected")} type="button">
                                Not applicable
                              </button>
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {session.items.map((item) => {
                    const late = Boolean(item.dueAt && new Date(item.dueAt) < startOfTodayIST());
                    const expanded = openRow === item.id;
                    return (
                      <div className="q-item" key={item.id}>
                        <div className="q-item-row">
                          {/* The circle IS filing it — one tap, no labelled
                              button. Ten "Filed / N-A" pairs on screen was
                              most of the noise on this page. */}
                          <button
                            aria-label={`Mark ${item.title} filed`}
                            className="q-mark"
                            onClick={() => complete(item.id, "filed")}
                            type="button"
                          >
                            <CheckCircleIcon />
                          </button>
                          <button
                            aria-expanded={expanded}
                            className="q-line"
                            onClick={() => setOpenRow(expanded ? null : item.id)}
                            type="button"
                          >
                            <span className="q-line-main">{asInstruction(item.title, "")}</span>
                            <span className={`q-line-meta${late ? " late" : ""}`}>
                              {late ? `was due ${item.due}` : item.due}
                            </span>
                          </button>
                        </div>
                        {expanded ? (
                          <div className="q-detail">
                            <p className="q-detail-why">{item.authority}</p>
                            <p className="q-actions">
                              <button className="q-act" onClick={() => complete(item.id, "not_applicable")} type="button">
                                Not applicable this period
                              </button>
                              {item.clientId ? (
                                <Link className="q-act" href={`/clients/${item.clientId}`}>Open client</Link>
                              ) : null}
                              <Link className="q-act" href={`/assistant?prompt=${encodeURIComponent(item.title)}`}>
                                Ask the assistant
                              </Link>
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}

        {!sessions.length ? (
          <p className="q-empty">
            {mode === "product" && !hasClients ? (
              <>No clients yet. <Link className="text-link" href="/clients/new">Add your first client</Link> to build a queue.</>
            ) : (
              "Nothing open."
            )}
          </p>
        ) : null}
      </div>

      <p className="q-watch">
        {watching ?? "Reg Mitra checks the official sources for you."}
        {" "}
        <Link className="text-link" href="/calendar">See the calendar</Link>
      </p>
    </div>
  );
}
