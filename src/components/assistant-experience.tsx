"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { ArrowUpIcon, CheckCircleIcon, SparklesIcon } from "@/components/icons";
import { ReviewGate } from "@/components/review-gate";
import { TrustBadge } from "@/components/trust-badge";

const prompts = [
  "What needs attention for Sharma Pharma?",
  "Prepare a review checklist for the next filing",
  "Compare open work across all clients",
  "Help me verify a regulatory claim",
] as const;

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

type RequestState = "idle" | "loading" | "error";

function createId(role: ConversationMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AssistantExperience({ initialPrompt = "" }: Readonly<{ initialPrompt?: string }>) {
  const [draft, setDraft] = useState(initialPrompt);
  const [messages, setMessages] = useState<readonly ConversationMessage[]>([]);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  async function requestAnswer(prompt: string) {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || requestState === "loading") return;

    const userMessage: ConversationMessage = {
      id: createId("user"),
      role: "user",
      content: normalizedPrompt,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setError("");
    setRequestState("loading");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = await response.json() as {
        text?: string;
        model?: string;
        error?: string;
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || "Gemini could not prepare an answer.");
      }

      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          content: payload.text ?? "",
          model: payload.model,
        },
      ]);
      setRequestState("idle");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gemini could not prepare an answer.",
      );
      setRequestState("error");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestAnswer(draft);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void requestAnswer(draft);
    }
  }

  function startAgain() {
    setMessages([]);
    setDraft("");
    setError("");
    setRequestState("idle");
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  const hasConversation = messages.length > 0;

  return (
    <>
      <header className="assistant-hero">
        <span className="assistant-symbol"><SparklesIcon /></span>
        <div>
          <p className="eyebrow">Gemini-powered preparation</p>
          <h1>Ask Reg Mitra</h1>
          <p>Turn a compliance question into a clear, reviewable next step.</p>
        </div>
        {hasConversation ? (
          <button className="button assistant-reset" onClick={startAgain} type="button">
            New conversation
          </button>
        ) : null}
      </header>

      <div className="assistant-layout">
        <section className="assistant-main">
          {!hasConversation ? (
            <div className="assistant-welcome">
              <div>
                <h2>What are you trying to get done?</h2>
                <p>
                  Choose a starting point or describe the result you need.
                  Gemini will prepare the work; a qualified professional must verify every conclusion.
                </p>
                <div className="prompt-grid">
                  {prompts.map((prompt) => (
                    <button
                      className="prompt-card"
                      onClick={() => void requestAnswer(prompt)}
                      type="button"
                      key={prompt}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="assistant-response" aria-live="polite">
              {messages.map((message) => message.role === "user" ? (
                <div className="assistant-query" key={message.id}>
                  <span>You</span>
                  <p>{message.content}</p>
                </div>
              ) : (
                <article className="gemini-answer" key={message.id}>
                  <div className="answer-heading">
                    <span className="answer-icon"><CheckCircleIcon /></span>
                    <div>
                      <p className="eyebrow">Gemini response</p>
                      <h2>Prepared for professional review</h2>
                    </div>
                    <span className="model-label">{message.model}</span>
                  </div>
                  <div className="ai-answer-text">{message.content}</div>
                  <div className="answer-actions">
                    <Link className="button primary" href="/clients">Review clients</Link>
                    <Link className="button" href="/settings">Review source setup</Link>
                  </div>
                </article>
              ))}

              {requestState === "loading" ? (
                <div className="assistant-thinking">
                  <span className="thinking-mark"><SparklesIcon /></span>
                  <span><strong>Gemini is preparing the review</strong><small>Checking the workspace context and safeguards…</small></span>
                </div>
              ) : null}

              {error ? (
                <div className="assistant-error" role="alert">
                  <strong>Couldn’t prepare the answer</strong>
                  <span>{error}</span>
                  <button className="text-link" onClick={() => void requestAnswer(draft || messages.at(-1)?.content || "")} type="button">
                    Try again
                  </button>
                </div>
              ) : null}

              {messages.some((message) => message.role === "assistant") ? (
                <ReviewGate
                  title="A professional must verify this"
                  description="Gemini can prepare research and next steps, but it cannot confirm current law, client applicability, or a filing position without authoritative evidence and professional review."
                />
              ) : null}
            </div>
          )}

          <form className="composer" onSubmit={submit}>
            <textarea
              aria-label="Ask Reg Mitra"
              disabled={requestState === "loading"}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={hasConversation ? "Ask a follow-up…" : "Describe the outcome you need…"}
              ref={composerRef}
              value={draft}
            />
            <div className="composer-actions">
              <span className="composer-note">Gemini connected securely · ⌘ Enter to send</span>
              <button
                className="button primary"
                disabled={!draft.trim() || requestState === "loading"}
                type="submit"
              >
                {requestState === "loading" ? "Preparing…" : "Send"} <ArrowUpIcon />
              </button>
            </div>
          </form>
        </section>

        <aside className="context-panel" aria-label="Trust and review context">
          <div className="context-section">
            <p className="eyebrow">Connection</p>
            <h2>Gemini via protected server route</h2>
            <div className="context-item"><TrustBadge kind="evidence" state="connected" /><span>The API key is never sent to the browser.</span></div>
            <div className="context-item"><TrustBadge kind="evidence" state="demo" /><span>Client and work data remain illustrative.</span></div>
          </div>
          <div className="context-section">
            <p className="eyebrow">Safe result</p>
            <h2>Every answer should leave you with</h2>
            <div className="context-item"><span className="context-num">1</span><span>A plain-language conclusion.</span></div>
            <div className="context-item"><span className="context-num">2</span><span>A short, ordered verification path.</span></div>
            <div className="context-item"><span className="context-num">3</span><span>An explicit source status.</span></div>
          </div>
        </aside>
      </div>
    </>
  );
}
