import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const projectRoot = resolve(import.meta.dirname, "..");
const registryPath = join(projectRoot, "data/regulatory/source-registry.json");
const outputPath = join(projectRoot, "data/regulatory/corpus.json");
const allowedHosts = new Set([
  "www.incometaxindia.gov.in",
  "www.incometax.gov.in",
  "cbic-gst.gov.in",
  "tutorial.gst.gov.in",
  "www.icai.org",
  "www.sebi.gov.in",
  "www.epfindia.gov.in",
  "www.fssai.gov.in",
  "fssai.gov.in",
  "www.mca.gov.in",
  "www.rbi.org.in",
  "rbi.org.in",
  "m.rbi.org.in",
]);
const execFileAsync = promisify(execFile);

function decodeEntities(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
}

function htmlToText(html) {
  const mainMatch = html.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  const content = mainMatch?.[1] ?? html;
  return decodeEntities(
    content
      .replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normaliseText(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text, targetSize = 1_650, overlap = 220) {
  const paragraphs = normaliseText(text)
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 30);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    if (current.length + paragraph.length + 2 <= targetSize) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }
    chunks.push(current);
    const tail = current.slice(Math.max(0, current.length - overlap));
    current = `${tail}\n\n${paragraph}`;
  }
  if (current.length >= 30) chunks.push(current);
  return chunks.slice(0, 48);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function extractPdf(buffer) {
  const directory = await mkdtemp(join(tmpdir(), "regmitra-corpus-"));
  const pdfPath = join(directory, "source.pdf");
  try {
    await writeFile(pdfPath, buffer);
    const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30_000,
    });
    return normaliseText(stdout);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function fetchWithSystemCurl(source) {
  const directory = await mkdtemp(join(tmpdir(), "regmitra-download-"));
  const output = join(directory, "source");
  try {
    await execFileAsync(
      "curl",
      [
        "--fail",
        "--location",
        "--silent",
        "--show-error",
        "--max-time",
        "25",
        "--user-agent",
        "Mozilla/5.0 RegMitraCorpus/0.1",
        "--output",
        output,
        source.canonicalUrl,
      ],
      {
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      },
    );
    const bytes = await readFile(output);
    if (bytes.length < 80) throw new Error("System download returned too little content");
    const isPdf = bytes.subarray(0, 4).toString() === "%PDF";
    const text = isPdf ? await extractPdf(bytes) : htmlToText(bytes.toString("utf8"));
    if (text.length < 80) throw new Error("System download did not yield enough extractable text");
    return {
      text,
      fetchedUrl: source.canonicalUrl,
      contentType: isPdf ? "application/pdf" : "text/html",
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function fetchOfficialText(source) {
  const url = new URL(source.canonicalUrl);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`Host is not allow-listed: ${url.hostname}`);
  }

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.5",
        "User-Agent": "RegMitraCorpusBot/0.1 (+official-source research)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const bytes = Buffer.from(await response.arrayBuffer());
    const isPdf = contentType.includes("application/pdf") || bytes.subarray(0, 4).toString() === "%PDF";
    const text = isPdf ? await extractPdf(bytes) : htmlToText(bytes.toString("utf8"));
    if (text.length < 80) throw new Error("Official source did not yield enough extractable text");

    return {
      text,
      fetchedUrl: response.url,
      contentType: isPdf ? "application/pdf" : "text/html",
    };
  } catch (fetchError) {
    try {
      return await fetchWithSystemCurl(source);
    } catch (curlError) {
      throw new Error(
        `${fetchError instanceof Error ? fetchError.message : String(fetchError)}; `
          + `curl fallback: ${curlError instanceof Error ? curlError.message : String(curlError)}`,
      );
    }
  }
}

function toChunk(source, content, index, kind, checkedAt) {
  const id = `${source.id}:${kind === "curated-summary" ? "summary" : `text-${String(index + 1).padStart(3, "0")}`}`;
  return {
    id,
    sourceId: source.id,
    authority: source.authority,
    publisher: source.publisher,
    documentType: source.documentType,
    documentNumber: source.documentNumber ?? null,
    title: source.title,
    publishedAt: source.publishedAt ?? null,
    effectiveFrom: source.effectiveFrom ?? null,
    expiresAt: source.expiresAt ?? null,
    status: source.status,
    applicability: source.applicability,
    topics: source.topics,
    canonicalUrl: source.canonicalUrl,
    sourceKind: kind,
    checkedAt,
    content,
    contentHash: hash(content),
    embedding: [],
  };
}

async function ingestSource(source, checkedAt) {
  const chunks = [toChunk(source, source.seedText, 0, "curated-summary", checkedAt)];
  try {
    const fetched = await fetchOfficialText(source);
    const officialTextChunks = chunkText(fetched.text);
    const sourceKind = source.status === "index" ? "official-index-text" : "official-full-text";
    chunks.push(
      ...officialTextChunks.map((content, index) => toChunk(source, content, index, sourceKind, checkedAt)),
    );
    return {
      source: {
        ...source,
        checkedAt,
        fetchedUrl: fetched.fetchedUrl,
        contentType: fetched.contentType,
        ingestionState: "full-text",
        chunkCount: chunks.length,
      },
      chunks,
      warning: null,
    };
  } catch (error) {
    return {
      source: {
        ...source,
        checkedAt,
        fetchedUrl: null,
        contentType: null,
        ingestionState: "summary-only",
        chunkCount: chunks.length,
      },
      chunks,
      warning: `${source.id}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
    throw new Error("The source registry contains no sources.");
  }
  const duplicateIds = registry.sources
    .map((source) => source.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length) throw new Error(`Duplicate source ids: ${duplicateIds.join(", ")}`);

  const checkedAt = new Date().toISOString();
  const ingested = await mapWithConcurrency(
    registry.sources,
    4,
    (source) => ingestSource(source, checkedAt),
  );
  const sources = ingested.map((entry) => entry.source);
  let chunks = ingested.flatMap((entry) => entry.chunks);
  const warnings = ingested.flatMap((entry) => entry.warning ? [entry.warning] : []);
  let previousCorpus = null;
  try {
    previousCorpus = JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    // A previous corpus is optional.
  }
  const previousEmbeddings = new Map(
    (previousCorpus?.chunks ?? [])
      .filter((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
      .map((chunk) => [chunk.contentHash, chunk.embedding]),
  );
  chunks = chunks.map((chunk) => ({
    ...chunk,
    embedding: previousEmbeddings.get(chunk.contentHash) ?? [],
  }));
  const embeddedChunkCount = chunks.filter((chunk) => chunk.embedding.length > 0).length;

  const corpus = {
    schemaVersion: 1,
    generatedAt: checkedAt,
    embeddingModel: embeddedChunkCount ? previousCorpus?.embeddingModel ?? null : null,
    embeddingDimensions: embeddedChunkCount ? previousCorpus?.embeddingDimensions ?? null : null,
    embeddedChunkCount,
    embeddedAt: embeddedChunkCount ? previousCorpus?.embeddedAt ?? null : null,
    sourceCount: sources.length,
    chunkCount: chunks.length,
    fullTextSourceCount: sources.filter((source) => source.ingestionState === "full-text").length,
    summaryOnlySourceCount: sources.filter((source) => source.ingestionState === "summary-only").length,
    authorities: [...new Set(sources.map((source) => source.authority))].sort(),
    sources,
    chunks,
    warnings,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(corpus, null, 2)}\n`);
  process.stdout.write(
    `Built ${corpus.chunkCount} chunks from ${corpus.sourceCount} sources `
      + `(${corpus.fullTextSourceCount} full-text, ${corpus.summaryOnlySourceCount} summary-only).\n`,
  );
  if (warnings.length) {
    process.stdout.write(`Warnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n`);
  }
}

await main();
