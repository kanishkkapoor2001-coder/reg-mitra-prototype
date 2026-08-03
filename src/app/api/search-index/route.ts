import { NextResponse } from "next/server";
import { regulatoryCorpus } from "@/lib/rag/corpus";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export interface SearchIndexClient {
  id: string;
  name: string;
  detail: string;
}

export interface SearchIndexSource {
  id: string;
  title: string;
  detail: string;
}

export interface SearchIndexPayload {
  clients: SearchIndexClient[];
  sources: SearchIndexSource[];
}

// Feeds the ⌘K palette. The corpus lives in a 5 MB JSON module, so it is
// slimmed here on the server rather than shipped into the client bundle.
// Clients are workspace-scoped through RLS: a firm can only ever see its own.
export async function GET() {
  const sources: SearchIndexSource[] = regulatoryCorpus.sources
    .filter((source) => source.status !== "index")
    .map((source) => ({
      id: source.id,
      title: source.title,
      detail: [source.authority, source.documentNumber, source.publishedAt]
        .filter(Boolean)
        .join(" · "),
    }));

  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ clients: [], sources } satisfies SearchIndexPayload);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("id, display_name, legal_name, sector, state_code")
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .order("display_name");

  const clients: SearchIndexClient[] = (data ?? []).map((client) => ({
    id: client.id,
    name: client.display_name || client.legal_name,
    detail: [client.sector, client.state_code].filter(Boolean).join(" · ") || "Profile incomplete",
  }));

  return NextResponse.json({ clients, sources } satisfies SearchIndexPayload);
}
