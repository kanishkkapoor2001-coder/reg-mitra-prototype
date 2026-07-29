import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

interface EmbeddingResponse {
  embedding?: { values?: number[] };
  error?: { message?: string };
}

function safeEmbeddingModel(value: string | undefined) {
  const fallback = "gemini-embedding-2";
  return value && /^[a-zA-Z0-9._-]+$/.test(value) ? value : fallback;
}

async function callWithSystemTransport(
  endpoint: string,
  apiKey: string,
  requestBody: unknown,
) {
  const directory = await mkdtemp(join(tmpdir(), "regmitra-query-embedding-"));
  const configPath = join(directory, "curl.conf");
  const requestPath = join(directory, "request.json");
  const responsePath = join(directory, "response.json");
  try {
    await writeFile(requestPath, JSON.stringify(requestBody), { mode: 0o600 });
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
    const { stdout } = await promisify(execFile)("curl", ["--config", configPath], {
      timeout: 12_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      status: Number(stdout.trim()),
      payload: JSON.parse(await readFile(responsePath, "utf8")) as EmbeddingResponse,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function embedRegulatoryQuery(query: string, apiKey: string) {
  const model = safeEmbeddingModel(process.env.REGMITRA_EMBEDDING_MODEL);
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`;
  const requestBody = {
    model: `models/${model}`,
    content: {
      parts: [{ text: `task: question answering | query: ${query}` }],
    },
    outputDimensionality: 768,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json() as EmbeddingResponse;
    if (response.ok && Array.isArray(payload.embedding?.values)) {
      return payload.embedding.values;
    }
    if (response.status !== 401 && response.status !== 403) return null;

    const fallback = await callWithSystemTransport(endpoint, apiKey, requestBody);
    return fallback.status >= 200
      && fallback.status < 300
      && Array.isArray(fallback.payload.embedding?.values)
      ? fallback.payload.embedding.values
      : null;
  } catch {
    return null;
  }
}
