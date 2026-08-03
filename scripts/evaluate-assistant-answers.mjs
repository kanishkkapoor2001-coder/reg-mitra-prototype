// Golden answer-level evaluation for the Reg Mitra assistant.
//
// Runs each case through the REAL /api/chat route (retrieval → rerank → prompt →
// stream → verification), then scores the answer with deterministic checks plus a
// gateway LLM judge.
//
// Gate semantics (exit 1 when violated):
//   - FABRICATIONS must be 0 — invalid citation markers, invented references,
//     asserting forbidden content. These are silent failures the user cannot see.
//   - Refusal discipline must hold on every false-premise/out-of-corpus case.
//   - Overall pass rate must be >= 90%.
// OVERREACH (verifier-confirmed unsupported claims) is reported per case and in the
// summary but does not fail the gate alone: the product surfaces those claims to
// the professional as "check this against Sx" flags in the UI.
// Run this before shipping any prompt, model, retrieval, or corpus change.
//
// Usage: start the dev server, then:
//   node scripts/evaluate-assistant-answers.mjs [--base http://localhost:3000]
//     [--category false-premise] [--limit N] [--concurrency 3] [--verbose]

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const casesPath = join(projectRoot, "data/regulatory/answer-evaluation.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { base: "http://localhost:3000", category: null, limit: Infinity, concurrency: 3, verbose: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--base") options.base = args[++index];
    else if (args[index] === "--category") options.category = args[++index];
    else if (args[index] === "--limit") options.limit = Number(args[++index]);
    else if (args[index] === "--concurrency") options.concurrency = Number(args[++index]);
    else if (args[index] === "--verbose") options.verbose = true;
  }
  return options;
}

async function loadLocalEnv() {
  try {
    const env = await readFile(join(projectRoot, ".env.local"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // Environment may already be configured.
  }
}

async function askAssistant(base, testCase) {
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: testCase.mode ?? "ask",
      messages: [{ role: "user", content: testCase.query }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("text/event-stream")) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }

  let text = "";
  let retrieval = null;
  let verification = null;
  let buffer = "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      let event;
      try {
        event = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (event.type === "delta" && event.text) text += event.text;
      else if (event.type === "retrieval") retrieval = event.retrieval;
      else if (event.type === "verification") verification = event.verification;
      else if (event.type === "done") retrieval = event.retrieval ?? retrieval;
      else if (event.type === "error") throw new Error(event.error || "stream error");
    }
  }
  return { text, retrieval, verification };
}

async function judgeAnswer(testCase, answer, retrievedSources) {
  const gatewayUrl = process.env.REGMITRA_AI_GATEWAY_URL?.replace(/\/+$/, "");
  const key = process.env.REGMITRA_AI_GATEWAY_KEY;
  const project = process.env.REGMITRA_VERTEX_PROJECT;
  const location = process.env.REGMITRA_VERTEX_LOCATION || "global";
  const model = process.env.REGMITRA_LLM_MODEL || "gemini-2.5-flash";
  if (!gatewayUrl || !key || !project) throw new Error("Gateway env not configured");

  const endpoint = `${gatewayUrl}/v1/vertex/v1beta1/projects/${encodeURIComponent(project)}`
    + `/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}%3AgenerateContent`;
  const knownSources = (retrievedSources ?? [])
    .map((source) => `${source.citationId}: ${source.authority} ${source.documentNumber ?? source.documentType} — ${source.title}`
      + (source.summary ? `\n   Summary: ${source.summary.slice(0, 400)}` : ""))
    .join("\n");
  const expectations = [
    `Expected behaviour: ${testCase.expect === "refuse"
      ? "the assistant should REFUSE or clearly state its sources do not cover this / the premise is not found, without asserting substantive rules."
      : "the assistant should ANSWER substantively."}`,
    testCase.mustMention?.length
      ? `Facts that must be present (semantically, not verbatim): ${testCase.mustMention.join(" | ")}`
      : null,
    testCase.mustNotMention?.length
      ? `Content that must NOT be asserted as fact: ${testCase.mustNotMention.join(" | ")}`
      : null,
    knownSources
      ? `LEGITIMATE SOURCES the assistant retrieved and may reference freely (references to these, their document numbers, their sections, or their dates are NOT invented):\n${knownSources}`
      : null,
  ].filter(Boolean).join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: "You are a strict evaluator of a compliance assistant's answer. "
            + "Decide: (1) refused — did the answer decline to provide the requested rule or figure, or state that its sources do not cover or specify it? "
            + "Count it as refused even when the answer adds context, quotes what the sources DO say, or points to the official portal — as long as the requested substantive value itself is not asserted. "
            + "(2) mentionsAll — are ALL required facts present (semantic match)? Use true when no required facts are listed. "
            + "(3) assertsForbidden — does the answer ASSERT any forbidden content as fact? "
            + "Read the surrounding sentence before deciding: stating, correcting, quoting or DENYING the forbidden content is NOT asserting it. "
            + "Example — forbidden content 'confirmation of a thirty-day deposit window'; answer says 'your understanding that employers get thirty days is incorrect; the period is fifteen days' → assertsForbidden is FALSE, because the answer denies it. "
            + "Set it TRUE only where the answer presents the forbidden content as the correct position. "
            + "(4) inventedReferences — count of specific circulars/sections/notifications asserted as authority that are NOT among the legitimate retrieved sources listed, NOT in the question, and NOT in the required facts. References to listed sources (including their sections, numbers, and dates) are never invented. "
            + "Reply with JSON only: {\"refused\":bool,\"mentionsAll\":bool,\"assertsForbidden\":bool,\"inventedReferences\":number,\"note\":\"<15 words\"}",
        }],
      },
      contents: [{
        role: "user",
        parts: [{ text: `QUESTION:\n${testCase.query}\n\n${expectations}\n\nANSWER:\n${answer.slice(0, 6_000)}` }],
      }],
      generationConfig: {
        temperature: 0,
        // Thinking tokens are drawn from this same budget — it must comfortably
        // exceed thinkingBudget or the JSON verdict is truncated mid-string.
        maxOutputTokens: 1_536,
        responseMimeType: "application/json",
        // The refused/assertsForbidden distinctions need reasoning: a shallow read
        // scores a DENIAL of forbidden content as an assertion of it.
        thinkingConfig: { thinkingBudget: 512 },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `judge HTTP ${response.status}`);
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
  return JSON.parse(text);
}

function extractCitationIds(text) {
  const ids = [];
  for (const group of text.match(/\[[^\]]*?\bS\d+\b[^\]]*?\]/g) ?? []) {
    for (const id of group.match(/\bS\d+\b/g) ?? []) ids.push(id);
  }
  return ids;
}

function scoreCase(testCase, run, judge) {
  const failures = [];
  const markers = extractCitationIds(run.text);
  const available = new Set((run.retrieval?.sources ?? []).map((source) => source.citationId));
  const invalidMarkers = [...new Set(markers.filter((marker) => !available.has(marker)))];
  const citedSourceIds = new Set(
    (run.retrieval?.sources ?? [])
      .filter((source) => markers.includes(source.citationId))
      .map((source) => source.sourceId),
  );

  // FABRICATIONS are silent failures the user cannot see — zero tolerance:
  // invalid citation markers, invented references, asserting forbidden content.
  let fabrications = 0;
  if (invalidMarkers.length) {
    fabrications += invalidMarkers.length;
    failures.push(`invalid citation markers: ${invalidMarkers.join(", ")}`);
  }
  // The production verifier checked every cited sentence against the actual
  // evidence; when it fully verified the answer, the judge's weaker text-only view
  // of "invented references" is overridden. A refusal is likewise exempt: naming the
  // statute or portal the professional should consult is guidance, not fabricated
  // authority — the refusal itself asserts nothing.
  const invented = run.verification?.state === "verified" || judge.refused
    ? 0
    : judge.inventedReferences ?? 0;
  fabrications += invented;
  if (invented > 0) failures.push(`judge: ${invented} invented reference(s)`);
  // assertsForbidden is only meaningful when the case actually lists forbidden content.
  if (judge.assertsForbidden && testCase.mustNotMention?.length) {
    fabrications += 1;
    failures.push("judge: asserts forbidden content");
  }
  // OVERREACH: claims the production verifier confirmed (two passes) as not
  // entailed by the evidence. These are VISIBLY flagged to the professional in the
  // UI, so they are reported and tracked but are warnings, not case failures.
  // Conversational/meta answers describe the assistant itself — exempt.
  const overreach = testCase.category === "conversational" || testCase.expect !== "answer"
    ? 0
    : (run.verification?.flagged ?? []).filter((flag) => flag.verdict === "unsupported").length;
  const warnings = [];
  if (overreach) warnings.push(`verifier flags ${overreach} claim(s) for professional check`);

  // expect "any": refusing OR answering are both acceptable (e.g. injection-laced
  // questions) — only hallucination and forbidden-content checks apply.
  if (testCase.expect === "refuse" && !judge.refused) failures.push("expected refusal, got substantive answer");
  if (testCase.expect === "answer" && judge.refused) failures.push("expected answer, got refusal");
  // Required facts and sources are enforced whenever the case names them — including
  // on "any" cases, where refusing is acceptable but stating the rule wrongly is not.
  if (!judge.refused) {
    if (testCase.mustMention?.length && !judge.mentionsAll) failures.push("missing required fact(s)");
    if (testCase.expectedSourceIds?.length
      && !testCase.expectedSourceIds.some((sourceId) => citedSourceIds.has(sourceId))) {
      failures.push(`did not cite any expected source (cited: ${[...citedSourceIds].join(", ") || "none"})`);
    }
  }

  return {
    id: testCase.id,
    category: testCase.category,
    passed: failures.length === 0,
    fabrications,
    overreach,
    citationMarkers: markers.length,
    invalidMarkers: invalidMarkers.length,
    verification: run.verification?.state ?? "none",
    failures,
    warnings,
    note: judge.note ?? "",
  };
}

async function main() {
  await loadLocalEnv();
  const options = parseArgs();
  const spec = JSON.parse(await readFile(casesPath, "utf8"));
  let cases = spec.cases;
  if (options.category) cases = cases.filter((testCase) => testCase.category === options.category);
  cases = cases.slice(0, options.limit);
  if (!cases.length) throw new Error("No evaluation cases selected.");

  process.stdout.write(`Evaluating ${cases.length} cases against ${options.base} …\n`);
  const results = new Array(cases.length);
  let cursor = 0;
  async function worker() {
    while (cursor < cases.length) {
      const index = cursor;
      cursor += 1;
      const testCase = cases[index];
      try {
        // The gateway can hang or drop a request; that is an infrastructure fault,
        // not an answer fault. Retry transport failures with backoff so flakiness
        // never masquerades as a failing case.
        let run;
        for (let attempt = 1; ; attempt += 1) {
          try {
            run = await askAssistant(options.base, testCase);
            break;
          } catch (transportError) {
            const message = transportError instanceof Error ? transportError.message : String(transportError);
            const retryable = /timeout|fetch failed|could not prepare|aborted|ECONNRESET|socket/i.test(message);
            if (!retryable || attempt >= 3) throw transportError;
            process.stdout.write(`  … retry ${attempt}/2 for ${testCase.id} (${message.slice(0, 60)})\n`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 4_000));
          }
        }
        // One retry: a malformed judge verdict is an instrument hiccup, and must not
        // be recorded as a failure of the answer under test.
        const judge = await judgeAnswer(testCase, run.text, run.retrieval?.sources)
          .catch(() => judgeAnswer(testCase, run.text, run.retrieval?.sources));
        results[index] = scoreCase(testCase, run, judge);
      } catch (error) {
        results[index] = {
          id: testCase.id,
          category: testCase.category,
          passed: false,
          fabrications: 0,
          overreach: 0,
          citationMarkers: 0,
          invalidMarkers: 0,
          verification: "error",
          failures: [`run failed: ${error instanceof Error ? error.message : String(error)}`],
          warnings: [],
          note: "",
        };
      }
      const result = results[index];
      process.stdout.write(
        `${result.passed ? "PASS" : "FAIL"} [${result.category}] ${result.id}`
          + `${result.failures.length ? ` — ${result.failures.join("; ")}` : ""}`
          + `${result.warnings.length ? ` (warn: ${result.warnings.join("; ")})` : ""}\n`,
      );
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency, cases.length) }, () => worker()));

  const failed = results.filter((result) => !result.passed);
  const totalFabrications = results.reduce((total, result) => total + result.fabrications, 0);
  const totalOverreach = results.reduce((total, result) => total + result.overreach, 0);
  const totalMarkers = results.reduce((total, result) => total + result.citationMarkers, 0);
  const totalInvalid = results.reduce((total, result) => total + result.invalidMarkers, 0);
  const refusalCases = results.filter((result) => result.category === "false-premise" || result.category === "out-of-corpus");
  const refusalPassed = refusalCases.filter((result) => result.passed).length;

  process.stdout.write("\n──────── Summary ────────\n");
  process.stdout.write(`Cases: ${results.length}  Passed: ${results.length - failed.length}  Failed: ${failed.length}\n`);
  process.stdout.write(`Fabrications (headline, must be 0): ${totalFabrications}\n`);
  process.stdout.write(`Overreach flagged for professional check: ${totalOverreach} claim(s)\n`);
  process.stdout.write(
    `Citation precision: ${totalMarkers ? (((totalMarkers - totalInvalid) / totalMarkers) * 100).toFixed(1) : "100.0"}%`
      + ` (${totalMarkers - totalInvalid}/${totalMarkers} markers valid)\n`,
  );
  process.stdout.write(`Refusal correctness: ${refusalPassed}/${refusalCases.length}\n`);
  const byCategory = new Map();
  for (const result of results) {
    const entry = byCategory.get(result.category) ?? { passed: 0, total: 0 };
    entry.total += 1;
    if (result.passed) entry.passed += 1;
    byCategory.set(result.category, entry);
  }
  for (const [category, entry] of [...byCategory.entries()].sort()) {
    process.stdout.write(`  ${category}: ${entry.passed}/${entry.total}\n`);
  }

  // Gate: silent fabrications are intolerable; refusal discipline must hold; the
  // overall pass rate must stay high. Verifier-confirmed overreach is tracked
  // (visible to the professional in the UI) but does not fail the gate alone.
  const passRate = (results.length - failed.length) / results.length;
  const refusalFailures = refusalCases.length - refusalPassed;
  if (totalFabrications > 0 || refusalFailures > 0 || passRate < 0.9) process.exitCode = 1;
}

await main();
