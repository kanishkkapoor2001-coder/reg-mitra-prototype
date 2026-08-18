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
  const [error, setError] = useState("");

  const open = items.filter((item) => !doneIds.includes(item.id));

  function complete(id: string, outcome: "filed" | "not_applicable") {
    setError("");
    setDoneIds((current) => [...current, id]);
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
        setError("That could not be saved. Check your workspace access and try again.");
      });
  }

  return (
    <section className="client-section">
      <div className="client-section-head">
        <h2>Their work</h2>
        <p>
          {open.length
            ? `${open.length} open ${open.length === 1 ? "filing" : "filings"} — the same queue as Today.`
            : "Nothing open for this client."}
        </p>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {open.length ? (
        <div className="client-work-list">
          {open.map((item) => (
            <div className={`session-item ${item.overdue ? "late" : ""}`} key={item.id}>
              <span className="session-item-copy">
                <strong>{item.title}</strong>
                <small>{item.authority}</small>
              </span>
              <span className={`decision-due ${item.overdue ? "high" : "low"}`}>
                {item.overdue ? `Was due ${item.due}` : item.due}
              </span>
              {editable ? (
                <span className="session-item-actions">
                  <button className="button small primary" onClick={() => complete(item.id, "filed")} type="button">
                    <CheckCircleIcon /> Filed
                  </button>
                  <button className="button small" onClick={() => complete(item.id, "not_applicable")} type="button">
                    N/A
                  </button>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="client-section-empty">
          Work appears here when a filing falls due, or when you approve a change above.
        </p>
      )}

      <Link className="text-link" href={`/assistant?prompt=${encodeURIComponent(`What needs attention for ${clientName}?`)}`}>
        Ask the assistant about {clientName}
      </Link>
    </section>
  );
}
