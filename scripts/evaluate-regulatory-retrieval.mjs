import { readFile } from "node:fs/promises";
import { scoreRegulatoryChunks } from "../src/lib/rag/scoring.ts";

const corpus = JSON.parse(await readFile(new URL("../data/regulatory/corpus.json", import.meta.url)));
const evaluation = JSON.parse(
  await readFile(new URL("../data/regulatory/retrieval-evaluation.json", import.meta.url)),
);

let failures = 0;
const results = [];

for (const testCase of evaluation.cases) {
  // Mirrors production: no keyword gate — absolute query coverage decides whether
  // anything in the corpus meaningfully matches (see NO_RESULT_COVERAGE in retrieval).
  const scored = scoreRegulatoryChunks(testCase.query, corpus.chunks, null);
  const topCoverage = Math.max(...scored.slice(0, 8).map((result) => result.coverage ?? 0), 0);
  const sources = [];
  if (topCoverage >= 0.22) {
    for (const result of scored) {
      if (result.score < 0.08) continue;
      if (!sources.includes(result.chunk.sourceId)) sources.push(result.chunk.sourceId);
      if (sources.length >= 8) break;
    }
  }
  const topK = testCase.topK ?? 3;
  const topSources = sources.slice(0, topK);
  const missing = (testCase.expectedSourceIds ?? []).filter(
    (sourceId) => !topSources.includes(sourceId),
  );
  const forbiddenTop = (testCase.forbiddenTopSourceIds ?? []).filter(
    (sourceId) => topSources[0] === sourceId,
  );
  const unexpectedSources = testCase.expectNoRelevantSource && sources.length > 0;
  const passed = missing.length === 0 && forbiddenTop.length === 0 && !unexpectedSources;
  if (!passed) failures += 1;
  results.push({
    id: testCase.id,
    passed,
    topSources,
    missing,
    forbiddenTop,
    unexpectedSources: unexpectedSources ? sources : [],
  });
}

for (const result of results) {
  const marker = result.passed ? "PASS" : "FAIL";
  console.log(`${marker} ${result.id}: ${result.topSources.join(", ") || "no source"}`);
  if (!result.passed) {
    if (result.missing.length) console.log(`  missing: ${result.missing.join(", ")}`);
    if (result.forbiddenTop.length) console.log(`  forbidden top: ${result.forbiddenTop.join(", ")}`);
    if (result.unexpectedSources.length) {
      console.log(`  expected abstention; retrieved: ${result.unexpectedSources.join(", ")}`);
    }
  }
}

const passed = results.length - failures;
console.log(`\nRetrieval evaluation: ${passed}/${results.length} passed.`);
if (failures) process.exitCode = 1;
