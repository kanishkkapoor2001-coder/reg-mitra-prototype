import { regulatoryCorpus } from "@/lib/rag/corpus";
import { embedRegulatoryQuery } from "@/lib/rag/embedding";
import { scoreRegulatoryChunks } from "@/lib/rag/scoring";
import type {
  RetrievedSource,
  RetrievalConfidence,
  RetrievalResult,
} from "@/lib/rag/types";

function clipExcerpt(value: string, maxLength = 1_600) {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("\n"));
  return `${clipped.slice(0, sentenceEnd > maxLength * 0.65 ? sentenceEnd + 1 : maxLength).trim()}…`;
}

/**
 * Confidence is driven by ABSOLUTE query coverage (IDF-weighted share of query
 * terms matched by the best chunk), not by the per-query-normalised relevance —
 * which is always ~1 for the top hit and cannot tell a real match from the best
 * of a bad lot.
 */
function calculateConfidence(
  sources: readonly RetrievedSource[],
  topCoverage: number,
): RetrievalConfidence {
  const directSources = sources.filter((source) => source.sourceKind !== "official-index-text");
  if (topCoverage >= 0.62 && directSources.length >= 2) return "high";
  if (topCoverage >= 0.34 && directSources.length >= 1) return "medium";
  return "low";
}

/** Below this coverage nothing in the corpus meaningfully addresses the query. */
const NO_RESULT_COVERAGE = 0.22;

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
  if (/\b(rbi|reserve bank|nbfc|microfinance|mfi|qualifying assets|chief compliance officer|cco)\b/.test(normalised)) {
    return new Set(["RBI"]);
  }
  if (/\b(mca|companies act|company law|cin|llpin|registrar of companies|roc)\b/.test(normalised)) {
    return new Set(["MCA"]);
  }
  if (/\b(fssai|food safety|food business|fbo|street vendor|calcium carbide|ethylene|fifo|fefo)\b/.test(normalised)) {
    return new Set(["FSSAI"]);
  }
  return null;
}

export async function retrieveRegulatorySources(
  query: string,
  options: { apiKey?: string; limit?: number } = {},
): Promise<RetrievalResult> {
  const limit = Math.max(1, Math.min(options.limit ?? 6, 8));
  const normalisedQuery = query.trim().slice(0, 6_000);
  // No hard keyword gate: every substantive query attempts retrieval. Scoring +
  // calculateConfidence decide whether the evidence is strong enough, and the model
  // is told the confidence so it can caveat or ask for facts on weak matches.
  const queryEmbedding = options.apiKey
    ? await embedRegulatoryQuery(normalisedQuery, options.apiKey)
    : null;
  const scored = scoreRegulatoryChunks(
    normalisedQuery,
    regulatoryCorpus.chunks,
    queryEmbedding,
  );
  const authorityScope = inferAuthorityScope(normalisedQuery);
  const topCoverage = scored[0]?.coverage ?? 0;

  // Nothing in the corpus meaningfully matches (greetings, off-domain questions):
  // return zero sources so the assistant can refuse honestly instead of citing noise.
  if (Math.max(topCoverage, ...scored.slice(1, 8).map((item) => item.coverage)) < NO_RESULT_COVERAGE) {
    return {
      query: normalisedQuery,
      strategy: queryEmbedding ? "hybrid" : "lexical",
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

  const sourceGroups = new Map<string, typeof scored>();
  for (const item of scored) {
    const group = sourceGroups.get(item.chunk.sourceId) ?? [];
    if (group.length < 4) group.push(item);
    sourceGroups.set(item.chunk.sourceId, group);
  }

  const groupedCandidates = [...sourceGroups.values()]
    .map((items) => {
      const first = items[0];
      if (!first) return null;
      // Authority scope is a soft preference, not a filter: an in-scope authority is
      // boosted and an out-of-scope one is mildly penalised, but never excluded — so
      // cross-authority or misclassified questions still surface relevant sources.
      const scopeMultiplier = authorityScope
        ? authorityScope.has(first.chunk.authority) ? 1.12 : 0.82
        : 1;
      return {
        first,
        items,
        groupScore: (first.score + (items[1]?.score ?? 0) * 0.08) * scopeMultiplier,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((left, right) => right.groupScore - left.groupScore);
  const leadingScore = groupedCandidates[0]?.groupScore ?? 0;
  let grouped = groupedCandidates
    .filter((group) => group.groupScore >= Math.max(0.08, leadingScore * 0.24))
    .slice(0, limit);

  // Exact-citation guarantee: a query naming a specific circular/notification number
  // must surface that document even if fuzzy scoring ranked it below the cut.
  const citedNumber = normalisedQuery.match(/\b(\d{1,3})\s*\/\s*(20\d{2})\b/);
  if (citedNumber) {
    const wanted = `${citedNumber[1]}/${citedNumber[2]}`;
    const alreadyIncluded = grouped.some(
      (group) => group.first.chunk.documentNumber?.includes(wanted),
    );
    if (!alreadyIncluded) {
      const exact = groupedCandidates.find(
        (group) => group.first.chunk.documentNumber?.includes(wanted),
      );
      if (exact) grouped = [exact, ...grouped].slice(0, limit);
    }
  }
  const topScore = grouped[0]?.groupScore || 1;

  // Curated summaries per source: authoritative context that always accompanies
  // the excerpts, for the answering model and the verification pass alike.
  const summaryBySource = new Map<string, string>();
  for (const chunk of regulatoryCorpus.chunks) {
    if (chunk.sourceKind === "curated-summary") summaryBySource.set(chunk.sourceId, chunk.content);
  }

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
    sectionPaths: [...new Set(items.map((item) => item.chunk.sectionPath).filter(
      (path): path is string => Boolean(path),
    ))],
    supersededBy: first.chunk.supersededBy ?? null,
    summary: summaryBySource.get(first.chunk.sourceId),
    relevance: Number(Math.min(1, groupScore / topScore).toFixed(3)),
    excerpts: items
      .filter((item) => item.score >= first.score * 0.52)
      .slice(0, 4)
      .map((item) => clipExcerpt(item.chunk.content)),
  }));

  return {
    query: normalisedQuery,
    strategy: queryEmbedding ? "hybrid" : "lexical",
    confidence: calculateConfidence(sources, topCoverage),
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
    source.supersededBy
      ? `SUPERSEDED by ${source.supersededBy.documentNumber ?? source.supersededBy.title}`
        + `${source.supersededBy.effectiveFrom ? ` with effect from ${source.supersededBy.effectiveFrom}` : ""}. `
        + "State this supersession explicitly if you rely on this source."
      : null,
    source.sectionPaths?.length ? `Units retrieved: ${source.sectionPaths.join("; ")}` : null,
    `Applicability: ${source.applicability}`,
    source.summary ? `Curated summary: ${source.summary}` : null,
    `Official URL: ${source.canonicalUrl}`,
    ...source.excerpts.map((excerpt, index) => `Excerpt ${index + 1}: ${excerpt}`),
  ].filter(Boolean).join("\n")).join("\n\n");
}
