"use client";

import Link from "next/link";
import { FormEvent, Fragment, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  CheckCircleIcon,
  CloseIcon,
  EditIcon,
  FileIcon,
  MoreIcon,
  SparklesIcon,
  StopIcon,
  SyncIcon,
} from "@/components/icons";
import { ReviewGate } from "@/components/review-gate";
import { TrustBadge } from "@/components/trust-badge";
import {
  createTemplateAnswer,
  demoConversations,
  promptsByMode,
  type AssistantMode,
  type DemoConversation,
} from "@/lib/assistant-demo";
import type { ExtractedNotice } from "@/lib/notices/extraction";
import { selectRelevantClients } from "@/lib/practice/context";
import { loadProfile } from "@/lib/practice/store";
import type { ChatRetrievalPayload, ChatVerificationPayload, RetrievedSource } from "@/lib/rag/types";
import { daysFromTodayIST } from "@/lib/dates";
import { corpusFreshness } from "@/lib/rag/freshness";
import { groupConversationsByRecency } from "@/lib/conversation-groups";

type Completeness = "complete" | "partial";

export interface ConversationMessage {
  id: string;
  serverId?: string;
  role: "user" | "assistant";
  mode: AssistantMode;
  content: string;
  retrieval?: ChatRetrievalPayload;
  streaming?: boolean;
  stopped?: boolean;
  completeness?: Completeness;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

type RequestState = "idle" | "loading" | "error";
type ActionReviewState = "reviewing" | "approved" | "deferred";

interface StreamEvent {
  type: "retrieval" | "delta" | "verification" | "done" | "error";
  text?: string;
  error?: string;
  retrieval?: ChatRetrievalPayload;
  verification?: ChatVerificationPayload;
  completeness?: Completeness;
  conversationId?: string;
  messageId?: string;
}

const answerHeadings = new Set([
  "DIRECT ANSWER",
  "WHY IT MATTERS",
  "SOURCES",
  "CAVEATS AND MISSING INFORMATION",
  "CAVEATS",
  "MISSING INFORMATION",
  "POSSIBLE NEXT STEP",
  "NEXT STEP",
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

function messagesFromDemo(conversation: DemoConversation): ConversationMessage[] {
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

function renderCitations(
  text: string,
  messageId: string,
  sources: readonly RetrievedSource[],
) {
  // Tolerates marker variants like "[S1, Excerpt 2]" — the link targets the first
  // source id found inside the bracket group.
  return text.split(/(\[[^\]]*?\bS\d+\b[^\]]*?\])/g).map((part, index) => {
    const citation = /^\[[^\]]*?\bS\d+\b[^\]]*?\]$/.test(part)
      ? part.match(/\bS\d+\b/)?.[0]
      : null;
    const source = citation
      ? sources.find((candidate) => candidate.citationId === citation)
      : null;
    return source ? (
      <a
        aria-label={`Jump to ${source.citationId}: ${source.title}`}
        className="inline-citation"
        href={`#source-${messageId}-${source.citationId}`}
        key={`${part}-${index}`}
        title={`${source.citationId} · ${source.authority}: ${source.title}`}
      >
        {part}
      </a>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    );
  });
}

function renderInline(
  text: string,
  messageId: string,
  sources: readonly RetrievedSource[],
) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={`b-${index}`}>{renderCitations(bold[1] ?? "", messageId, sources)}</strong>
      );
    }
    return <Fragment key={`t-${index}`}>{renderCitations(part, messageId, sources)}</Fragment>;
  });
}

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul" | "ol"; items: string[] };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const rawLine of content.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed === "---") {
      flush();
      continue;
    }

    const cleaned = trimmed
      .replace(/^#{1,6}\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/:$/, "")
      .trim();
    const isMarkdownHeading = /^#{1,6}\s+/.test(trimmed);
    const isKnownLabel = answerHeadings.has(cleaned.toUpperCase()) && cleaned.length <= 48;
    if (isMarkdownHeading || isKnownLabel) {
      flush();
      blocks.push({ type: "heading", text: cleaned });
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!list || list.type !== "ul") {
        flush();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1] ?? "");
      continue;
    }
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (!list || list.type !== "ol") {
        flush();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[1] ?? "");
      continue;
    }

    flush();
    blocks.push({ type: "paragraph", text: trimmed });
  }
  flush();
  return blocks;
}

function StructuredAnswer({
  content,
  messageId,
  retrieval,
  streaming,
}: Readonly<{
  content: string;
  messageId: string;
  retrieval?: ChatRetrievalPayload;
  streaming?: boolean;
}>) {
  const sources = retrieval?.sources ?? [];
  const blocks = parseBlocks(content);

  return (
    <div className="structured-answer">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h3 key={`h-${index}`}>{renderInline(block.text, messageId, sources)}</h3>;
        }
        if (block.type === "paragraph") {
          return <p key={`p-${index}`}>{renderInline(block.text, messageId, sources)}</p>;
        }
        const items = block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item, messageId, sources)}</li>
        ));
        return block.type === "ul"
          ? <ul key={`ul-${index}`}>{items}</ul>
          : <ol key={`ol-${index}`}>{items}</ol>;
      })}
      {streaming ? <span className="stream-cursor" aria-hidden="true" /> : null}
    </div>
  );
}

/** Fields a professional most often needs to correct after an automated read. */
const NOTICE_FIELDS: ReadonlyArray<{ key: keyof ExtractedNotice; label: string; placeholder: string }> = [
  { key: "noticeType", label: "Notice type", placeholder: "e.g. GST DRC-01" },
  { key: "sectionInvoked", label: "Provision invoked", placeholder: "e.g. Section 73, CGST Act" },
  { key: "taxpayerName", label: "Client", placeholder: "Client name on the notice" },
  { key: "taxPeriod", label: "Tax period", placeholder: "e.g. Apr 2025 – Mar 2026" },
  { key: "issueDate", label: "Issued on", placeholder: "YYYY-MM-DD" },
  { key: "replyDueDate", label: "Reply due", placeholder: "YYYY-MM-DD" },
];

// Deliberately delegates: this used to be a second UTC-based copy of the
// server's countdown, so the two could disagree by a day for the same notice.
function daysUntilDate(value: string | null): number | null {
  return value ? daysFromTodayIST(value) : null;
}

function NoticeReview({
  notice,
  onChange,
  onAttach,
  onDiscard,
}: Readonly<{
  notice: ExtractedNotice;
  onChange: (next: ExtractedNotice) => void;
  onAttach: () => void;
  onDiscard: () => void;
}>) {
  const remaining = daysUntilDate(notice.replyDueDate);

  return (
    <section className="notice-review" aria-label="Notice read from the uploaded document">
      <div className="notice-review-head">
        <div>
          <p className="eyebrow">Read from your document</p>
          <h3>{notice.noticeType ?? "Notice"}{notice.sectionInvoked ? ` · ${notice.sectionInvoked}` : ""}</h3>
        </div>
        {remaining !== null ? (
          <span className={`notice-clock ${remaining < 0 ? "overdue" : remaining <= 7 ? "urgent" : ""}`}>
            {remaining < 0
              ? `Reply deadline passed ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} ago`
              : `${remaining} day${remaining === 1 ? "" : "s"} to reply`}
          </span>
        ) : null}
      </div>

      <p className="notice-review-note">
        Check every field against the document before using it. Nothing was sent, filed, or saved.
      </p>

      <div className="notice-field-grid">
        {NOTICE_FIELDS.map((field) => (
          <label key={field.key}>
            <span>{field.label}</span>
            <input
              onChange={(event) => onChange({ ...notice, [field.key]: event.target.value || null })}
              placeholder={field.placeholder}
              type="text"
              value={(notice[field.key] as string | null) ?? ""}
            />
          </label>
        ))}
      </div>

      {notice.amounts.total || notice.amounts.tax ? (
        <p className="notice-amounts">
          {notice.amounts.tax ? <span>Tax ₹{notice.amounts.tax}</span> : null}
          {notice.amounts.interest ? <span>Interest ₹{notice.amounts.interest}</span> : null}
          {notice.amounts.penalty ? <span>Penalty ₹{notice.amounts.penalty}</span> : null}
          {notice.amounts.total ? <span><strong>Total ₹{notice.amounts.total}</strong></span> : null}
        </p>
      ) : null}

      {notice.summary ? <p className="notice-summary">{notice.summary}</p> : null}

      {notice.missingFields.length ? (
        <p className="notice-missing">
          Not found in the document: {notice.missingFields.join(", ")}. Fill these in if you need them.
        </p>
      ) : null}

      <div className="notice-review-actions">
        <button className="button primary" onClick={onAttach} type="button">Use this notice</button>
        <button className="button" onClick={onDiscard} type="button">Discard</button>
      </div>
    </section>
  );
}

function VerificationBadge({ verification }: Readonly<{ verification: ChatVerificationPayload }>) {
  if (verification.state === "unchecked" || verification.claimCount === 0) return null;
  const label = {
    verified: `Verified against sources · ${verification.supportedCount}/${verification.claimCount} claims`,
    partial: `Partially verified · ${verification.supportedCount}/${verification.claimCount} claims`,
    unverified: `Verification failed · check flagged claims`,
  }[verification.state];

  return (
    <div className="verification-block">
      <span className={`verification-chip ${verification.state}`}>{label}</span>
      {verification.flagged.length ? (
        <ul className="verification-flags">
          {verification.flagged.map((flag, index) => (
            <li key={index}>
              <strong>{flag.verdict === "unsupported" ? "Not supported" : "Partly supported"}</strong>
              {" by "}{flag.citations.join(", ")}: “{flag.claim}”
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AnswerTimestamp({ corpusGeneratedAt }: Readonly<{ corpusGeneratedAt?: string }>) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const freshness = corpusGeneratedAt ? corpusFreshness(corpusGeneratedAt) : null;

  // "Law as in force on {today}" is only honest while the sources behind it are
  // current. Once they age, the claim is softened rather than repeated, and the
  // reader is told what the gap means.
  return (
    <div className="answer-timestamp">
      <p>
        {freshness && freshness.level !== "current"
          ? `Law as in force on ${formatter.format(new Date())}, so far as these sources show`
          : `Law as in force on ${formatter.format(new Date())}`}
        {freshness ? ` · ${freshness.label.replace("Official sources last checked", "sources last checked")}` : ""}
      </p>
      {freshness?.warning ? (
        <p className={`answer-staleness is-${freshness.level}`}>{freshness.warning}</p>
      ) : null}
    </div>
  );
}

function ResearchTrail({
  messageId,
  retrieval,
}: Readonly<{ messageId: string; retrieval: ChatRetrievalPayload }>) {
  const stateLabel = {
    locked: "Citations included",
    partial: "Review the citations",
    unsupported: "No source cited",
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
        <span>Relative search match: <strong>{retrieval.confidence}</strong></span>
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
              {source.supersededBy ? (
                <p className="source-superseded-note">
                  Superseded by {source.supersededBy.documentNumber ?? source.supersededBy.title}
                  {source.supersededBy.effectiveFrom
                    ? ` w.e.f. ${formatSourceDate(source.supersededBy.effectiveFrom)}`
                    : ""}
                </p>
              ) : null}
              <div className="source-card-status">
                <span className={`source-status ${source.status}`}>{source.status}</span>
                <span>
                  {source.sourceKind === "official-full-text"
                    ? "Full official text"
                    : source.sourceKind === "official-index-text"
                      ? "Official index"
                      : "Source summary"}
                </span>
                <span>{Math.round(source.relevance * 100)}% relative search score</span>
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
  publicMode = false,
  templateMode = false,
}: Readonly<{
  conversationHistory?: readonly ConversationSummary[];
  initialConversationId?: string | null;
  initialMessages?: readonly ConversationMessage[];
  initialPrompt?: string;
  publicMode?: boolean;
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
  const [messages, setMessages] = useState<ConversationMessage[]>(
    defaultConversation ? messagesFromDemo(defaultConversation) : [...initialMessages],
  );
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [actionStates, setActionStates] = useState<Record<string, ActionReviewState>>({});
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  // A notice moves through: read → review (editable) → attached to the conversation.
  const [draftNotice, setDraftNotice] = useState<ExtractedNotice | null>(null);
  const [attachedNotice, setAttachedNotice] = useState<ExtractedNotice | null>(null);
  const [noticeBusy, setNoticeBusy] = useState(false);
  // History and reference material live in an on-demand drawer so the conversation
  // itself gets the whole canvas.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  function autoGrowComposer() {
    const element = composerRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  }

  useEffect(() => {
    autoGrowComposer();
  }, [draft]);

  /**
   * Practice facts for this question: the profile, plus only the clients it names.
   * Read from storage at send time rather than held in state — it avoids an
   * SSR/hydration mismatch and always reflects edits made in another tab.
   */
  function practicePayload(query: string) {
    const profile = loadProfile();
    const clients = selectRelevantClients(profile, query);
    if (!profile.states.length && !profile.sectors.length
      && !profile.regulators.length && !clients.length) {
      return undefined;
    }
    return {
      regulators: profile.regulators,
      states: profile.states,
      sectors: profile.sectors,
      clients,
    };
  }

  async function readNotice(file: File) {
    setNoticeBusy(true);
    setError("");
    setStatus("Reading the notice");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/notices/extract", { method: "POST", body });
      const payload = await response.json() as { notice?: ExtractedNotice; error?: string };
      if (!response.ok || !payload.notice) {
        throw new Error(payload.error || "The notice could not be read.");
      }
      setDraftNotice(payload.notice);
      setStatus("Notice read — check the fields");
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "The notice could not be read.");
      setStatus("");
    } finally {
      setNoticeBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateMessage(id: string, patch: Partial<ConversationMessage>) {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }

  async function copyAnswer(messageId: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      window.setTimeout(() => setCopiedId((current) => (current === messageId ? null : current)), 2_000);
    } catch {
      setError("Couldn’t copy the answer. Select the text and copy manually.");
    }
  }

  async function revealTemplateAnswer(assistantId: string, text: string, signal: AbortSignal) {
    const tokens = text.match(/\S+\s*/g) ?? [text];
    let buffer = "";
    for (const token of tokens) {
      if (signal.aborted) return;
      buffer += token;
      updateMessage(assistantId, { content: buffer });
      await new Promise((resolve) => window.setTimeout(resolve, 18));
    }
  }

  async function runStream(transcript: ConversationMessage[], requestMode: AssistantMode) {
    const assistantId = createId("assistant");
    setMessages([
      ...transcript,
      { id: assistantId, role: "assistant", mode: requestMode, content: "", streaming: true },
    ]);
    setRequestState("loading");
    setError("");
    setStatus(requestMode === "ask" ? "Searching indexed sources" : "Preparing a draft for review");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (templateMode) {
        const lastUser = [...transcript].reverse().find((message) => message.role === "user");
        const text = createTemplateAnswer(lastUser?.content ?? "", requestMode);
        await revealTemplateAnswer(assistantId, text, controller.signal);
        if (!controller.signal.aborted) {
          updateMessage(assistantId, { streaming: false, completeness: "complete" });
          setStatus("Answer ready");
        } else {
          updateMessage(assistantId, { streaming: false, stopped: true });
        }
        setRequestState("idle");
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          mode: requestMode,
          notice: attachedNotice ?? undefined,
          practice: practicePayload(
            [...transcript].reverse().find((message) => message.role === "user")?.content ?? "",
          ),
          messages: transcript.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !response.body || !contentType.includes("text/event-stream")) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Reg Mitra could not prepare an answer.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: string | null = null;
      let done: StreamEvent | null = null;

      for (;;) {
        const { done: finished, value } = await reader.read();
        if (finished) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const json = dataLine.slice(5).trim();
          if (!json) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(json) as StreamEvent;
          } catch {
            continue;
          }
          if (event.type === "retrieval" && event.retrieval) {
            updateMessage(assistantId, { retrieval: event.retrieval });
          } else if (event.type === "verification" && event.verification) {
            const verification = event.verification;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId && message.retrieval
                  ? { ...message, retrieval: { ...message.retrieval, verification } }
                  : message,
              ),
            );
          } else if (event.type === "delta" && event.text) {
            const delta = event.text;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + delta }
                  : message,
              ),
            );
          } else if (event.type === "done") {
            done = event;
          } else if (event.type === "error") {
            streamError = event.error ?? "Reg Mitra could not prepare an answer.";
          }
        }
      }

      if (streamError) {
        setMessages((current) => {
          const message = current.find((item) => item.id === assistantId);
          if (message && message.content.trim()) {
            return current.map((item) =>
              item.id === assistantId ? { ...item, streaming: false, stopped: true } : item,
            );
          }
          return current.filter((item) => item.id !== assistantId);
        });
        setError(streamError);
        setRequestState("error");
        setStatus("");
        return;
      }

      updateMessage(assistantId, {
        streaming: false,
        completeness: done?.completeness ?? "complete",
        retrieval: done?.retrieval,
        serverId: done?.messageId,
      });
      if (done?.conversationId) setActiveConversationId(done.conversationId);
      setRequestState("idle");
      setStatus(done?.completeness === "partial" ? "Answer cut short" : "Answer ready");
    } catch (requestError) {
      if (controller.signal.aborted) {
        setMessages((current) => {
          const message = current.find((item) => item.id === assistantId);
          if (message && message.content.trim()) {
            return current.map((item) =>
              item.id === assistantId ? { ...item, streaming: false, stopped: true } : item,
            );
          }
          return current.filter((item) => item.id !== assistantId);
        });
        setRequestState("idle");
        setStatus("Stopped");
        return;
      }
      setMessages((current) => current.filter((item) => !(item.id === assistantId && !item.content.trim())));
      updateMessage(assistantId, { streaming: false });
      setError(requestError instanceof Error ? requestError.message : "Reg Mitra could not prepare an answer.");
      setRequestState("error");
      setStatus("");
    } finally {
      abortRef.current = null;
    }
  }

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
    setDraft("");
    await runStream([...messages, userMessage], requestMode);
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function regenerate() {
    if (requestState === "loading") return;
    const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user");
    const lastUser = lastUserIndex === -1 ? undefined : messages[lastUserIndex];
    if (!lastUser) return;
    void runStream(messages.slice(0, lastUserIndex + 1), lastUser.mode);
  }

  function editLastQuestion() {
    if (requestState === "loading") return;
    const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user");
    const lastUser = lastUserIndex === -1 ? undefined : messages[lastUserIndex];
    if (!lastUser) return;
    setDraft(lastUser.content);
    setMode(lastUser.mode);
    setMessages(messages.slice(0, lastUserIndex));
    setError("");
    setStatus("");
    window.requestAnimationFrame(() => {
      composerRef.current?.focus();
      autoGrowComposer();
    });
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
    abortRef.current?.abort();
    setMessages([]);
    setActiveConversationId(null);
    setMode("ask");
    setDraft("");
    setActionStates({});
    setError("");
    setStatus("");
    setRequestState("idle");
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  function loadConversation(conversation: DemoConversation) {
    abortRef.current?.abort();
    setMessages(messagesFromDemo(conversation));
    setActiveConversationId(conversation.id);
    setMode(conversation.finalMode);
    setDraft("");
    setActionStates({});
    setError("");
    setStatus("");
    setRequestState("idle");
  }

  async function approveMessage(message: ConversationMessage) {
    if (!templateMode) {
      const reviewId = message.serverId ?? message.id;
      const response = await fetch(`/api/messages/${encodeURIComponent(reviewId)}/review`, { method: "POST" });
      if (!response.ok) {
        setError("This draft could not be approved. Reviewer access is required.");
        return;
      }
    }
    setActionStates((current) => ({ ...current, [message.id]: "approved" }));
  }

  const hasConversation = messages.length > 0;
  const lastUserId = [...messages].reverse().find((message) => message.role === "user")?.id ?? null;
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;
  const latestRetrieval = [...messages]
    .reverse()
    .find((message) =>
      message.role === "assistant"
      && message.retrieval
      && message.retrieval.sources.length > 0
      && message.retrieval.citationState !== "unsupported")
    ?.retrieval;

  return (
    <>
      <header className="assistant-hero">
        <span className="assistant-symbol"><SparklesIcon /></span>
        <div>
          <p className="eyebrow">Source-grounded research and preparation</p>
          <h1>Assistant</h1>
          <p>Search indexed sources or draft work for internal review. Reg Mitra cannot send, file, pay, or change an external system.</p>
        </div>
        <div className="assistant-hero-actions">
          <div className="assistant-mode-switch" aria-label="Assistant mode">
            {(["ask", "act"] as const).map((item) => (
              <button
                aria-pressed={mode === item}
                className={`${mode === item ? "active" : ""} mode-${item}`}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                <strong>{item === "ask" ? "Answer" : "Prepare"}</strong>
                <small>{item === "ask" ? "Research with source links" : "Draft for internal review"}</small>
              </button>
            ))}
          </div>
          <button
            aria-expanded={drawerOpen}
            className="button assistant-drawer-toggle"
            onClick={() => setDrawerOpen((open) => !open)}
            type="button"
          >
            <MoreIcon /> History &amp; sources
          </button>
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

      <div className="assistant-layout" data-drawer-open={drawerOpen}>
        {drawerOpen ? (
          <button
            aria-label="Close history and sources"
            className="assistant-drawer-scrim"
            onClick={() => setDrawerOpen(false)}
            type="button"
          />
        ) : null}
        <aside className="conversation-library" aria-label={templateMode ? "Sample conversations" : publicMode ? "Current session" : "Your chats"}>
          {/* New chat sits at the top and is always reachable — the single most
              used control in any chat product. */}
          <div className="conversation-library-top">
            <button className="new-chat-button" onClick={startAgain} type="button">
              <span aria-hidden="true">+</span> New chat
            </button>
          </div>

          <div className="conversation-list">
            {templateMode ? (
              <>
                <p className="conversation-group-label">Sample sessions</p>
                {demoConversations.map((conversation) => (
                  <button
                    aria-pressed={activeConversationId === conversation.id}
                    className={`conversation-card ${activeConversationId === conversation.id ? "active" : ""}`}
                    key={conversation.id}
                    onClick={() => loadConversation(conversation)}
                    type="button"
                  >
                    <strong>{conversation.title}</strong>
                    <small>{conversation.description}</small>
                  </button>
                ))}
              </>
            ) : conversationHistory.length === 0 ? (
              <p className="conversation-empty">
                {publicMode
                  ? "This session is not saved to a firm record. Sign in to keep your chats."
                  : "Your chats will appear here. Ask something to start one."}
              </p>
            ) : (
              groupConversationsByRecency(conversationHistory).map((group) => (
                <div className="conversation-group" key={group.label}>
                  <p className="conversation-group-label">{group.label}</p>
                  {group.items.map((conversation) => (
                    <Link
                      aria-current={activeConversationId === conversation.id ? "page" : undefined}
                      className={`conversation-card ${activeConversationId === conversation.id ? "active" : ""}`}
                      href={`/assistant?conversation=${encodeURIComponent(conversation.id)}`}
                      key={conversation.id}
                      title={conversation.title}
                    >
                      <strong>{conversation.title}</strong>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>

          <p className="conversation-library-footnote">
            {publicMode || templateMode
              ? "Never paste client secrets, portal passwords, or OTPs into chat."
              : "Saved in this firm workspace. Never paste client secrets, portal passwords, or OTPs."}
          </p>
        </aside>

        <section className="assistant-main">
          {!hasConversation ? (
            <div className="assistant-welcome">
              <div>
                <span className="mode-kicker">{mode === "ask" ? "ANSWER MODE" : "PREPARE MODE"}</span>
                <h2>Start with a source, client, or regulatory question.</h2>
                <p>
                  {mode === "ask"
                    ? "The Assistant searches selected indexed sources and keeps citations, caveats, and missing facts visible."
                    : "Prepare an internal briefing, information request, checklist, task list, or calendar proposal for professional review."}
                </p>
                <div className="prompt-grid">
                  {promptsByMode[mode].map((prompt) => (
                    <button
                      className="prompt-card"
                      onClick={() => void requestAnswer(prompt)}
                      type="button"
                      key={prompt}
                    >
                      <span>{mode === "ask" ? "Answer" : "Prepare"}</span>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="assistant-response">
              {messages.map((message) => message.role === "user" ? (
                <div className="assistant-query" key={message.id}>
                  <span>You · {message.mode === "ask" ? "Answer" : "Prepare"}</span>
                  <p>{message.content}</p>
                  {message.id === lastUserId && requestState !== "loading" ? (
                    <button className="query-edit" onClick={editLastQuestion} type="button">
                      <EditIcon /> Edit
                    </button>
                  ) : null}
                </div>
              ) : (
                <article className={`assistant-answer ${message.mode === "act" ? "act-answer" : ""}`} key={message.id}>
                  <div className="answer-heading">
                    <span className="answer-icon"><CheckCircleIcon /></span>
                    <p className="eyebrow">
                      {message.mode === "act" ? "Internal draft" : "Source-grounded answer"} · Reg Mitra
                    </p>
                    {!message.streaming ? (
                      <span className={`answer-mode-badge ${message.mode}`}>
                        {message.mode === "act" ? "Professional review required" : "Official sources attached"}
                      </span>
                    ) : null}
                  </div>

                  {message.streaming && !message.content.trim() ? (
                    <div className="assistant-thinking" aria-hidden="true">
                      <span className="thinking-mark"><SparklesIcon /></span>
                      <span>
                        <strong>{message.mode === "ask" ? "Searching indexed sources" : "Preparing a draft for review"}</strong>
                        <small>Checking context, evidence gaps, and approval boundaries…</small>
                      </span>
                    </div>
                  ) : (
                    <StructuredAnswer
                      content={message.content}
                      messageId={message.id}
                      retrieval={message.retrieval}
                      streaming={message.streaming}
                    />
                  )}

                  {!message.streaming && message.retrieval?.verification ? (
                    <VerificationBadge verification={message.retrieval.verification} />
                  ) : null}

                  {message.retrieval
                    && message.retrieval.sources.length > 0
                    && (message.streaming || message.retrieval.citationState !== "unsupported") ? (
                    <ResearchTrail messageId={message.id} retrieval={message.retrieval} />
                  ) : null}

                  {!message.streaming && message.retrieval ? (
                    <AnswerTimestamp corpusGeneratedAt={message.retrieval.corpus.generatedAt} />
                  ) : null}

                  {message.stopped ? (
                    <p className="answer-note">Answer stopped. The text above is incomplete.</p>
                  ) : message.completeness === "partial" ? (
                    <p className="answer-note">This answer was cut short. Regenerate for the full response.</p>
                  ) : null}

                  {!message.streaming ? (
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
                          {message.id === lastAssistantId ? (
                            <button className="button subtle" onClick={regenerate} type="button">
                              <SyncIcon /> Regenerate
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <button
                            className="button"
                            onClick={() => void copyAnswer(message.id, message.content)}
                            type="button"
                          >
                            {copiedId === message.id ? "Copied" : "Copy for file note"}
                          </button>
                          {message.id === lastAssistantId ? (
                            <button className="button subtle" onClick={regenerate} type="button">
                              <SyncIcon /> Regenerate
                            </button>
                          ) : null}
                          <Link className="button" href="/clients">{templateMode ? "Review sample clients" : "Review clients"}</Link>
                          <button className="button primary" onClick={() => setMode("act")} type="button">Prepare the next step</button>
                        </>
                      )}
                    </div>
                  ) : null}

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
                          onClick={() => void approveMessage(message)}
                          type="button"
                        >
                          Record internal approval
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
                        <strong>Internal approval recorded</strong>
                        <small>No external action was taken. Sending and filing are not available in Reg Mitra.</small>
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

              {error ? (
                <div className="assistant-error" role="alert">
                  <strong>Couldn’t prepare the answer</strong>
                  <span>{error}</span>
                  <button
                    className="text-link"
                    onClick={() => {
                      const lastUser = [...messages].reverse().find((message) => message.role === "user");
                      if (lastUser) void runStream(messages, lastUser.mode);
                    }}
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

          <p aria-live="polite" className="visually-hidden">{status}</p>

          {draftNotice ? (
            <NoticeReview
              notice={draftNotice}
              onAttach={() => {
                setAttachedNotice(draftNotice);
                setDraftNotice(null);
                setStatus("Notice attached to this conversation");
                window.requestAnimationFrame(() => composerRef.current?.focus());
              }}
              onChange={setDraftNotice}
              onDiscard={() => {
                setDraftNotice(null);
                setStatus("");
              }}
            />
          ) : null}

          <form className="composer" onSubmit={submit}>
            <div className="composer-mode-line">
              <span className={`composer-mode ${mode}`}>{mode === "ask" ? "Answer" : "Prepare"}</span>
              <span>
                {mode === "ask"
                  ? "Sourced explanation — nothing is changed"
                  : "Draft creation — your review is required"}
              </span>
            </div>
            <textarea
              aria-label={`${mode === "ask" ? "Get an answer from" : "Prepare with"} Reg Mitra`}
              onChange={(event) => setDraft(event.target.value)}
              onInput={autoGrowComposer}
              onKeyDown={handleComposerKeyDown}
              placeholder={mode === "ask" ? "Ask a compliance question…" : "Describe what you want prepared…"}
              ref={composerRef}
              rows={1}
              value={draft}
            />
            {attachedNotice ? (
              <div className="notice-chip">
                <span>
                  <strong>{attachedNotice.noticeType ?? "Notice"}</strong>
                  {attachedNotice.taxpayerName ? ` · ${attachedNotice.taxpayerName}` : ""}
                  {attachedNotice.replyDueDate ? ` · reply due ${attachedNotice.replyDueDate}` : ""}
                </span>
                <button
                  aria-label="Remove the attached notice"
                  onClick={() => {
                    setAttachedNotice(null);
                    setStatus("Notice removed");
                  }}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : null}
            <div className="composer-actions">
              {/* Visually hidden but still in the accessibility tree, so it needs
                  its own name — a screen reader reaches it even though sighted
                  users trigger it through the adjacent button. */}
              <input
                accept="application/pdf"
                aria-label="Upload a notice PDF to read"
                className="visually-hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readNotice(file);
                }}
                ref={fileInputRef}
                type="file"
              />
              {!templateMode ? (
                <button
                  className="button subtle notice-attach"
                  disabled={noticeBusy || requestState === "loading"}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <FileIcon /> {noticeBusy ? "Reading…" : "Attach notice"}
                </button>
              ) : null}
              <span className="composer-note">
                {templateMode
                  ? "Sample response · no external systems queried"
                  : publicMode
                    ? "Current browser session · not saved to a firm record"
                    : "Saved to this conversation"} · ⌘ Enter
              </span>
              {requestState === "loading" ? (
                <button className="button stop-button" onClick={stopStreaming} type="button">
                  <StopIcon /> Stop
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={!draft.trim()}
                  type="submit"
                >
                  {mode === "ask" ? "Get answer" : "Prepare"} <ArrowUpIcon />
                </button>
              )}
            </div>
          </form>
        </section>

        <aside className="context-panel" aria-label="Trust and review context">
          <div className="context-section">
            <p className="eyebrow">What this mode does</p>
            <h2>{mode === "ask" ? "Answer explains. It never changes anything." : "Prepare drafts. You decide what to use."}</h2>
            <div className="context-item">
              <TrustBadge kind="evidence" state={templateMode ? "demo" : "unverified"} />
              <span>
                {mode === "ask"
                  ? "Explains, compares, and identifies what must be verified."
                  : "Drafts checklists, proposed calendar changes, and handoff steps."}
              </span>
            </div>
            <div className="context-item">
              <span className="context-num">✓</span>
              <span>Stops before Submit, OTP, filing, payment, email, or WhatsApp.</span>
            </div>
          </div>
          {latestRetrieval ? (
            <div className="context-section retrieval-context">
              <p className="eyebrow">Source search</p>
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
            <p>Talk through source coverage, your firm’s workflow, or requesting pilot access.</p>
            <div>
              <Link className="button" href="/faq">View FAQs</Link>
              <Link className="button primary" href="/today">Open the product</Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
