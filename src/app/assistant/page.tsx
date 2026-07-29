import { AssistantExperience } from "@/components/assistant-experience";
import { cookies } from "next/headers";
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
  const templateMode = sessionMode === "demo" || !getSupabasePublicConfig();

  if (templateMode) {
    return <AssistantExperience initialPrompt={initialPrompt} templateMode />;
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace) return <AssistantExperience initialPrompt={initialPrompt} />;
  const supabase = await createSupabaseServerClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })
    .limit(12);

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
