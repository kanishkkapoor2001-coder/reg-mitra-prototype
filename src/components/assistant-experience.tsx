"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, Fragment, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  CheckCircleIcon,
  CloseIcon,
  EditIcon,
  FileIcon,
  MoreIcon,
  RegulationsIcon,
  SparklesIcon,
  StopIcon,
  SyncIcon,
  WandIcon,
} from "@/components/icons";
import { ReviewGate } from "@/components/review-gate";
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
  const router = useRouter();
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
  // Prompt generator: suggestions built from this firm's own client book.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [improved, setImproved] = useState<string | null>(null);
  const [improvedFrom, setImprovedFrom] = useState("");
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Follow the conversation the way chat products do: stay pinned to the newest
  // message while the reader is at the bottom, never yank them back once they
  // have scrolled up to reread something.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 160;
    if (nearBottom) element.scrollTop = element.scrollHeight;
  }, [messages]);

  // A newly opened conversation starts at its latest exchange.
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [activeConversationId]);

  // Conversation state is seeded from server props once, but the sidebar cards
  // navigate with soft <Link>s: the server re-renders this page with a different
  // selected conversation while this component instance stays mounted. Without
  // this sync, clicking a saved chat changed the props and nothing else — the
  // canvas kept the old conversation, which read as chats never being saved.
  useEffect(() => {
    if (templateMode) return;
    if (initialConversationId === activeConversationId) return;
    abortRef.current?.abort();
    /* eslint-disable react-hooks/set-state-in-effect -- adopting the server's
       newly selected conversation replaces the canvas wholesale, and belongs
       here alongside aborting the previous conversation's stream. */
    setMessages([...initialMessages]);
    setActiveConversationId(initialConversationId);
    setMode(initialMessages.at(-1)?.mode ?? "ask");
    setDraft("");
    setActionStates({});
    setError("");
    setStatus("");
    setRequestState("idle");
    setDrawerOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Only a server-side change of selection may adopt; local state changes
    // (sending a message, "New chat") must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, templateMode]);

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
      if (done?.conversationId) {
        setActiveConversationId(done.conversationId);
        // The sidebar's history is server-rendered, so it does not know about
        // this exchange until the server renders again. A brand-new conversation
        // also becomes the URL, so a reload or a shared link lands on it.
        if (done.conversationId !== activeConversationId) {
          router.replace(`/assistant?conversation=${encodeURIComponent(done.conversationId)}`, { scroll: false });
        } else {
          router.refresh();
        }
      }
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
    // Leave the old conversation's URL too. Without this, re-opening the chat
    // just left is a no-op navigation (same ?conversation=), so its card would
    // do nothing until something else changed the selection.
    if (!templateMode) router.replace("/assistant?new=1", { scroll: false });
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

  /**
   * Turn "I don't know what to ask" into four questions about this firm's own
   * clients. Whatever is already typed is treated as a rough intent to sharpen,
   * so it works both from a blank box and from half a thought.
   */
  async function suggestPrompts() {
    if (suggestOpen) {
      setSuggestOpen(false);
      return;
    }
    setSuggestOpen(true);
    const intent = draft.trim();
    // Nothing typed and already generated once — reopen what we had rather than
    // spending another model call on the same empty box.
    if (suggestions.length && !intent && !improved) return;
    setSuggestBusy(true);
    setImproved(null);
    setImprovedFrom(intent);
    try {
      const response = await fetch("/api/chat/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, mode }),
      });
      const payload = (await response.json()) as { prompts?: string[]; improved?: string };
      setImproved(payload.improved ?? null);
      setSuggestions(payload.prompts ?? []);
    } catch {
      // The route already falls back to usable questions; a network failure
      // just leaves the panel empty rather than showing an error for something
      // the CA did not ask for.
      setSuggestions([]);
      setImproved(null);
    } finally {
      setSuggestBusy(false);
    }
  }

  // A notice under review replaces the composer wherever the composer lives.
  const noticeReviewPanel = draftNotice ? (
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
  ) : null;

  // The composer renders in two homes — centered on the empty canvas, docked at
  // the bottom once a conversation exists — so it is built once here.
  const composerForm = (
    <form className="composer chat-composer" onSubmit={submit}>
      {suggestOpen ? (
        <div className="prompt-suggest" role="group" aria-label="Suggested questions">
          <div className="prompt-suggest-head">
            <strong>{improvedFrom ? "Your question, sharpened" : "Ask about your clients"}</strong>
            <button aria-label="Close suggestions" onClick={() => setSuggestOpen(false)} type="button">
              <CloseIcon />
            </button>
          </div>
          {suggestBusy ? (
            <div className="prompt-suggest-loading" aria-hidden="true">
              <span /><span /><span />
            </div>
          ) : (
            <>
              {/* The rewrite of what they actually typed leads, with the original
                  underneath — an "improvement" you cannot compare against the
                  original is just a replacement. */}
              {improved ? (
                <div className="prompt-improved">
                  <button
                    onClick={() => {
                      setDraft(improved);
                      setSuggestOpen(false);
                      window.requestAnimationFrame(() => {
                        composerRef.current?.focus();
                        autoGrowComposer();
                      });
                    }}
                    type="button"
                  >
                    <span className="prompt-improved-text">{improved}</span>
                    <span className="prompt-improved-use">Use this</span>
                  </button>
                  {improvedFrom ? (
                    <p className="prompt-improved-from">
                      <span>You wrote</span> {improvedFrom}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {suggestions.length ? (
                <>
                  {improved ? <p className="prompt-suggest-or">Or ask instead</p> : null}
                  <ul>
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    onClick={() => {
                      setDraft(suggestion);
                      setSuggestOpen(false);
                      window.requestAnimationFrame(() => {
                        composerRef.current?.focus();
                        autoGrowComposer();
                      });
                    }}
                    type="button"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
                  </ul>
                </>
              ) : null}
              {!improved && !suggestions.length ? (
                <p className="prompt-suggest-empty">No suggestions right now. Type the question as you would say it out loud.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
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
      <div className="composer-bar">
        <div className="composer-tools">
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
              aria-busy={noticeBusy}
              aria-label="Attach a notice or circular PDF"
              className="composer-icon-button"
              disabled={noticeBusy || requestState === "loading"}
              onClick={() => fileInputRef.current?.click()}
              title={noticeBusy ? "Reading the attached PDF…" : "Attach a PDF — Reg Mitra reads it into this chat"}
              type="button"
            >
              {noticeBusy ? <SyncIcon /> : <FileIcon />}
            </button>
          ) : null}
          <Link
            aria-label="Browse Reg Mitra's regulatory updates"
            className="composer-icon-button"
            href="/regulations"
            title="Open the library of regulatory updates"
          >
            <RegulationsIcon />
          </Link>
          {/* Not everyone arrives knowing the question. This builds one from
              the firm's own client book, or sharpens whatever is half-typed. */}
          <button
            aria-expanded={suggestOpen}
            aria-label="Help me ask"
            className="composer-icon-button"
            disabled={requestState === "loading"}
            onClick={() => void suggestPrompts()}
            title={draft.trim() ? "Sharpen this question" : "Help me ask — suggests questions about your clients"}
            type="button"
          >
            <WandIcon />
          </button>
          <div aria-label="Assistant mode" className="composer-mode-switch" role="group">
            {(["ask", "act"] as const).map((item) => (
              <button
                aria-pressed={mode === item}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                {item === "ask" ? "Answer" : "Prepare"}
              </button>
            ))}
          </div>
        </div>
        {requestState === "loading" ? (
          <button aria-label="Stop generating" className="send-button stop" onClick={stopStreaming} type="button">
            <StopIcon />
          </button>
        ) : (
          <button
            aria-label={mode === "ask" ? "Get answer" : "Prepare draft"}
            className="send-button"
            disabled={!draft.trim()}
            type="submit"
          >
            <ArrowUpIcon />
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="chat-shell" data-drawer-open={drawerOpen}>
      {drawerOpen ? (
        <button
          aria-label="Close chat history"
          className="chat-drawer-scrim"
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

        <section className="chat-main">
          <div className="chat-topline">
            <button
              aria-expanded={drawerOpen}
              className="chat-history-toggle"
              onClick={() => setDrawerOpen((open) => !open)}
              type="button"
            >
              <MoreIcon /> Chats
            </button>
            <div className="chat-topline-title">
              <span className="assistant-symbol"><SparklesIcon /></span>
              <strong>Assistant</strong>
              <span className="chat-mode-hint">
                {mode === "ask"
                  ? "Sourced answers — nothing is changed"
                  : "Drafts for your review — nothing is sent"}
              </span>
            </div>
            {hasConversation ? (
              <button className="chat-topline-new" onClick={startAgain} type="button">
                + New
              </button>
            ) : null}
          </div>

          {templateMode ? (
            <div className="assistant-template-note" role="note">
              <strong>Demo only.</strong>
              <span>All clients and conversations are fictional.</span>
              <span>Nothing can be sent or filed.</span>
            </div>
          ) : null}

          {!hasConversation ? (
            <div className="chat-empty">
              <div className="chat-column">
                <h2>Start with a source, client, or regulatory question.</h2>
                <p>
                  {mode === "ask"
                    ? "The Assistant searches selected indexed sources and keeps citations, caveats, and missing facts visible."
                    : "Prepare an internal briefing, information request, checklist, task list, or calendar proposal for professional review."}
                </p>
                {noticeReviewPanel ?? composerForm}
                <div className="prompt-chips">
                  {promptsByMode[mode].map((prompt) => (
                    <button
                      className="prompt-chip"
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
            <div className="chat-scroll" ref={scrollRef}>
            <div className="assistant-response chat-column">
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
                      message.mode === "act" ? (
                        <span className="answer-mode-badge act">Professional review required</span>
                      ) : templateMode || (
                        message.retrieval
                        && message.retrieval.citationState !== "unsupported"
                        && message.retrieval.citedSourceIds.length > 0
                      ) ? (
                        <span className="answer-mode-badge ask">Official sources attached</span>
                      ) : (
                        // An answer that cites nothing must not wear the badge —
                        // claiming attached sources on an unsourced reply is
                        // exactly the kind of false assurance this product exists
                        // to prevent.
                        <span className="answer-mode-badge unsourced">No indexed source cited</span>
                      )
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
            </div>
          )}

          {hasConversation ? (
            <div className="chat-dock">
              <div className="chat-column">
                {noticeReviewPanel}
                {composerForm}
                <p className="chat-disclaimer">
                  {templateMode
                    ? "Sample responses — no external systems are queried."
                    : publicMode
                      ? "Current browser session — not saved to a firm record."
                      : "Saved in this firm workspace. Verify before filing — Reg Mitra cannot send, file, or pay."}
                </p>
              </div>
            </div>
          ) : null}

          <p aria-live="polite" className="visually-hidden">{status}</p>
        </section>

    </div>
  );
}
