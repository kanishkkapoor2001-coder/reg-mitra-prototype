import corpusJson from "../../../data/regulatory/corpus.json";
import type { RegulatoryCorpus } from "@/lib/rag/types";

export const regulatoryCorpus = corpusJson as RegulatoryCorpus;

export function getCorpusHealth() {
  const sourceStates = regulatoryCorpus.sources.reduce(
    (counts, source) => {
      counts[source.ingestionState] += 1;
      return counts;
    },
    { "full-text": 0, "summary-only": 0 },
  );
  const activeSources = regulatoryCorpus.sources.filter((source) => source.status === "active").length;
  const indexSources = regulatoryCorpus.sources.filter((source) => source.status === "index").length;

  return {
    generatedAt: regulatoryCorpus.generatedAt,
    embeddedAt: regulatoryCorpus.embeddedAt,
    embeddingModel: regulatoryCorpus.embeddingModel,
    sourceCount: regulatoryCorpus.sourceCount,
    chunkCount: regulatoryCorpus.chunkCount,
    embeddedChunkCount: regulatoryCorpus.embeddedChunkCount,
    fullTextSourceCount: regulatoryCorpus.fullTextSourceCount,
    summaryOnlySourceCount: regulatoryCorpus.summaryOnlySourceCount,
    activeSources,
    indexSources,
    authorities: regulatoryCorpus.authorities,
    sourceStates,
    warnings: regulatoryCorpus.warnings,
  };
}
