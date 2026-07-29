import { regulatoryCorpus } from "@/lib/rag/corpus";
import { embedRegulatoryQuery } from "@/lib/rag/embedding";
import { hasSupportedRegulatorySignal, scoreRegulatoryChunks } from "@/lib/rag/scoring";
import type {
  RetrievedSource,
  RetrievalConfidence,
  RetrievalResult,
} from "@/lib/rag/types";

function clipExcerpt(value: string, maxLength = 1_050) {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("\n"));
  return `${clipped.slice(0, sentenceEnd > maxLength * 0.65 ? sentenceEnd + 1 : maxLength).trim()}…`;
}

function calculateConfidence(
  sources: readonly RetrievedSource[],
): RetrievalConfidence {
  const directSources = sources.filter((source) => source.sourceKind !== "official-index-text");
  const topRelevance = sources[0]?.relevance ?? 0;
  if (topRelevance >= 0.66 && directSources.length >= 2) return "high";
  if (topRelevance >= 0.38 && directSources.length >= 1) return "medium";
  return "low";
}

function inferAuthorityScope(query: string) {
  const normalised = query.toLowerCase();
  if (/\b(gst|gstr|cgst|rfn|dggi)\b/.test(normalised)) return new Set(["CBIC", "GSTN"]);
  if (/\b(income tax|tds|deductor|12a|80g|10a|10ab|itr)\b/.test(normalised)) {
    return new Set(["CBDT", "Income Tax Department"]);
  }
  if (/\b(icai|audit|auditing|assurance|sqm|sqc|accounting standard)\b/.test(normalised)) {
    return new Set(["ICAI"]);
  }
  if (/\b(sebi|securities|demat|rta|mutual fund|aif)\b/.test(normalised)) {
    return new Set(["SEBI"]);
  }
  if (/\b(epf|epfo|provident|ecr)\b/.test(normalised)) return new Set(["EPFO"]);
  return null;
}

export async function retrieveRegulatorySources(
  query: string,
  options: { apiKey?: string; limit?: number } = {},
): Promise<RetrievalResult> {
  const limit = Math.max(1, Math.min(options.limit ?? 6, 8));
  const normalisedQuery = query.trim().slice(0, 6_000);
  if (!hasSupportedRegulatorySignal(normalisedQuery)) {
    return {
      query: normalisedQuery,
      strategy: "lexical",
      confidence: "low",
      sources: [],
      corpus: {
        sourceCount: regulatoryCorpus.sourceCount,
        chunkCount: regulatoryCorpus.chunkCount,
        fullTextSourceCount: regulatoryCorpus.fullTextSourceCount,
        embeddedChunkCount: regulatoryCorpus.embeddedChunkCount,
        generatedAt: regulatoryCorpus.generatedAt,
      },
    };
  }
  const queryEmbedding = options.apiKey
    ? await embedRegulatoryQuery(normalisedQuery, options.apiKey)
    : null;
  const scored = scoreRegulatoryChunks(
    normalisedQuery,
    regulatoryCorpus.chunks,
    queryEmbedding,
  );
  const authorityScope = inferAuthorityScope(normalisedQuery);

  const sourceGroups = new Map<string, typeof scored>();
  for (const item of scored) {
    if (authorityScope && !authorityScope.has(item.chunk.authority)) continue;
    const group = sourceGroups.get(item.chunk.sourceId) ?? [];
    if (group.length < 3) group.push(item);
    sourceGroups.set(item.chunk.sourceId, group);
  }

  const groupedCandidates = [...sourceGroups.values()]
    .map((items) => {
      const first = items[0];
      if (!first) return null;
      return {
        first,
        items,
        groupScore: first.score + (items[1]?.score ?? 0) * 0.08,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((left, right) => right.groupScore - left.groupScore);
  const leadingScore = groupedCandidates[0]?.groupScore ?? 0;
  const grouped = groupedCandidates
    .filter((group) => group.groupScore >= Math.max(0.08, leadingScore * 0.24))
    .slice(0, limit);
  const topScore = grouped[0]?.groupScore || 1;

  const sources: RetrievedSource[] = grouped.map(({ first, items, groupScore }, index) => ({
    citationId: `S${index + 1}`,
    sourceId: first.chunk.sourceId,
    authority: first.chunk.authority,
    publisher: first.chunk.publisher,
    documentType: first.chunk.documentType,
    documentNumber: first.chunk.documentNumber,
    title: first.chunk.title,
    publishedAt: first.chunk.publishedAt,
    effectiveFrom: first.chunk.effectiveFrom,
    expiresAt: first.chunk.expiresAt,
    status: first.chunk.status,
    applicability: first.chunk.applicability,
    canonicalUrl: first.chunk.canonicalUrl,
    sourceKind: first.chunk.sourceKind,
    relevance: Number(Math.min(1, groupScore / topScore).toFixed(3)),
    excerpts: items
      .filter((item) => item.score >= first.score * 0.52)
      .slice(0, 2)
      .map((item) => clipExcerpt(item.chunk.content)),
  }));

  return {
    query: normalisedQuery,
    strategy: queryEmbedding ? "hybrid" : "lexical",
    confidence: calculateConfidence(sources),
    sources,
    corpus: {
      sourceCount: regulatoryCorpus.sourceCount,
      chunkCount: regulatoryCorpus.chunkCount,
      fullTextSourceCount: regulatoryCorpus.fullTextSourceCount,
      embeddedChunkCount: regulatoryCorpus.embeddedChunkCount,
      generatedAt: regulatoryCorpus.generatedAt,
    },
  };
}

export function formatRetrievedEvidence(result: RetrievalResult) {
  if (!result.sources.length) return "No relevant official source was retrieved.";
  return result.sources.map((source) => [
    `[${source.citationId}] ${source.authority} — ${source.documentNumber ? `${source.documentNumber}: ` : ""}${source.title}`,
    `Status: ${source.status}. Published: ${source.publishedAt ?? "not stated"}. Effective: ${source.effectiveFrom ?? "not stated"}.`,
    `Applicability: ${source.applicability}`,
    `Official URL: ${source.canonicalUrl}`,
    ...source.excerpts.map((excerpt, index) => `Excerpt ${index + 1}: ${excerpt}`),
  ].join("\n")).join("\n\n");
}
