export type RegulatoryStatus = "active" | "historical" | "superseded" | "index";
export type SourceKind = "curated-summary" | "official-full-text" | "official-index-text";
export type RetrievalConfidence = "high" | "medium" | "low";
export type CitationState = "locked" | "partial" | "unsupported";

export interface RegulatoryChunk {
  id: string;
  sourceId: string;
  authority: string;
  publisher: string;
  documentType: string;
  documentNumber: string | null;
  title: string;
  publishedAt: string | null;
  effectiveFrom: string | null;
  expiresAt: string | null;
  status: RegulatoryStatus;
  applicability: string;
  topics: string[];
  canonicalUrl: string;
  sourceKind: SourceKind;
  checkedAt: string;
  content: string;
  contentHash: string;
  embedding: number[];
}

export interface RegulatorySource {
  id: string;
  authority: string;
  publisher: string;
  documentType: string;
  documentNumber?: string;
  title: string;
  publishedAt?: string;
  effectiveFrom?: string;
  expiresAt?: string;
  status: RegulatoryStatus;
  applicability: string;
  topics: string[];
  canonicalUrl: string;
  checkedAt: string;
  fetchedUrl: string | null;
  contentType: string | null;
  ingestionState: "full-text" | "summary-only";
  chunkCount: number;
}

export interface RegulatoryCorpus {
  schemaVersion: number;
  generatedAt: string;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  embeddedChunkCount: number;
  embeddedAt: string | null;
  sourceCount: number;
  chunkCount: number;
  fullTextSourceCount: number;
  summaryOnlySourceCount: number;
  authorities: string[];
  sources: RegulatorySource[];
  chunks: RegulatoryChunk[];
  warnings: string[];
}

export interface RetrievedSource {
  citationId: string;
  sourceId: string;
  authority: string;
  publisher: string;
  documentType: string;
  documentNumber: string | null;
  title: string;
  publishedAt: string | null;
  effectiveFrom: string | null;
  expiresAt: string | null;
  status: RegulatoryStatus;
  applicability: string;
  canonicalUrl: string;
  sourceKind: SourceKind;
  relevance: number;
  excerpts: string[];
}

export interface RetrievalResult {
  query: string;
  strategy: "hybrid" | "lexical";
  confidence: RetrievalConfidence;
  sources: RetrievedSource[];
  corpus: {
    sourceCount: number;
    chunkCount: number;
    fullTextSourceCount: number;
    embeddedChunkCount: number;
    generatedAt: string;
  };
}

export interface ChatRetrievalPayload {
  strategy: RetrievalResult["strategy"];
  confidence: RetrievalConfidence;
  citationState: CitationState;
  citedSourceIds: string[];
  corpus: RetrievalResult["corpus"];
  sources: RetrievedSource[];
}
