"use client";

import { useEffect, useRef, useState } from "react";
import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition } from "@/lib/radar/facts";

// Onboarding a client by talking about it.
//
// A single "describe the client" box asks the CA to remember, unprompted, which
// of thirteen attributes matter — so it collects a sector and a state and
// stops. The interview knows what is still missing and asks for it, one
// question at a time, which is what actually fills a profile the radar can
// match against.
//
// The profile builds up beside the conversation as it goes, so nothing is
// recorded that the CA has not watched arrive. Still a proposal until they
// press create.

const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;
const labelFor = (key: string) => DEFINITIONS.find((d) => d.key === key)?.label ?? key;

function readable(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ").replaceAll("_", " ").toLowerCase();
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value).replaceAll("_", " ");
}

type Turn = { role: "user" | "assistant"; content: string };
type Facts = Record<string, string | number | boolean | string[]>;

export function ClientChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [facts, setFacts] = useState<Facts>({});
  const [names, setNames] = useState({ legal: "", display: "" });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(history: Turn[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clients/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: history, facts }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error === "rate_limited"
          ? "Too many questions at once — give it a minute."
          : "The interview is unavailable. Use the manual form instead.");
        return;
      }
      setTurns([...history, { role: "assistant", content: body.reply }]);
      setFacts((current) => ({ ...current, ...(body.facts ?? {}) }));
      setNames((current) => ({
        legal: body.legalName || current.legal,
        display: body.displayName || current.display,
      }));
      if (body.complete) setComplete(true);
    } catch {
      setError("The interview is unavailable. Use the manual form instead.");
    } finally {
      setBusy(false);
    }
  }

  function begin() {
    setStarted(true);
    void send([{ role: "user", content: "Start. Ask me about the client." }]);
  }

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void send([...turns, { role: "user", content: text }]);
  }

  const answered = Object.keys(facts).length;
  // The first exchange is the prompt to begin, not something the CA said.
  const visible = turns.filter((turn, index) => !(index === 0 && turn.role === "user"));

  return (
    <div className="chat-onboard">
      <div className="chat-thread" ref={threadRef}>
        {!started ? (
          <div className="chat-intro">
            <p>
              Answer a few questions about the client and the profile fills itself in. Say
              “not sure” to any of them — it moves on rather than pressing.
            </p>
            <button className="button primary" type="button" onClick={begin}>Start</button>
          </div>
        ) : null}

        {visible.map((turn, index) => (
          <p key={index} className={turn.role === "assistant" ? "chat-line rm" : "chat-line ca"}>
            {turn.content}
          </p>
        ))}
        {busy ? <p className="chat-line rm chat-thinking">…</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>

      {started && !complete ? (
        <div className="chat-composer">
          <input
            aria-label="Your answer"
            type="text"
            value={input}
            placeholder="Type your answer"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submit(); } }}
            disabled={busy}
          />
          <button className="button" type="button" onClick={submit} disabled={busy || !input.trim()}>
            Send
          </button>
        </div>
      ) : null}

      <aside className="chat-profile">
        <p className="chat-profile-title">
          Profile · {answered} of {DEFINITIONS.length} recorded
        </p>
        {names.display ? (
          <p className="chat-profile-name">{names.display}</p>
        ) : null}
        {answered ? (
          <ul>
            {Object.entries(facts).map(([key, value]) => (
              <li key={key}><strong>{labelFor(key)}</strong><span>{readable(value)}</span></li>
            ))}
          </ul>
        ) : (
          <p className="chat-profile-empty">Nothing yet. It fills in as you answer.</p>
        )}

        {answered ? (
          <form action="/api/clients" method="post" className="chat-create">
            <input type="hidden" name="legalName" value={names.legal || names.display} />
            <input type="hidden" name="displayName" value={names.display || names.legal} />
            <input type="hidden" name="sector" value={String(facts["company.sector"] ?? "").replaceAll("_", " ")} />
            <input type="hidden" name="stateCode" value={String(facts["company.registered_state"] ?? "")} />
            <input type="hidden" name="facts" value={JSON.stringify(facts)} />
            <button className="button primary wide" type="submit" disabled={!(names.display || names.legal)}>
              Create this client
            </button>
            {!(names.display || names.legal) ? (
              <small>Tell it the client’s name and this becomes available.</small>
            ) : null}
          </form>
        ) : null}
      </aside>
    </div>
  );
}
