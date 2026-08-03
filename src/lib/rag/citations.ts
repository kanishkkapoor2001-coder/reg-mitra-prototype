import type { CitationState, RetrievalResult } from "@/lib/rag/types";

/**
 * Matches any bracketed group that contains a source marker, tolerating model
 * variants like "[S1]", "[S1, S2]", "[S1, Excerpt 2]", "[S1; para 4]". The prompt
 * demands plain "[S1]", but parsing must never lose a citation to formatting.
 */
export const CITATION_GROUP_PATTERN = /\[[^\]]*?\bS\d+\b[^\]]*?\]/g;

/** All source ids ("S1", "S2", …) cited anywhere in the text, in order. */
export function extractCitationIds(text: string): string[] {
  const ids: string[] = [];
  for (const group of text.match(CITATION_GROUP_PATTERN) ?? []) {
    for (const id of group.match(/\bS\d+\b/g) ?? []) ids.push(id);
  }
  return ids;
}

export function validateCitations(text: string, retrieval: RetrievalResult) {
  const available = new Set(retrieval.sources.map((source) => source.citationId));
  const cited = extractCitationIds(text);
  const valid = [...new Set(cited.filter((citationId) => available.has(citationId)))];
  const invalid = [...new Set(cited.filter((citationId) => !available.has(citationId)))];
  const directSources = retrieval.sources.filter(
    (source) => source.sourceKind !== "official-index-text",
  );

  let state: CitationState = "unsupported";
  if (valid.length > 0 && invalid.length === 0) {
    state = directSources.length > 0 ? "locked" : "partial";
  } else if (valid.length > 0) {
    state = "partial";
  }

  return {
    state,
    valid,
    invalid,
  };
}
