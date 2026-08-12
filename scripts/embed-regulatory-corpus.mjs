import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const projectRoot = resolve(import.meta.dirname, "..");
const envPath = join(projectRoot, ".env.local");
const corpusPath = join(projectRoot, "data/regulatory/corpus.json");
const model = process.env.REGMITRA_EMBEDDING_MODEL || "gemini-embedding-2";
const dimensions = 768;
const execFileAsync = promisify(execFile);

async function loadLocalEnv() {
  try {
    const env = await readFile(envPath, "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      const value = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
      process.env[match[1]] = value;
    }
  } catch {
    // The script can also receive the key from the process environment.
  }
}

async function callEmbeddingApi(endpoint, body, apiKey) {
  const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();
  if (response.status !== 401 && response.status !== 403) {
    return { status: response.status, payload };
  }

  const directory = await mkdtemp(join(tmpdir(), "regmitra-embed-"));
  const configPath = join(directory, "curl.conf");
  const requestPath = join(directory, "request.json");
  const responsePath = join(directory, "response.json");
  try {
    await writeFile(requestPath, JSON.stringify(body), { mode: 0o600 });
    await writeFile(
      configPath,
      [
        `url = "${endpoint}"`,
        'request = "POST"',
        'header = "Content-Type: application/json"',
        `header = "x-goog-api-key: ${apiKey}"`,
        `data-binary = "@${requestPath}"`,
        `output = "${responsePath}"`,
        'write-out = "%{http_code}"',
        "silent",
        "show-error",
      ].join("\n"),
      { mode: 0o600 },
    );
    const { stdout } = await execFileAsync("curl", ["--config", configPath], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      status: Number(stdout.trim()),
      payload: JSON.parse(await readFile(responsePath, "utf8")),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 6;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embeds one chunk, retrying the failures that are actually transient.
 *
 * The corpus is ~1,800 chunks against a quota-limited endpoint, so a 429 partway
 * through is the expected case, not the exceptional one. This previously threw on
 * the first non-2xx and `main` had no handler, so a single rate-limit aborted the
 * whole run — which is how the shipped corpus stalled at 21 of 1,826 embedded.
 */
async function embed(content, apiKey) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`;
  const body = {
    model: `models/${model}`,
    content: { parts: [{ text: content }] },
    outputDimensionality: dimensions,
  };

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let result;
    try {
      result = await callEmbeddingApi(endpoint, body, apiKey);
    } catch (error) {
      // Network-level failure (socket reset, timeout) — same backoff as a 5xx.
      lastError = error;
      if (attempt === MAX_ATTEMPTS) break;
      await sleep(Math.min(2 ** attempt * 500, 30_000) + Math.floor(Math.random() * 250));
      continue;
    }

    if (
      result.status >= 200
      && result.status < 300
      && Array.isArray(result.payload.embedding?.values)
    ) {
      return result.payload.embedding.values;
    }

    lastError = new Error(
      result.payload.error?.message || `Embedding request failed with HTTP ${result.status}`,
    );

    // A malformed request or a revoked key will fail identically forever.
    if (!RETRYABLE_STATUSES.has(result.status)) break;
    if (attempt === MAX_ATTEMPTS) break;

    // Exponential backoff with jitter, honouring Retry-After when the API sends it.
    const retryAfter = Number(result.payload.error?.details?.retryDelay?.replace?.("s", ""));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1_000
      : Math.min(2 ** attempt * 500, 30_000);
    await sleep(backoff + Math.floor(Math.random() * 250));
  }

  throw lastError ?? new Error("Embedding failed for an unknown reason.");
}

async function main() {
  await loadLocalEnv();
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");

  const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
  const eligible = corpus.chunks.filter((chunk) => chunk.sourceKind !== "official-index-text");
  const pending = eligible.filter((chunk) => !Array.isArray(chunk.embedding) || chunk.embedding.length === 0);
  const batchSize = 9;
  let completed = eligible.length - pending.length;

  corpus.embeddingModel = model;
  corpus.embeddingDimensions = dimensions;
  process.stdout.write(
    `Embedding ${pending.length} pending chunks (${completed} already complete).\n`,
  );

  const failures = [];

  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);

    // `allSettled`, not `all`: one chunk that fails every retry must not discard
    // the other eight in its batch, nor abandon the several hundred after it.
    const settled = await Promise.allSettled(batch.map((chunk) => embed(
      `title: ${chunk.title} | authority: ${chunk.authority} | applicability: ${chunk.applicability} | text: ${chunk.content}`,
      apiKey,
    )));

    const byId = new Map();
    settled.forEach((outcome, index) => {
      const chunk = batch[index];
      if (outcome.status === "fulfilled") {
        byId.set(chunk.id, outcome.value);
      } else {
        failures.push({ id: chunk.id, reason: outcome.reason?.message ?? String(outcome.reason) });
      }
    });

    if (byId.size) {
      corpus.chunks = corpus.chunks.map((chunk) => ({
        ...chunk,
        embedding: byId.get(chunk.id) ?? chunk.embedding,
      }));
      completed += byId.size;
      corpus.embeddedChunkCount = completed;
      corpus.embeddedAt = new Date().toISOString();
      // Written every batch so an interrupted run resumes instead of restarting.
      await writeFile(corpusPath, `${JSON.stringify(corpus)}\n`);
    }

    process.stdout.write(
      `Embedded ${completed}/${eligible.length} chunks${failures.length ? ` (${failures.length} failed)` : ""}.\n`,
    );
  }

  process.stdout.write(`Stored ${completed} embeddings using ${model}.\n`);

  if (failures.length) {
    // Loud, and a non-zero exit: a partially embedded corpus silently degrades
    // retrieval to lexical-only for whatever did not make it in.
    const preview = failures.slice(0, 5).map((f) => `  ${f.id}: ${f.reason}`).join("\n");
    process.stdout.write(
      `\n${failures.length} chunk(s) still unembedded. Re-run to retry just those.\n${preview}\n`
      + (failures.length > 5 ? `  … and ${failures.length - 5} more\n` : ""),
    );
    process.exitCode = 1;
  }
}

await main();
