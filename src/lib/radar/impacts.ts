import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RadarDecision } from "@/lib/radar/evaluate";
import { getAttributeDefinition } from "@/lib/radar/facts";

// Reading side of the matcher's output, for the client page, the clients list
// and the Today queue.

export type ReviewState = "not_reviewed" | "in_review" | "approved" | "rejected";

export type ImpactEvidence = { id: string; marker: string; quote: string; location: string };

export type ClientImpact = {
  id: string;
  clientId: string;
  clientName: string;
  decision: RadarDecision;
  reviewState: ReviewState;
  applicability: string;
  evidence: ImpactEvidence[];
  missingAttributes: string[];
  matchedAt: string | null;
  source: {
    id: string;
    authority: string;
    title: string;
    url: string;
    publishedAt: string | null;
  };
};

export type ClientRadarSummary = {
  flagged: number;
  needsFacts: number;
  cleared: number;
  approved: number;
  /** True when the matcher has never run for this client. */
  unassessed: boolean;
};

const IMPACT_COLUMNS =
  "id, client_id, decision, review_state, applicability, applicability_evidence, missing_attributes, matched_at, clients(display_name), regulatory_sources(id, authority, title, canonical_url, published_at)";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toImpact(row: any): ClientImpact | null {
  const sourceValue = row.regulatory_sources;
  const source = Array.isArray(sourceValue) ? sourceValue[0] : sourceValue;
  if (!source) return null;
  const clientValue = row.clients;
  const client = Array.isArray(clientValue) ? clientValue[0] : clientValue;

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: client?.display_name ?? "Client",
    decision: row.decision as RadarDecision,
    reviewState: row.review_state as ReviewState,
    applicability: row.applicability ?? "",
    evidence: Array.isArray(row.applicability_evidence) ? row.applicability_evidence : [],
    missingAttributes: row.missing_attributes ?? [],
    matchedAt: row.matched_at ?? null,
    source: {
      id: source.id,
      authority: source.authority,
      title: source.title,
      url: source.canonical_url,
      publishedAt: source.published_at ?? null,
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Matches for one client, newest first. Cleared results are excluded by default. */
export async function readClientImpacts(
  supabase: SupabaseClient,
  clientId: string,
  options: { includeCleared?: boolean } = {},
): Promise<ClientImpact[]> {
  let query = supabase
    .from("client_regulatory_impacts")
    .select(IMPACT_COLUMNS)
    .eq("client_id", clientId)
    .order("matched_at", { ascending: false });

  if (!options.includeCleared) {
    query = query.neq("decision", "no_detected_connection");
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toImpact).filter((item): item is ClientImpact => item !== null);
}

/** Per-client counts for the clients list, in one round trip. */
export async function readWorkspaceRadarSummary(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<Map<string, ClientRadarSummary>> {
  const { data, error } = await supabase
    .from("client_regulatory_impacts")
    .select("client_id, decision, review_state")
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  const summary = new Map<string, ClientRadarSummary>();
  for (const row of (data ?? []) as Array<{ client_id: string; decision: string; review_state: string }>) {
    const current = summary.get(row.client_id)
      ?? { flagged: 0, needsFacts: 0, cleared: 0, approved: 0, unassessed: false };

    if (row.decision === "direct_relevance") {
      if (row.review_state === "approved") current.approved += 1;
      else if (row.review_state !== "rejected") current.flagged += 1;
    } else if (row.decision === "more_information_needed") current.needsFacts += 1;
    else if (row.decision === "no_detected_connection") current.cleared += 1;

    summary.set(row.client_id, current);
  }
  return summary;
}

/** Everything across the book still waiting on a decision. */
export async function readPendingDecisions(
  supabase: SupabaseClient,
  workspaceId: string,
  limit = 25,
): Promise<ClientImpact[]> {
  const { data, error } = await supabase
    .from("client_regulatory_impacts")
    .select(IMPACT_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("decision", "direct_relevance")
    .eq("review_state", "not_reviewed")
    .order("matched_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toImpact).filter((item): item is ClientImpact => item !== null);
}

/** Turns missing attribute keys into the questions worth asking. */
export function questionsFor(impacts: ClientImpact[], limit = 3) {
  const counts = new Map<string, number>();
  for (const impact of impacts) {
    if (impact.decision !== "more_information_needed") continue;
    for (const key of impact.missingAttributes) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, resolves]) => ({ key, resolves, definition: getAttributeDefinition(key) }))
    .filter((item) => item.definition !== null);
}
