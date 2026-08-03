import {
  getGatewayConfig,
  safeModelName,
  streamGatewayContent,
  type GeminiRequest,
} from "@/lib/ai/gateway";
import {
  retrievalContextInstruction,
  systemInstructionsForMode,
  type AssistantMode,
} from "@/lib/ai/prompts";
import { validateCitations } from "@/lib/rag/citations";
import { embedRegulatoryQuery, getEmbeddingApiKey } from "@/lib/rag/embedding";
import { rerankRetrievedSources } from "@/lib/rag/rerank";
import { formatRetrievedEvidence, retrieveRegulatorySources } from "@/lib/rag/retrieval";
import { verifyAnswerGroundedness } from "@/lib/rag/verify";
import { noticeAsContext, sanitizeNotice } from "@/lib/notices/extraction";
import { practiceAsContext, sanitizePracticeContext } from "@/lib/practice/context";
import { planComputations } from "@/lib/tools/plan";
import {
  ASSISTANT_BURST,
  ASSISTANT_HOURLY,
  callerKey,
  checkRateLimit,
} from "@/lib/rate-limit";
import type { ChatRetrievalPayload } from "@/lib/rag/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export const maxDuration = 60;
export const runtime = "nodejs";

type ChatRole = "user" | "assistant";

interface IncomingMessage {
  role: ChatRole;
  content: string;
}

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" || candidate.role === "assistant")
    && typeof candidate.content === "string"
    && candidate.content.trim().length > 0
    && candidate.content.length <= 6_000
  );
}

/**
 * Build the retrieval query from the recent turns. The latest question leads (best
 * for lexical + embedding matching); up to two prior user turns follow as context so
 * a follow-up like "does it apply to them?" still retrieves the right entities.
 */
function buildRetrievalQuery(messages: readonly IncomingMessage[]): string {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const latest = userMessages.at(-1) ?? "";
  const priorContext = userMessages.slice(Math.max(0, userMessages.length - 3), userMessages.length - 1);
  return [latest, ...priorContext.reverse()].join("\nEarlier context: ").slice(0, 6_000);
}

function sse(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function deriveTitle(query: string): string {
  const cleaned = query.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 96) return cleaned || "Compliance review";
  const truncated = cleaned.slice(0, 96);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 48 ? lastSpace : 96).trim()}…`;
}

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production"
    && process.env.REGMITRA_ENABLE_LIVE_AI !== "true"
  ) {
    return Response.json(
      { error: "Live AI is disabled in the public template demo." },
      { status: 503 },
    );
  }

  // Throttle before any gateway work: one question costs several model calls.
  for (const [scope, rule] of [["chat-burst", ASSISTANT_BURST], ["chat-hour", ASSISTANT_HOURLY]] as const) {
    const verdict = checkRateLimit(callerKey(request, scope), rule);
    if (!verdict.allowed) {
      return Response.json(
        { error: "You have reached the question limit for now. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
      );
    }
  }

  const gatewayConfig = getGatewayConfig();
  if (!gatewayConfig) {
    return Response.json(
      { error: "AI assistance is not configured for this workspace." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request could not be read." }, { status: 400 });
  }

  const rawMode = (body as { mode?: unknown })?.mode;
  const mode: AssistantMode = rawMode === "act" ? "act" : "ask";
  const rawConversationId = (body as { conversationId?: unknown })?.conversationId;
  const requestedConversationId = typeof rawConversationId === "string"
    && /^[0-9a-f-]{36}$/i.test(rawConversationId)
    ? rawConversationId
    : null;
  const notice = sanitizeNotice((body as { notice?: unknown })?.notice);
  const practice = sanitizePracticeContext((body as { practice?: unknown })?.practice);
  const rawMessages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(rawMessages) || !rawMessages.length || !rawMessages.every(isIncomingMessage)) {
    return Response.json({ error: "Enter a valid compliance question." }, { status: 400 });
  }
  const totalTranscriptLength = rawMessages.reduce(
    (total, message) => total + (message as IncomingMessage).content.length,
    0,
  );
  if (totalTranscriptLength > 18_000) {
    return Response.json(
      { error: "This conversation is too long. Start a new review." },
      { status: 413 },
    );
  }

  const messages = (rawMessages as IncomingMessage[]).slice(-8);
  const workspace = await getCurrentWorkspace();
  const supabase = workspace ? await createSupabaseServerClient() : null;
  const { data: userData } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const [{ data: workspaceClients }, { data: workspaceTasks }] = workspace && supabase
    ? await Promise.all([
      supabase
        .from("clients")
        .select("id, display_name, sector, state_code")
        .eq("workspace_id", workspace.id)
        .eq("status", "active")
        .limit(50),
      supabase
        .from("tasks")
        .select("title, state, priority, due_at, client_id")
        .eq("workspace_id", workspace.id)
        .not("state", "in", '("completed","dismissed")')
        .limit(50),
    ])
    : [{ data: [] }, { data: [] }];
  const workspaceContext = JSON.stringify(workspace
    ? {
      notice: "Private workspace facts supplied by the signed-in firm. Treat missing fields as unknown.",
      workspace: { id: workspace.id, name: workspace.name },
      clients: workspaceClients ?? [],
      openTasks: workspaceTasks ?? [],
    }
    : {
      notice: "Open public workspace. No private client facts are available. Ask for missing client facts instead of assuming them.",
      workspace: { name: "Reg Mitra public workspace" },
      clients: [],
      openTasks: [],
    });

  // An attached notice carries the provisions the answer must be grounded in, so
  // its identifying terms join the retrieval query.
  const noticeTerms = notice
    ? [notice.noticeType, notice.sectionInvoked, notice.authority].filter(Boolean).join(" ")
    : "";
  const retrievalQuery = [buildRetrievalQuery(messages), noticeTerms]
    .filter(Boolean)
    .join("\nNotice on hand: ")
    .slice(0, 6_000);
  const model = safeModelName(process.env.REGMITRA_LLM_MODEL);
  const embeddingApiKey = getEmbeddingApiKey();
  // Anchors both date arithmetic in the computation planner and the "law as in
  // force on" framing in the answer.
  const today = new Date().toISOString().slice(0, 10);

  const encoder = new TextEncoder();
  const upstream = new AbortController();
  if (request.signal.aborted) upstream.abort();
  else request.signal.addEventListener("abort", () => upstream.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(sse(payload)));
      };
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        const queryEmbedding = embeddingApiKey
          ? await embedRegulatoryQuery(retrievalQuery, embeddingApiKey)
          : null;
        // Retrieve wide, then let a fast LLM pass re-order by answer-relevance.
        const lexicalRetrieval = await retrieveRegulatorySources(retrievalQuery, {
          apiKey: queryEmbedding ? embeddingApiKey ?? undefined : undefined,
          limit: 8,
        });
        // Reranking and computation planning are independent pre-stream passes.
        const [reranked, computation] = await Promise.all([
          rerankRetrievedSources(gatewayConfig, model, retrievalQuery, lexicalRetrieval, 6),
          planComputations(gatewayConfig, model, retrievalQuery, today,
            practice ? practiceAsContext(practice) : null),
        ]);
        const retrieval = reranked.result;
        const baseRetrieval: Omit<ChatRetrievalPayload, "citationState" | "citedSourceIds"> = {
          strategy: retrieval.strategy,
          confidence: retrieval.confidence,
          corpus: retrieval.corpus,
          sources: retrieval.sources,
        };
        // Sources first, so the research trail renders before the answer streams.
        send({
          type: "retrieval",
          retrieval: { ...baseRetrieval, citationState: "partial", citedSourceIds: [] },
        });

        const geminiRequest: GeminiRequest = {
          systemInstruction: {
            parts: [{
              text: [
                systemInstructionsForMode(mode),
                `Today's date is ${today}. State the law as in force on this date unless the question asks about another period.`,
                retrievalContextInstruction(retrieval.confidence, retrieval.strategy),
                "AUTHORITATIVE RETRIEVED EVIDENCE:",
                formatRetrievedEvidence(retrieval),
                ...(practice ? [practiceAsContext(practice)] : []),
                ...(notice ? [noticeAsContext(notice)] : []),
                ...(computation.evidence ? [computation.evidence] : []),
                "PRIVATE WORKSPACE CONTEXT:",
                workspaceContext,
              ].join("\n\n"),
            }],
          },
          contents: messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 4_096,
            thinkingConfig: { thinkingBudget: mode === "act" ? 1_024 : 512 },
          },
        };

        let fullText = "";
        let finishReason: string | undefined;
        let blockReason: string | undefined;
        for await (const chunk of streamGatewayContent(gatewayConfig, model, geminiRequest, {
          signal: upstream.signal,
        })) {
          if (chunk.blockReason) blockReason = chunk.blockReason;
          if (chunk.finishReason) finishReason = chunk.finishReason;
          if (chunk.text) {
            fullText += chunk.text;
            send({ type: "delta", text: chunk.text });
          }
        }

        const text = fullText.trim();
        if (!text) {
          console.warn("[chat] empty answer", { blockReason, confidence: retrieval.confidence });
          send({
            type: "error",
            error: blockReason
              ? "Reg Mitra could not answer that request safely. Try rephrasing it."
              : "Reg Mitra returned an empty answer. Please try again.",
          });
          close();
          return;
        }

        const citations = validateCitations(text, retrieval);
        const completeness = finishReason === "MAX_TOKENS" ? "partial" : "complete";

        // Groundedness pass: check every cited sentence against its cited evidence.
        // Runs after the stream, so it adds nothing to perceived answer latency.
        const verification = await verifyAnswerGroundedness(
          gatewayConfig,
          model,
          text,
          retrieval.sources,
        );
        send({ type: "verification", verification });

        const retrievalPayload: ChatRetrievalPayload = {
          ...baseRetrieval,
          citationState: citations.state,
          citedSourceIds: citations.valid,
          verification,
        };
        console.info("[chat] answer", {
          mode,
          model,
          strategy: retrieval.strategy,
          confidence: retrieval.confidence,
          reranked: reranked.applied,
          computations: computation.outcomes.map((outcome) =>
            `${outcome.name}${outcome.error ? ":error" : ""}`).join(",") || "none",
          citationState: citations.state,
          verification: `${verification.state} ${verification.supportedCount}/${verification.claimCount}`,
          completeness,
          sources: retrieval.sources.length,
        });

        const saved = workspace && supabase && userData.user
          ? await persistConversation({
            supabase,
            workspaceId: workspace.id,
            userId: userData.user.id,
            requestedConversationId,
            mode,
            messages,
            retrievalQuery,
            answer: text,
            model,
            retrievalPayload,
          })
          : null;

        send({
          type: "done",
          completeness,
          retrieval: retrievalPayload,
          conversationId: saved?.conversationId,
          messageId: saved?.messageId,
        });
        close();
      } catch (streamError) {
        if (upstream.signal.aborted) {
          // Client navigated away or pressed Stop — no error, no persistence.
          close();
          return;
        }
        const status = (streamError as { status?: number })?.status;
        const detail = (streamError as Error)?.message;
        console.error("[chat] stream failed", { status, message: detail });
        send({
          type: "error",
          error: status === 429
            ? "AI assistance is at its current usage limit. Please try again shortly."
            : "Reg Mitra could not prepare an answer. Please try again.",
          // Upstream status and message carry no secrets and are the only way to
          // tell a bad credential from an unreachable gateway once deployed.
          upstreamStatus: status ?? null,
          upstreamDetail: typeof detail === "string" ? detail.slice(0, 300) : null,
        });
        close();
      }
    },
    cancel() {
      upstream.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function persistConversation(params: {
  supabase: SupabaseServerClient;
  workspaceId: string;
  userId: string;
  requestedConversationId: string | null;
  mode: AssistantMode;
  messages: readonly IncomingMessage[];
  retrievalQuery: string;
  answer: string;
  model: string;
  retrievalPayload: ChatRetrievalPayload;
}): Promise<{ conversationId: string; messageId?: string } | null> {
  const { supabase, workspaceId, userId, mode, messages, retrievalQuery, answer, model, retrievalPayload } = params;
  let conversationId = params.requestedConversationId;

  if (conversationId) {
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", conversationId)
      .maybeSingle();
    if (!existingConversation) conversationId = null;
  }

  if (!conversationId) {
    const { data: createdConversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        title: deriveTitle(retrievalQuery),
        created_by: userId,
      })
      .select("id")
      .single();
    if (conversationError || !createdConversation) return null;
    conversationId = createdConversation.id;
  }
  if (!conversationId) return null;

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const { data: savedMessages, error: messageError } = await supabase.from("messages").insert([
    {
      workspace_id: workspaceId,
      conversation_id: conversationId,
      role: "user",
      mode,
      content: latestUserMessage?.content ?? retrievalQuery,
      // A batch insert unions all keys, so a row that omits citations is sent NULL
      // (not the column default) and violates NOT NULL.
      citations: [],
      created_by: userId,
    },
    {
      workspace_id: workspaceId,
      conversation_id: conversationId,
      role: "assistant",
      mode,
      content: answer,
      citations: { retrieval: retrievalPayload },
      model,
      prompt_version: "gateway-rag-v2",
      created_by: userId,
    },
  ]).select("id, role");
  if (messageError) return { conversationId };

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", conversationId);

  return {
    conversationId,
    messageId: savedMessages?.find((message) => message.role === "assistant")?.id,
  };
}
