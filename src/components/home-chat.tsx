"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpIcon } from "@/components/icons";

// The home page's chat. It ANSWERS here — same API, same retrieval, same
// model as the assistant page — rather than bouncing the question to another
// screen, which made the box pointless. The assistant page remains the place
// for long sessions and history; the conversation started here is saved and
// waiting in its sidebar.

type Exchange = { question: string; answer: string; done: boolean };

/** Minimal markdown for answers: headings, bullets, bold. */
function renderAnswer(text: string) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (list.length) {
      blocks.push(<ul key={key}>{list.map((entry, i) => <li key={i}>{bold(entry)}</li>)}</ul>);
      list = [];
    }
  };
  const bold = (line: string) =>
    line.split(/\*\*([^*]+)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));

  text.split("\n").forEach((raw, index) => {
    const line = raw.trimEnd();
    if (/^\s*[-•]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-•]\s+/, ""));
      return;
    }
    flush(`l${index}`);
    if (!line.trim()) return;
    if (/^#{1,6}\s+/.test(line)) {
      blocks.push(<p className="hc-heading" key={index}>{bold(line.replace(/^#{1,6}\s+/, ""))}</p>);
      return;
    }
    blocks.push(<p key={index}>{bold(line)}</p>);
  });
  flush("tail");
  return blocks;
}

export function HomeChat() {
  const [value, setValue] = useState("");
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const conversationRef = useRef<string | null>(null);

  async function ask(question: string) {
    setBusy(true);
    setError("");
    const index = exchanges.length;
    setExchanges((current) => [...current, { question, answer: "", done: false }]);

    const transcript = [
      ...exchanges.flatMap((exchange) => [
        { role: "user", content: exchange.question },
        { role: "assistant", content: exchange.answer },
      ]),
      { role: "user", content: question },
    ];

    const patch = (change: Partial<Exchange>) =>
      setExchanges((current) => current.map((e, i) => (i === index ? { ...e, ...change } : e)));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationRef.current ?? undefined,
          messages: transcript,
        }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !response.body || !contentType.includes("text/event-stream")) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Reg Mitra could not prepare an answer.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          let event: { type?: string; text?: string; error?: string; conversationId?: string };
          try {
            event = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }
          if (event.type === "delta" && event.text) {
            const delta = event.text;
            setExchanges((current) =>
              current.map((e, i) => (i === index ? { ...e, answer: e.answer + delta } : e)));
          } else if (event.type === "done") {
            if (event.conversationId) conversationRef.current = event.conversationId;
          } else if (event.type === "error" && event.error) {
            throw new Error(event.error);
          }
        }
      }
      patch({ done: true });
    } catch (caught) {
      setExchanges((current) => current.filter((_, i) => i !== index));
      setError(caught instanceof Error ? caught.message : "Reg Mitra could not prepare an answer.");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const question = value.trim();
    if (!question || busy) return;
    setValue("");
    void ask(question);
  }

  return (
    <div className="home-chat">
      <form
        className="home-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          aria-label="Ask Reg Mitra"
          onChange={(event) => setValue(event.target.value)}
          placeholder={exchanges.length ? "Ask a follow-up…" : "Ask anything — a circular, a due date, a client…"}
          value={value}
        />
        <button aria-label="Ask" className="home-composer-send" disabled={!value.trim() || busy} type="submit">
          <ArrowUpIcon />
        </button>
      </form>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {exchanges.map((exchange, index) => (
        <div className="hc-exchange" key={index}>
          <p className="hc-q">{exchange.question}</p>
          <div className="hc-a" aria-live="polite">
            {exchange.answer ? renderAnswer(exchange.answer) : <p className="hc-thinking">Checking the sources…</p>}
          </div>
        </div>
      ))}

      {exchanges.some((exchange) => exchange.done) ? (
        <p className="q-actions">
          <Link className="q-act" href="/assistant">
            Continue in the assistant — this conversation is saved there
          </Link>
        </p>
      ) : null}
    </div>
  );
}
