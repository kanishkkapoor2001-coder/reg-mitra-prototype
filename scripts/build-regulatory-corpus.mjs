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

// Patterns that open a new statutory/circular unit. Order matters: the first match names the unit.
const unitPatterns = [
  { pattern: /^(?:Section|Sec\.?)\s+(\d+[A-Z]{0,3})\b/i, label: (m) => `Section ${m[1]}` },
  { pattern: /^(?:Rule)\s+(\d+[A-Z]{0,3})\b/i, label: (m) => `Rule ${m[1]}` },
  { pattern: /^(?:Regulation|Reg\.?)\s+(\d+[A-Z]{0,3})\b/i, label: (m) => `Regulation ${m[1]}` },
  { pattern: /^(?:CHAPTER|Chapter)\s+([IVXLC]+|\d+)\b/, label: (m) => `Chapter ${m[1]}` },
  { pattern: /^(?:Annexure|Appendix|Schedule)\s*[-—:]?\s*([A-Z0-9]{0,4})/i, label: (m) => `Annexure ${m[1] ?? ""}`.trim() },
  { pattern: /^(\d{1,2}(?:\.\d{1,2}){0,2})[.)]\s+\S/, label: (m) => `para ${m[1]}` },
  { pattern: /^Q\s*(?:No\.?\s*)?(\d{1,3})[.):]/i, label: (m) => `Q${m[1]}` },
];

// Acts and rules number their units bare at line start ("50.", "74A.", "169.").
// Label those as the statutory unit so "section 50" queries hit the exact-unit
// boost and the sectionPath reads like the profession cites it.
const statutoryUnitPatterns = {
  act: { pattern: /^(\d{1,3}[A-Z]{0,3})\.\s+\S/, label: (m) => `Section ${m[1]}` },
  rules: { pattern: /^(\d{1,3}[A-Z]{0,3})\.\s+\S/, label: (m) => `Rule ${m[1]}` },
};

function detectUnitHeading(paragraph, documentType) {
  const statutory = statutoryUnitPatterns[documentType];
  if (statutory) {
    const match = paragraph.match(statutory.pattern);
    if (match) return statutory.label(match);
  }
  for (const { pattern, label } of unitPatterns) {
    const match = paragraph.match(pattern);
    if (match) return label(match);
  }
  return null;
}

/**
 * Structure-aware chunking: statutory/circular units (sections, rules, numbered
 * paras, FAQ questions) open a new chunk, so one legal unit stays one retrievable
 * unit with a stable sectionPath. Oversized units are split with the unit label
 * carried over; tiny fragments merge forward into the open unit.
 */
function chunkStatutoryUnits(text, documentType, targetSize = 1_900, hardMax = 2_400) {
  const paragraphs = normaliseText(text)
    .split(/\n{2,}|(?<=[.!?])\s+(?=(?:Section|Rule|Regulation|CHAPTER|Chapter)\s+\d)/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 30);
  const units = [];
  let current = { path: null, body: "" };

  const push = () => {
    if (current.body.length >= 30) units.push(current);
  };

  for (const paragraph of paragraphs) {
    const heading = detectUnitHeading(paragraph, documentType);
    const wouldOverflow = current.body.length + paragraph.length + 2 > targetSize;
    if ((heading && current.body) || (wouldOverflow && current.body)) {
      push();
      current = { path: heading ?? current.path, body: paragraph };
      continue;
    }
    current = {
      path: current.path ?? heading,
      body: current.body ? `${current.body}\n\n${paragraph}` : paragraph,
    };
  }
  push();

  // Split any unit that still exceeds the hard cap, keeping its path with a part marker.
  const chunks = [];
  for (const unit of units) {
    if (unit.body.length <= hardMax) {
      chunks.push(unit);
      continue;
    }
    const sentences = unit.body.split(/(?<=[.!?])\s+/);
    let part = "";
    let partIndex = 1;
    for (const sentence of sentences) {
      if (part && part.length + sentence.length + 1 > targetSize) {
        chunks.push({ path: unit.path ? `${unit.path} (part ${partIndex})` : null, body: part });
        partIndex += 1;
        part = sentence;
      } else {
        part = part ? `${part} ${sentence}` : sentence;
      }
    }
    if (part.length >= 30) {
      chunks.push({
        path: unit.path && partIndex > 1 ? `${unit.path} (part ${partIndex})` : unit.path,
        body: part,
      });
    }
  }
  // Full statutes need room for every section; other documents stay tightly capped.
  const chunkCap = documentType === "act" || documentType === "rules" ? 400 : 72;
  return chunks.slice(0, chunkCap);
}

/**
 * Deterministic contextual header stored alongside each chunk. Scoring and future
 * embeddings read header + content; displayed excerpts stay raw. This anchors every
 * chunk to its document identity, status, and effective date at retrieval time.
 */
function buildContextHeader(source, sectionPath) {
  return [
    `${source.authority} ${source.documentNumber ?? source.documentType}`,
    source.title,
    sectionPath ? `unit: ${sectionPath}` : null,
    `status: ${source.status}`,
    source.effectiveFrom ? `effective: ${source.effectiveFrom}` : null,
    source.applicability,
  ].filter(Boolean).join(" | ");
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

// Several official portals (incometaxindia.gov.in, mca.gov.in) sit behind anti-bot
// filters that 403 non-browser user agents. These headers mirror a real browser.
const browserHeaders = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

async function fetchWithSystemCurl(url) {
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
        browserHeaders["User-Agent"],
        "--header",
        `Accept: ${browserHeaders.Accept}`,
        "--header",
        `Accept-Language: ${browserHeaders["Accept-Language"]}`,
        "--output",
        output,
        url,
      ],
      {
        maxBuffer: 20 * 1024 * 1024,
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
      fetchedUrl: url,
      contentType: isPdf ? "application/pdf" : "text/html",
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function fetchOneUrl(url) {
  const response = await fetch(url, {
    headers: browserHeaders,
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
}

async function fetchOfficialText(source) {
  // canonicalUrl first, then any official mirrors listed in the registry.
  const candidates = [source.canonicalUrl, ...(source.mirrorUrls ?? [])];
  const errors = [];
  for (const candidate of candidates) {
    const url = new URL(candidate);
    if (!allowedHosts.has(url.hostname)) {
      errors.push(`${url.hostname}: not allow-listed`);
      continue;
    }
    try {
      return await fetchOneUrl(candidate);
    } catch (fetchError) {
      try {
        return await fetchWithSystemCurl(candidate);
      } catch (curlError) {
        errors.push(
          `${candidate}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}; `
            + `curl: ${curlError instanceof Error ? curlError.message : String(curlError)}`,
        );
      }
    }
  }
  throw new Error(errors.join(" | "));
}

function toChunk(source, content, index, kind, checkedAt, sectionPath = null) {
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
    sectionPath,
    contextHeader: buildContextHeader(source, sectionPath),
    supersedes: source.supersedes ?? [],
    supersededBy: source.supersededBy ?? null,
    amendedBy: source.amendedBy ?? [],
    checkedAt,
    content,
    contentHash: hash(content),
    embedding: [],
  };
}

async function ingestSource(source, checkedAt, previousText) {
  const chunks = [toChunk(source, source.seedText, 0, "curated-summary", checkedAt)];
  try {
    const fetched = await fetchOfficialText(source);
    const officialTextChunks = chunkStatutoryUnits(fetched.text, source.documentType);
    const sourceKind = source.status === "index" ? "official-index-text" : "official-full-text";
    chunks.push(
      ...officialTextChunks.map((unit, index) =>
        toChunk(source, unit.body, index, sourceKind, checkedAt, unit.path)),
    );
    return {
      source: {
        ...source,
        checkedAt,
        fetchedUrl: fetched.fetchedUrl,
        contentType: fetched.contentType,
        ingestionState: "full-text",
        chunkCount: chunks.length,
        // Hash of the normalised official text as fetched — the change-detection
        // baseline for scripts/monitor-regulatory-sources.mjs.
        officialTextHash: hash(fetched.text),
      },
      chunks,
      warning: null,
    };
  } catch (error) {
    // Last-known-good fallback: a portal outage or new bot-challenge must not
    // silently degrade the corpus. Reuse the previous build's official text for
    // this source, re-chunked under the current schema, and say so in a warning.
    const cachedText = previousText?.get(source.id);
    if (cachedText) {
      const officialTextChunks = chunkStatutoryUnits(cachedText.text, source.documentType);
      const sourceKind = source.status === "index" ? "official-index-text" : "official-full-text";
      chunks.push(
        ...officialTextChunks.map((unit, index) =>
          toChunk(source, unit.body, index, sourceKind, cachedText.checkedAt, unit.path)),
      );
      return {
        source: {
          ...source,
          checkedAt,
          fetchedUrl: cachedText.fetchedUrl,
          contentType: cachedText.contentType,
          ingestionState: "full-text",
          chunkCount: chunks.length,
          officialTextHash: cachedText.officialTextHash ?? hash(cachedText.text),
        },
        chunks,
        warning: `${source.id}: refetch failed, using cached official text from ${cachedText.checkedAt.slice(0, 10)}`
          + ` (${error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160)})`,
      };
    }
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
  for (const source of registry.sources) {
    for (const field of ["id", "authority", "publisher", "documentType", "title", "status", "applicability", "canonicalUrl", "seedText"]) {
      if (!source[field]) throw new Error(`Source ${source.id ?? "?"} is missing required field "${field}".`);
    }
    if (!Array.isArray(source.topics) || !source.topics.length) {
      throw new Error(`Source ${source.id} needs a non-empty topics array.`);
    }
  }

  // Resolve supersession edges: a source declaring `supersedes: [ids]` stamps each
  // target with a reciprocal `supersededBy` reference, so retrieval can annotate the
  // superseded document with its successor and effective date.
  const byId = new Map(registry.sources.map((source) => [source.id, source]));
  for (const source of registry.sources) {
    for (const targetId of source.supersedes ?? []) {
      const target = byId.get(targetId);
      if (!target) {
        throw new Error(`${source.id} declares supersedes "${targetId}" which is not in the registry.`);
      }
      target.supersededBy = {
        sourceId: source.id,
        documentNumber: source.documentNumber ?? null,
        title: source.title,
        effectiveFrom: source.effectiveFrom ?? null,
      };
    }
    for (const targetId of source.amends ?? []) {
      const target = byId.get(targetId);
      if (!target) {
        throw new Error(`${source.id} declares amends "${targetId}" which is not in the registry.`);
      }
      target.amendedBy = [
        ...(target.amendedBy ?? []),
        {
          sourceId: source.id,
          documentNumber: source.documentNumber ?? null,
          title: source.title,
          effectiveFrom: source.effectiveFrom ?? null,
        },
      ];
    }
  }

  let previousCorpus = null;
  try {
    previousCorpus = JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    // A previous corpus is optional.
  }
  // Last-known-good official text per source, reconstructed from the previous
  // build's non-summary chunks, used when a refetch fails (see ingestSource).
  const previousText = new Map();
  for (const previousSource of previousCorpus?.sources ?? []) {
    if (previousSource.ingestionState !== "full-text") continue;
    const textChunks = (previousCorpus?.chunks ?? []).filter(
      (chunk) => chunk.sourceId === previousSource.id && chunk.sourceKind !== "curated-summary",
    );
    if (!textChunks.length) continue;
    previousText.set(previousSource.id, {
      text: textChunks.map((chunk) => chunk.content).join("\n\n"),
      checkedAt: previousSource.checkedAt ?? previousCorpus?.generatedAt ?? new Date().toISOString(),
      fetchedUrl: previousSource.fetchedUrl ?? null,
      contentType: previousSource.contentType ?? null,
      officialTextHash: previousSource.officialTextHash ?? null,
    });
  }

  const checkedAt = new Date().toISOString();
  const ingested = await mapWithConcurrency(
    registry.sources,
    4,
    (source) => ingestSource(source, checkedAt, previousText),
  );
  const sources = ingested.map((entry) => entry.source);
  let chunks = ingested.flatMap((entry) => entry.chunks);
  const warnings = ingested.flatMap((entry) => entry.warning ? [entry.warning] : []);
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
    schemaVersion: 2,
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
