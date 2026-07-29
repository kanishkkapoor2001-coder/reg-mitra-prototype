import type { CitationState, RetrievalResult } from "@/lib/rag/types";

export function validateCitations(text: string, retrieval: RetrievalResult) {
  const available = new Set(retrieval.sources.map((source) => source.citationId));
  const cited = [...text.matchAll(/\[(S\d+)\]/g)]
    .map((match) => match[1])
    .filter((citationId): citationId is string => Boolean(citationId));
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
