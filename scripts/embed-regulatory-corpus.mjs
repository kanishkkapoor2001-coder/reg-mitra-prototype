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

async function embed(content, apiKey) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`;
  const result = await callEmbeddingApi(endpoint, {
    model: `models/${model}`,
    content: {
      parts: [{ text: content }],
    },
    outputDimensionality: dimensions,
  }, apiKey);
  if (
    result.status < 200
    || result.status >= 300
    || !Array.isArray(result.payload.embedding?.values)
  ) {
    throw new Error(
      result.payload.error?.message || `Embedding request failed with HTTP ${result.status}`,
    );
  }
  return result.payload.embedding.values;
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

  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    const values = await Promise.all(batch.map((chunk) => embed(
      `title: ${chunk.title} | authority: ${chunk.authority} | applicability: ${chunk.applicability} | text: ${chunk.content}`,
      apiKey,
    )));
    const byId = new Map(batch.map((chunk, index) => [chunk.id, values[index]]));
    corpus.chunks = corpus.chunks.map((chunk) => ({
      ...chunk,
      embedding: byId.get(chunk.id) ?? chunk.embedding,
    }));
    completed += batch.length;
    corpus.embeddedChunkCount = completed;
    corpus.embeddedAt = new Date().toISOString();
    await writeFile(corpusPath, `${JSON.stringify(corpus)}\n`);
    process.stdout.write(`Embedded ${completed}/${eligible.length} chunks.\n`);
  }

  process.stdout.write(`Stored ${completed} embeddings using ${model}.\n`);
}

await main();
