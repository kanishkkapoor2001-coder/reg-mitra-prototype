export type RegulatoryStatus = "active" | "historical" | "superseded" | "index";
export type SourceKind = "curated-summary" | "official-full-text" | "official-index-text";
export type RetrievalConfidence = "high" | "medium" | "low";
export type CitationState = "locked" | "partial" | "unsupported";

export interface SupersessionRef {
  sourceId: string;
  documentNumber: string | null;
  title: string;
  effectiveFrom: string | null;
}

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
  /** Statutory unit within the document, e.g. "Section 47" or "para 4.2". Schema v2. */
  sectionPath?: string | null;
  /** Deterministic identity header used for scoring/embedding, not display. Schema v2. */
  contextHeader?: string;
  supersedes?: string[];
  supersededBy?: SupersessionRef | null;
  amendedBy?: SupersessionRef[];
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
  mirrorUrls?: string[];
  supersedes?: string[];
  supersededBy?: SupersessionRef | null;
  amends?: string[];
  amendedBy?: SupersessionRef[];
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
  sectionPaths?: string[];
  supersededBy?: SupersessionRef | null;
  /** The source's curated summary — always supplied to the model AND the verifier. */
  summary?: string;
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

export interface ChatVerificationPayload {
  state: "verified" | "partial" | "unverified" | "unchecked";
  supportedCount: number;
  claimCount: number;
  flagged: Array<{ claim: string; citations: string[]; verdict: "supported" | "partial" | "unsupported" }>;
}

export interface ChatRetrievalPayload {
  strategy: RetrievalResult["strategy"];
  confidence: RetrievalConfidence;
  citationState: CitationState;
  citedSourceIds: string[];
  corpus: RetrievalResult["corpus"];
  sources: RetrievedSource[];
  verification?: ChatVerificationPayload;
}
