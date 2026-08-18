"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircleIcon } from "@/components/icons";

// This client's open filings — the same rows, wording and buttons as Today.
//
// The list here used to be read-only: you could see that a return was overdue
// but not record having filed it, so the page showed work it could not accept.
// Two screens describing the same obligation in two different dialects, one of
// which was a dead end.

export interface ClientWorkItem {
  id: string;
  title: string;
  authority: string;
  due: string;
  dueAt: string | null;
  overdue: boolean;
}

export function ClientWork({
  items,
  clientName,
  editable,
}: Readonly<{
  items: readonly ClientWorkItem[];
  clientName: string;
  editable: boolean;
}>) {
  const [doneIds, setDoneIds] = useState<readonly string[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [error, setError] = useState("");

  const open = items.filter((item) => !doneIds.includes(item.id));

  function complete(id: string, outcome: "filed" | "not_applicable") {
    setError("");
    setDoneIds((current) => [...current, id]);
    setOpenRow(null);
    void fetch(`/api/tasks/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
      })
      .catch(() => {
        setDoneIds((current) => current.filter((item) => item !== id));
        setOpenRow(null);
        setError("That could not be saved. Check your workspace access and try again.");
      });
  }

  return (
    <section className="q-section">
      <h2 className="q-section-head">
        Work
        <span>{open.length ? `${open.length} open` : "nothing open"}</span>
      </h2>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {open.length ? (
        <div className="q-client-body">
          {open.map((item) => {
            const expanded = openRow === item.id;
            return (
              <div className="q-item" key={item.id}>
                <div className="q-item-row">
                  {editable ? (
                    <button
                      aria-label={`Mark ${item.title} filed`}
                      className="q-mark"
                      onClick={() => complete(item.id, "filed")}
                      type="button"
                    >
                      <CheckCircleIcon />
                    </button>
                  ) : <span className="q-mark" />}
                  <button
                    aria-expanded={expanded}
                    className="q-line"
                    onClick={() => setOpenRow(expanded ? null : item.id)}
                    type="button"
                  >
                    <span className="q-line-main">{item.title}</span>
                    <span className={`q-line-meta${item.overdue ? " late" : ""}`}>
                      {item.overdue ? `was due ${item.due}` : item.due}
                    </span>
                  </button>
                </div>
                {expanded ? (
                  <div className="q-detail">
                    <p className="q-detail-why">{item.authority}</p>
                    {editable ? (
                      <p className="q-actions">
                        <button className="q-act" onClick={() => complete(item.id, "not_applicable")} type="button">
                          Not applicable this period
                        </button>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="q-empty">Work appears here when a filing falls due, or when you approve a change.</p>
      )}

      <p className="q-actions">
        <Link className="q-act" href={`/assistant?prompt=${encodeURIComponent(`What needs attention for ${clientName}?`)}`}>
          Ask the assistant about {clientName}
        </Link>
      </p>
    </section>
  );
}
