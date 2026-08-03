// Listwise LLM reranking over the retrieved source groups, via the AI Gateway.
//
// Lexical scoring is strong on exact regulatory terms but weak on intent ("can I
// still claim ITC?" vs a section that merely mentions ITC). One cheap, fast LLM
// call re-orders the candidate sources by how directly they answer the question.
// Any failure or slow response falls back silently to the lexical order — reranking
// may improve an answer, but must never delay or break one.

import {
  gatewayGenerateContent,
  type GatewayConfig,
} from "@/lib/ai/gateway";
import type { RetrievalResult, RetrievedSource } from "@/lib/rag/types";

const RERANK_TIMEOUT_MS = 3_500;

function candidateLine(source: RetrievedSource): string {
  return [
    `${source.citationId}: ${source.authority} ${source.documentNumber ?? source.documentType}`,
    source.title,
    `status ${source.status}`,
    source.excerpts[0]?.slice(0, 260) ?? source.applicability.slice(0, 260),
  ].join(" | ");
}

export interface RerankOutcome {
  result: RetrievalResult;
  applied: boolean;
}

/**
 * Re-orders `result.sources` by answer-relevance and trims to `keep`. Citation ids
 * are reassigned to the new order so S1 is always the most relevant source.
 */
export async function rerankRetrievedSources(
  config: GatewayConfig,
  model: string,
  query: string,
  result: RetrievalResult,
  keep = 6,
): Promise<RerankOutcome> {
  if (result.sources.length <= 2) {
    return { result: { ...result, sources: result.sources.slice(0, keep) }, applied: false };
  }

  try {
    const { status, payload } = await gatewayGenerateContent(config, model, {
      systemInstruction: {
        parts: [{
          text: "You rank regulatory sources for an Indian compliance question. "
            + "Judge only how directly each source answers the question. "
            + "Reply with JSON only: {\"ranking\":[\"S1\",...]} listing EVERY candidate id, most relevant first.",
        }],
      },
      contents: [{
        role: "user",
        parts: [{
          text: `Question: ${query.slice(0, 1_200)}\n\nCandidates:\n${result.sources
            .map(candidateLine)
            .join("\n")}`,
        }],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }, { timeoutMs: RERANK_TIMEOUT_MS });

    if (status < 200 || status >= 300) return { result, applied: false };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
    const parsed = JSON.parse(text) as { ranking?: unknown };
    if (!Array.isArray(parsed.ranking)) return { result, applied: false };

    const byCitation = new Map(result.sources.map((source) => [source.citationId, source]));
    const ranked: RetrievedSource[] = [];
    for (const id of parsed.ranking) {
      const source = typeof id === "string" ? byCitation.get(id.trim().toUpperCase()) : undefined;
      if (source && !ranked.includes(source)) ranked.push(source);
    }
    // Any candidates the model dropped keep their lexical order at the tail.
    for (const source of result.sources) {
      if (!ranked.includes(source)) ranked.push(source);
    }

    // Safety net: reranking may reorder, but must never DROP the lexical top-2 —
    // a bad LLM ranking would otherwise remove the very source the answer needs.
    let kept = ranked.slice(0, keep);
    for (const protectedSource of result.sources.slice(0, 2)) {
      if (!kept.includes(protectedSource)) {
        kept = [...kept.slice(0, keep - 1), protectedSource];
      }
    }

    const sources = kept.map((source, index) => ({
      ...source,
      citationId: `S${index + 1}`,
    }));
    return { result: { ...result, sources }, applied: true };
  } catch {
    return { result: { ...result, sources: result.sources.slice(0, keep) }, applied: false };
  }
}
