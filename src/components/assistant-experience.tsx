"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { ArrowUpIcon, CheckCircleIcon, SparklesIcon } from "@/components/icons";
import { ReviewGate } from "@/components/review-gate";
import { TrustBadge } from "@/components/trust-badge";
import {
  createTemplateAnswer,
  demoConversations,
  promptsByMode,
  type AssistantMode,
  type DemoConversation,
} from "@/lib/assistant-demo";
import type { ChatRetrievalPayload, RetrievedSource } from "@/lib/rag/types";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  mode: AssistantMode;
  content: string;
  retrieval?: ChatRetrievalPayload;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

type RequestState = "idle" | "loading" | "error";
type ActionReviewState = "reviewing" | "approved" | "deferred";

const answerHeadings = new Set([
  "CONCLUSION",
  "WHAT TO VERIFY",
  "NEXT STEPS",
  "SOURCE STATUS",
  "DRAFT ACTION",
  "REQUIRED EVIDENCE",
  "APPROVAL GATE",
  "EXECUTION STATUS",
]);

function createId(role: ConversationMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function messagesFromDemo(conversation: DemoConversation): readonly ConversationMessage[] {
  return conversation.messages.map((message, index) => ({
    ...message,
    id: `${conversation.id}-${index}`,
  }));
}

function formatSourceDate(value: string | null) {
  if (!value) return "Date not stated";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function CitationText({
  line,
  messageId,
  sources,
}: Readonly<{ line: string; messageId: string; sources: readonly RetrievedSource[] }>) {
  return line.split(/(\[S\d+\])/g).map((part, index) => {
    const citation = part.match(/^\[(S\d+)\]$/)?.[1];
    const source = citation
      ? sources.find((candidate) => candidate.citationId === citation)
      : null;
    return source ? (
      <a
        aria-label={`Jump to ${source.citationId}: ${source.title}`}
        className="inline-citation"
        href={`#source-${messageId}-${source.citationId}`}
        key={`${part}-${index}`}
      >
        {part}
      </a>
    ) : <span key={`${part}-${index}`}>{part}</span>;
  });
}

function StructuredAnswer({
  content,
  messageId,
  retrieval,
}: Readonly<{ content: string; messageId: string; retrieval?: ChatRetrievalPayload }>) {
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let current = { heading: "RESPONSE", lines: [] as string[] };

  for (const rawLine of content.split("\n")) {
    const line = rawLine
      .trim()
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1");
    const normalisedHeading = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/:$/, "")
      .trim();
    if (line === "---") continue;
    if (answerHeadings.has(normalisedHeading)) {
      if (current.lines.length) sections.push(current);
      current = { heading: normalisedHeading, lines: [] };
    } else if (line) {
      current.lines.push(line);
    }
  }
  if (current.lines.length) sections.push(current);

  return (
    <div className="structured-answer">
      {sections.map((section) => (
        <section key={`${section.heading}-${section.lines[0] ?? ""}`}>
          {section.heading === "RESPONSE" ? null : <h3>{section.heading}</h3>}
          {section.lines.map((line, index) => (
            <p className={/^\d+\./.test(line) ? "structured-step" : undefined} key={`${line}-${index}`}>
              <CitationText
                line={line}
                messageId={messageId}
                sources={retrieval?.sources ?? []}
              />
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

function ResearchTrail({
  messageId,
  retrieval,
}: Readonly<{ messageId: string; retrieval: ChatRetrievalPayload }>) {
  const stateLabel = {
    locked: "Sources support this answer",
    partial: "Some claims need review",
    unsupported: "No supporting source",
  }[retrieval.citationState];

  return (
    <section className="research-trail" aria-label="Retrieved regulatory evidence">
      <div className="research-trail-heading">
        <div>
          <p className="eyebrow">Research trail</p>
          <h3>{retrieval.sources.length} official source{retrieval.sources.length === 1 ? "" : "s"} retrieved</h3>
        </div>
        <div className="research-badges">
          <span className={`research-badge ${retrieval.citationState}`}>{stateLabel}</span>
          <span className="research-badge neutral">
            {retrieval.strategy === "hybrid" ? "Meaning + exact-term search" : "Exact-term search"}
          </span>
        </div>
      </div>
      <div className="research-summary">
        <span>Source match: <strong>{retrieval.confidence}</strong></span>
        <span>{retrieval.corpus.embeddedChunkCount} source sections searched</span>
        <span>{retrieval.corpus.fullTextSourceCount} complete official documents</span>
      </div>
      <div className="source-card-list">
        {retrieval.sources.map((source) => (
          <article
            className="assistant-source-card"
            id={`source-${messageId}-${source.citationId}`}
            key={source.sourceId}
          >
            <div className="source-card-citation">{source.citationId}</div>
            <div className="source-card-copy">
              <div className="source-card-meta">
                <span>{source.authority}</span>
                <span>{source.documentNumber ?? source.documentType}</span>
                <span>{formatSourceDate(source.publishedAt)}</span>
              </div>
              <h4>{source.title}</h4>
              <p>{source.applicability}</p>
              <div className="source-card-status">
                <span className={`source-status ${source.status}`}>{source.status}</span>
                <span>
                  {source.sourceKind === "official-full-text"
                    ? "Full official text"
                    : source.sourceKind === "official-index-text"
                      ? "Official index"
                      : "Verified summary"}
                </span>
                <span>{Math.round(source.relevance * 100)}% match strength</span>
              </div>
            </div>
            <a
              className="source-open-link"
              href={source.canonicalUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open official <span aria-hidden="true">↗</span>
            </a>
          </article>
        ))}
      </div>
      {retrieval.citationState !== "locked" ? (
        <p className="research-caveat">
          Some statements are not fully supported by the sources below. Check them before relying on this answer.
        </p>
      ) : null}
    </section>
  );
}

export function AssistantExperience({
  conversationHistory = [],
  initialConversationId = null,
  initialMessages = [],
  initialPrompt = "",
  templateMode = false,
}: Readonly<{
  conversationHistory?: readonly ConversationSummary[];
  initialConversationId?: string | null;
  initialMessages?: readonly ConversationMessage[];
  initialPrompt?: string;
  templateMode?: boolean;
}>) {
  const defaultConversation = templateMode ? demoConversations[0] : null;
  const [draft, setDraft] = useState(initialPrompt);
  const [mode, setMode] = useState<AssistantMode>(
    defaultConversation?.finalMode ?? initialMessages.at(-1)?.mode ?? "ask",
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    defaultConversation?.id ?? initialConversationId,
  );
  const [messages, setMessages] = useState<readonly ConversationMessage[]>(
    defaultConversation ? messagesFromDemo(defaultConversation) : initialMessages,
  );
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [actionStates, setActionStates] = useState<Record<string, ActionReviewState>>({});
  const [error, setError] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  async function requestAnswer(prompt: string) {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || requestState === "loading") return;

    const requestMode = mode;
    const userMessage: ConversationMessage = {
      id: createId("user"),
      role: "user",
      mode: requestMode,
      content: normalizedPrompt,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setActiveConversationId(null);
    setDraft("");
    setError("");
    setRequestState("loading");

    try {
      if (templateMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 420));
        setMessages((current) => [
          ...current,
          {
            id: createId("assistant"),
            role: "assistant",
            mode: requestMode,
            content: createTemplateAnswer(normalizedPrompt, requestMode),
          },
        ]);
        setRequestState("idle");
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          mode: requestMode,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = await response.json() as {
        text?: string;
        model?: string;
        error?: string;
        retrieval?: ChatRetrievalPayload;
        conversationId?: string;
        messageId?: string;
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || "Reg Mitra could not prepare an answer.");
      }

      setMessages((current) => [
        ...current,
        {
          id: payload.messageId ?? createId("assistant"),
          role: "assistant",
          mode: requestMode,
          content: payload.text ?? "",
          retrieval: payload.retrieval,
        },
      ]);
      if (payload.conversationId) setActiveConversationId(payload.conversationId);
      setRequestState("idle");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Reg Mitra could not prepare an answer.",
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
    setActiveConversationId(null);
    setMode("ask");
    setDraft("");
    setActionStates({});
    setError("");
    setRequestState("idle");
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  function loadConversation(conversation: DemoConversation) {
    setMessages(messagesFromDemo(conversation));
    setActiveConversationId(conversation.id);
    setMode(conversation.finalMode);
    setDraft("");
    setActionStates({});
    setError("");
    setRequestState("idle");
  }

  async function approveMessage(messageId: string) {
    if (!templateMode) {
      const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/review`, { method: "POST" });
      if (!response.ok) {
        setError("This draft could not be approved. Reviewer access is required.");
        return;
      }
    }
    setActionStates((current) => ({ ...current, [messageId]: "approved" }));
  }

  const hasConversation = messages.length > 0;
  const latestRetrieval = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.retrieval)
    ?.retrieval;

  return (
    <>
      <header className="assistant-hero">
        <span className="assistant-symbol"><SparklesIcon /></span>
        <div>
          <p className="eyebrow">Answers with official sources</p>
          <h1>Ask Reg Mitra</h1>
          <p>Ask a compliance question or prepare a draft. The source and review status stay visible.</p>
        </div>
        <div className="assistant-hero-actions">
          <div className="assistant-mode-switch" aria-label="Assistant mode">
            {(["ask", "act"] as const).map((item) => (
              <button
                aria-pressed={mode === item}
                className={mode === item ? "active" : ""}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                <strong>{item === "ask" ? "Ask" : "Act"}</strong>
                <small>{item === "ask" ? "Explain & verify" : "Prepare & preview"}</small>
              </button>
            ))}
          </div>
          {hasConversation ? (
            <button className="button assistant-reset" onClick={startAgain} type="button">
              New conversation
            </button>
          ) : null}
        </div>
      </header>

      {templateMode ? (
        <div className="assistant-template-note" role="note">
          <strong>Demo only.</strong>
          <span>All clients and conversations are fictional.</span>
          <span>Nothing can be sent or filed.</span>
        </div>
      ) : null}

      <div className="assistant-layout">
        <aside className="conversation-library" aria-label={templateMode ? "Sample conversations" : "Recent conversations"}>
          <div className="conversation-library-heading">
            <p className="eyebrow">{templateMode ? "Sample sessions" : "Recent reviews"}</p>
            <h2>{templateMode ? "See the full workflow" : "Continue your work"}</h2>
            <p>{templateMode ? "Realistic CA use cases, shown with fictional data." : "Saved securely in this firm workspace."}</p>
          </div>
          <div className="conversation-list">
            {templateMode
              ? demoConversations.map((conversation) => (
                <button
                  aria-pressed={activeConversationId === conversation.id}
                  className={`conversation-card ${activeConversationId === conversation.id ? "active" : ""}`}
                  key={conversation.id}
                  onClick={() => loadConversation(conversation)}
                  type="button"
                >
                  <span className="conversation-mode">{conversation.modeLabel}</span>
                  <strong>{conversation.title}</strong>
                  <small>{conversation.description}</small>
                </button>
              ))
              : conversationHistory.map((conversation) => (
                <Link
                  aria-current={activeConversationId === conversation.id ? "page" : undefined}
                  className={`conversation-card ${activeConversationId === conversation.id ? "active" : ""}`}
                  href={`/assistant?conversation=${encodeURIComponent(conversation.id)}`}
                  key={conversation.id}
                >
                  <span className="conversation-mode">Saved review</span>
                  <strong>{conversation.title}</strong>
                  <small>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(conversation.updatedAt))}</small>
                </Link>
              ))}
          </div>
          <p className="conversation-library-footnote">
            Never paste client secrets, portal passwords, or OTPs into chat.
          </p>
        </aside>

        <section className="assistant-main">
          {!hasConversation ? (
            <div className="assistant-welcome">
              <div>
                <span className="mode-kicker">{mode === "ask" ? "ASK MODE" : "ACT MODE"}</span>
                <h2>{mode === "ask" ? "What do you need to understand?" : "What should Reg Mitra prepare?"}</h2>
                <p>
                  {mode === "ask"
                    ? "Ask a compliance question and get a conclusion, verification path, next steps, and source status."
                    : "Prepare a draft action for review. Reg Mitra will not send, submit, file, or change an external system."}
                </p>
                <div className="prompt-grid">
                  {promptsByMode[mode].map((prompt) => (
                    <button
                      className="prompt-card"
                      onClick={() => void requestAnswer(prompt)}
                      type="button"
                      key={prompt}
                    >
                      <span>{mode === "ask" ? "Ask" : "Act"}</span>
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
                  <span>You · {message.mode === "ask" ? "Ask" : "Act"}</span>
                  <p>{message.content}</p>
                </div>
              ) : (
                <article className={`assistant-answer ${message.mode === "act" ? "act-answer" : ""}`} key={message.id}>
                  <div className="answer-heading">
                    <span className="answer-icon"><CheckCircleIcon /></span>
                    <div>
                      <p className="eyebrow">
                        {message.mode === "act" ? "Act preview" : "Ask answer"} · Reg Mitra
                      </p>
                      <h2>
                        {message.mode === "act"
                          ? "Prepared — awaiting your review"
                          : "Prepared for professional review"}
                      </h2>
                    </div>
                    <span className={`answer-mode-badge ${message.mode}`}>
                      {message.mode === "act" ? "Not sent" : "Official sources shown"}
                    </span>
                  </div>
                  <StructuredAnswer
                    content={message.content}
                    messageId={message.id}
                    retrieval={message.retrieval}
                  />
                  {message.retrieval ? (
                    <ResearchTrail messageId={message.id} retrieval={message.retrieval} />
                  ) : null}
                  <div className="answer-actions">
                    {message.mode === "act" ? (
                      <>
                        <button
                          className="button primary"
                          onClick={() => setActionStates((current) => ({ ...current, [message.id]: "reviewing" }))}
                          type="button"
                        >
                          Review draft
                        </button>
                        <button
                          className="button"
                          onClick={() => setActionStates((current) => ({ ...current, [message.id]: "deferred" }))}
                          type="button"
                        >
                          Not now
                        </button>
                      </>
                    ) : (
                      <>
                        <Link className="button primary" href="/clients">{templateMode ? "Review sample clients" : "Review clients"}</Link>
                        <button className="button" onClick={() => setMode("act")} type="button">Continue in Act</button>
                      </>
                    )}
                  </div>
                  {message.mode === "act" && actionStates[message.id] === "reviewing" ? (
                    <div className="action-review-sheet" role="status">
                      <div>
                        <span className="action-review-step">Approval checkpoint</span>
                        <strong>Review the scope and evidence before continuing</strong>
                        <p>{templateMode ? "This demo records a preview decision only." : "This records internal professional approval only."} External execution remains disabled.</p>
                      </div>
                      <div className="action-review-flow" aria-label="Action status">
                        <span className="complete">Prepared</span>
                        <i />
                        <span className="active">Your review</span>
                        <i />
                        <span>Not executed</span>
                      </div>
                      <div className="action-review-buttons">
                        <button
                          className="button primary"
                          onClick={() => void approveMessage(message.id)}
                          type="button"
                        >
                          Approve for internal use
                        </button>
                        <button
                          className="button"
                          onClick={() => setActionStates((current) => {
                            const next = { ...current };
                            delete next[message.id];
                            return next;
                          })}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {message.mode === "act" && actionStates[message.id] === "approved" ? (
                    <div className="action-result positive" role="status">
                      <CheckCircleIcon />
                      <span>
                        <strong>{templateMode ? "Demo approval recorded" : "Professional approval recorded"}</strong>
                        <small>No external action was executed. An authorised last-mile confirmation remains required.</small>
                      </span>
                    </div>
                  ) : null}
                  {message.mode === "act" && actionStates[message.id] === "deferred" ? (
                    <div className="action-result" role="status">
                      <span>
                        <strong>{templateMode ? "Set aside for this demo session" : "Set aside for this session"}</strong>
                        <small>The draft remains unchanged and nothing was executed.</small>
                      </span>
                      <button
                        className="text-link"
                        onClick={() => setActionStates((current) => {
                          const next = { ...current };
                          delete next[message.id];
                          return next;
                        })}
                        type="button"
                      >
                        Return to draft
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}

              {requestState === "loading" ? (
                <div className="assistant-thinking">
                  <span className="thinking-mark"><SparklesIcon /></span>
                  <span>
                    <strong>{mode === "ask" ? "Preparing the review" : "Preparing a safe action preview"}</strong>
                    <small>Checking context, evidence gaps, and approval boundaries…</small>
                  </span>
                </div>
              ) : null}

              {error ? (
                <div className="assistant-error" role="alert">
                  <strong>Couldn’t prepare the answer</strong>
                  <span>{error}</span>
                  <button
                    className="text-link"
                    onClick={() => void requestAnswer(draft || messages.filter((message) => message.role === "user").at(-1)?.content || "")}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {messages.some((message) => message.role === "assistant") ? (
                <ReviewGate
                  title="A professional stays in control"
                  description="Reg Mitra prepares and explains. An authorised professional must verify applicability and approve anything before it is sent, submitted, or filed."
                />
              ) : null}
            </div>
          )}

          <form className="composer" onSubmit={submit}>
            <div className="composer-mode-line">
              <span className={`composer-mode ${mode}`}>{mode === "ask" ? "Ask" : "Act"}</span>
              <span>
                {mode === "ask"
                  ? "Research and explain with visible evidence gaps"
                  : "Prepare a draft — never execute without approval"}
              </span>
            </div>
            <textarea
              aria-label={`${mode === "ask" ? "Ask" : "Act with"} Reg Mitra`}
              disabled={requestState === "loading"}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={mode === "ask" ? "Ask a compliance question…" : "Describe what you want prepared…"}
              ref={composerRef}
              value={draft}
            />
            <div className="composer-actions">
              <span className="composer-note">
                {templateMode ? "Template response · no live systems queried" : "Protected server route"} · ⌘ Enter
              </span>
              <button
                className="button primary"
                disabled={!draft.trim() || requestState === "loading"}
                type="submit"
              >
                {requestState === "loading" ? "Preparing…" : mode === "ask" ? "Ask" : "Prepare"} <ArrowUpIcon />
              </button>
            </div>
          </form>
        </section>

        <aside className="context-panel" aria-label="Trust and review context">
          <div className="context-section">
            <p className="eyebrow">Mode contract</p>
            <h2>{mode === "ask" ? "Ask is read-only" : "Act is approval-gated"}</h2>
            <div className="context-item">
              <TrustBadge kind="evidence" state={templateMode ? "demo" : latestRetrieval?.citationState === "locked" ? "verified" : "unverified"} />
              <span>
                {mode === "ask"
                  ? "Explains, compares, and identifies what must be verified."
                  : "Prepares drafts, checklists, calendar changes, and portal handoffs."}
              </span>
            </div>
            <div className="context-item">
              <span className="context-num">✓</span>
              <span>Stops before Submit, OTP, filing, payment, email, or WhatsApp.</span>
            </div>
          </div>
          {latestRetrieval ? (
            <div className="context-section retrieval-context">
              <p className="eyebrow">Live research</p>
              <h2>
                {latestRetrieval.citationState === "locked"
                  ? "Answer linked to its evidence"
                  : "Evidence needs your check"}
              </h2>
              <div className="context-item">
                <span className="context-num">S</span>
                <span>{latestRetrieval.sources.length} official sources retrieved for the latest answer.</span>
              </div>
              <div className="context-item">
                <span className="context-num">↗</span>
                <span>
                  {latestRetrieval.strategy === "hybrid"
                    ? "Reg Mitra checked both meaning and exact regulatory terms."
                    : "Reg Mitra used exact-term search for this answer."}
                </span>
              </div>
            </div>
          ) : null}
          <div className="context-section">
            <p className="eyebrow">Every answer shows</p>
            <h2>A conclusion you can inspect</h2>
            <div className="context-item"><span className="context-num">1</span><span>Plain-language impact and assumptions.</span></div>
            <div className="context-item"><span className="context-num">2</span><span>An ordered evidence and verification path.</span></div>
            <div className="context-item"><span className="context-num">3</span><span>Explicit source and execution status.</span></div>
          </div>
          <div className="context-section assistant-contact-box">
            <p className="eyebrow">Human help</p>
            <h2>Ask a question or connect with us</h2>
            <p>Talk through source coverage, your firm’s workflow, or starting a 7-day trial.</p>
            <div>
              <Link className="button" href="/faq">View FAQs</Link>
              <Link className="button primary" href="/start">Start 7-day trial</Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
