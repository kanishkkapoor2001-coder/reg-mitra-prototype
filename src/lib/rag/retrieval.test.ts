import assert from "node:assert/strict";
import test from "node:test";
import { scoreRegulatoryChunks } from "./scoring.ts";
import type { RegulatoryChunk } from "./types.ts";

function chunk(overrides: Partial<RegulatoryChunk>): RegulatoryChunk {
  return {
    id: "chunk",
    sourceId: "source",
    authority: "CBDT",
    publisher: "Official publisher",
    documentType: "circular",
    documentNumber: null,
    title: "Official source",
    publishedAt: "2026-01-01",
    effectiveFrom: "2026-01-01",
    expiresAt: null,
    status: "active",
    applicability: "Professional compliance work",
    topics: [],
    canonicalUrl: "https://example.gov.in/source",
    sourceKind: "official-full-text",
    checkedAt: "2026-07-29T00:00:00.000Z",
    content: "Official compliance text.",
    contentHash: "a".repeat(64),
    embedding: [],
    ...overrides,
  };
}

test("ranks an exact GST DIN and RFN circular above unrelated material", () => {
  const chunks = [
    chunk({
      id: "gst",
      sourceId: "gst",
      authority: "CBIC",
      documentNumber: "Circular No. 249/06/2025-GST",
      title: "DIN requirement for GST portal communications with RFN",
      topics: ["gst", "din", "rfn"],
      content: "A GST common portal communication bearing a verifiable RFN does not require a DIN.",
    }),
    chunk({
      id: "audit",
      sourceId: "audit",
      authority: "ICAI",
      title: "Bank audit guidance",
      topics: ["audit", "bank"],
      content: "Guidance for a statutory audit of a bank.",
    }),
  ];
  const results = scoreRegulatoryChunks(
    "Does my GST portal notice need a DIN if it already has an RFN?",
    chunks,
    null,
  );
  assert.equal(results[0]?.chunk.id, "gst");
});

test("demotes historical relief when the user asks for the current rule", () => {
  const chunks = [
    chunk({
      id: "historical",
      sourceId: "historical",
      status: "historical",
      title: "One-time TDS certificate extension",
      content: "The deadline for the December 2025 quarter was extended to 31 March 2026.",
      topics: ["tds", "certificate", "extension"],
    }),
    chunk({
      id: "active",
      sourceId: "active",
      status: "active",
      title: "Current TDS payment guidance",
      content: "Current portal guidance for TDS tax payments and challans.",
      topics: ["tds", "payment", "current"],
    }),
  ];
  const results = scoreRegulatoryChunks(
    "What is the current TDS payment guidance?",
    chunks,
    null,
  );
  assert.equal(results[0]?.chunk.id, "active");
});

test("exact circular number receives a deterministic boost", () => {
  const chunks = [
    chunk({
      id: "exact",
      sourceId: "exact",
      authority: "CBIC",
      documentNumber: "Circular No. 250/07/2025-GST",
      content: "Appeals against orders of a Common Adjudicating Authority.",
    }),
    chunk({
      id: "generic",
      sourceId: "generic",
      authority: "CBIC",
      documentNumber: "Circular No. 249/06/2025-GST",
      content: "General GST appeal procedure.",
    }),
  ];
  const results = scoreRegulatoryChunks(
    "Explain Circular 250/07/2025",
    chunks,
    null,
  );
  assert.equal(results[0]?.chunk.id, "exact");
});
