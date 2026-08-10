import { AssistantExperience } from "@/components/assistant-experience";
import { cookies } from "next/headers";
import { getGatewayConfig } from "@/lib/ai/gateway";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { ChatRetrievalPayload } from "@/lib/rag/types";

interface AssistantPageProps {
  searchParams: Promise<{ prompt?: string | string[]; conversation?: string | string[] }>;
}

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const params = await searchParams;
  const sessionMode = (await cookies()).get("reg_mitra_session")?.value;
  const initialPrompt = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt;
  const requestedConversation = Array.isArray(params.conversation)
    ? params.conversation[0]
    : params.conversation;
  // Answering needs the AI gateway; Supabase only governs whether the conversation
  // is persisted. Tying template mode to the database meant a deployment without
  // one served canned sample answers even with a fully working assistant behind it.
  const liveAiReady = Boolean(getGatewayConfig())
    && (process.env.NODE_ENV !== "production" || process.env.REGMITRA_ENABLE_LIVE_AI === "true");
  // THE DEMO IS FROZEN.
  //
  // Everyone without a workspace — an explicit demo session, or anyone simply
  // not signed in — gets canned, fictional answers. Every public "demo" link
  // points here, so this is what a prospect sees, and a sales demo has to be
  // the same every time: deterministic, costing nothing, and incapable of
  // saying something unintended about Indian tax law to someone evaluating the
  // product. Template mode labels itself as fictional, so nobody is misled.
  //
  // It also means anonymous traffic never reaches the paid gateway.
  const workspace = getSupabasePublicConfig() ? await getCurrentWorkspace() : null;

  if (sessionMode === "demo" || !workspace) {
    return <AssistantExperience initialPrompt={initialPrompt} templateMode />;
  }

  // From here on there IS a real workspace, so a missing gateway is an outage,
  // not an invitation to serve fiction to a paying firm.
  if (!liveAiReady) {
    if (process.env.NODE_ENV === "production") {
      return <AssistantUnavailable />;
    }
    return <AssistantExperience initialPrompt={initialPrompt} templateMode />;
  }
  const supabase = await createSupabaseServerClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })
    // A chat list you can actually scroll back through, like any chat product.
    .limit(60);

  const selectedId = requestedConversation
    ?? (initialPrompt ? null : conversations?.[0]?.id)
    ?? null;
  const { data: persistedMessages } = selectedId
    ? await supabase
      .from("messages")
      .select("id, role, mode, content, citations")
      .eq("workspace_id", workspace.id)
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <AssistantExperience
      conversationHistory={(conversations ?? []).map((conversation) => ({
        id: conversation.id,
        title: conversation.title || "Untitled review",
        updatedAt: conversation.updated_at,
      }))}
      initialConversationId={selectedId}
      initialMessages={(persistedMessages ?? []).flatMap((message) => {
        if (message.role !== "user" && message.role !== "assistant") return [];
        const citations = message.citations as { retrieval?: ChatRetrievalPayload } | null;
        return [{
          id: message.id,
          role: message.role,
          mode: message.mode === "act" ? "act" as const : "ask" as const,
          content: message.content,
          retrieval: citations?.retrieval,
        }];
      })}
      initialPrompt={initialPrompt}
      templateMode={false}
    />
  );
}

// Shown when the AI gateway is not configured in production. An honest outage
// beats fabricated answers.
function AssistantUnavailable() {
  return (
    <>
      <section className="detail-hero" style={{ marginTop: 4 }}>
        <div>
          <p className="eyebrow">Assistant</p>
          <h1>Research is temporarily unavailable</h1>
          <p className="page-subtitle">
            The assistant cannot reach its language model right now, so it is not answering
            rather than guessing.
          </p>
        </div>
      </section>
      <div className="notice">
        <strong>Nothing has been lost.</strong> Your clients, tasks and saved conversations are
        unaffected. The compliance calendar, calculators and official sources all still work.
      </div>
    </>
  );
}
