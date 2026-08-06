import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const corpus = JSON.parse(
  await readFile(join(projectRoot, "data/regulatory/corpus.json"), "utf8"),
);

assert.equal(corpus.schemaVersion, 2);
assert.ok(corpus.sourceCount >= 18, "Expected at least 18 registered official sources");
assert.ok(corpus.chunkCount >= corpus.sourceCount, "Every source must have at least one chunk");
assert.ok(corpus.fullTextSourceCount >= 8, "Expected at least eight successfully ingested full-text sources");
assert.ok(new Set(corpus.sources.map((source) => source.id)).size === corpus.sourceCount);
assert.ok(corpus.sources.every((source) => source.canonicalUrl.startsWith("https://")));
{
  // Chunks shorter than this are PDF page-break artifacts ("100\n\f 143."), not
  // regulatory text. They are stripped at build time; if any reappear the
  // extractor has regressed, so name them rather than failing opaquely.
  const tiny = corpus.chunks.filter((chunk) => chunk.content.length < 30);
  assert.ok(
    tiny.length === 0,
    `Expected no chunks under 30 chars; found ${tiny.length}: ${tiny.map((c) => c.id).join(", ")}`,
  );
}
assert.ok(corpus.chunks.every((chunk) => chunk.contentHash.length === 64));
assert.ok(corpus.chunks.some((chunk) => chunk.status === "historical"));
assert.ok(corpus.chunks.some((chunk) => chunk.status === "active"));
assert.ok(corpus.authorities.includes("CBDT"));
assert.ok(corpus.authorities.includes("CBIC"));
assert.ok(corpus.authorities.includes("ICAI"));
assert.ok(corpus.authorities.includes("SEBI"));

process.stdout.write(
  `Corpus healthy: ${corpus.sourceCount} sources, ${corpus.chunkCount} chunks, `
    + `${corpus.fullTextSourceCount} full-text sources.\n`,
);
