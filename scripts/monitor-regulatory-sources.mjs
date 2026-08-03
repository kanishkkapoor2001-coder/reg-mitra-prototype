// Daily regulatory source monitor.
//
// Re-fetches every registry source, diffs the extracted text against the current
// corpus by content hash, and writes data/regulatory/pending-changes.json plus a
// console report. Detection is automated; classification (new / amending /
// superseding) stays human: review the report, update the registry (status,
// supersedes/amends edges, new entries), then run corpus:build.
//
// Exit code: 0 = no changes, 2 = changes or unreachable sources detected (useful
// for cron/CI alerting). Run locally or wire into a scheduled GitHub Action.

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const projectRoot = resolve(import.meta.dirname, "..");
const registryPath = join(projectRoot, "data/regulatory/source-registry.json");
const corpusPath = join(projectRoot, "data/regulatory/corpus.json");
const reportPath = join(projectRoot, "data/regulatory/pending-changes.json");
const execFileAsync = promisify(execFile);

const browserHeaders = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

function decodeEntities(value) {
  const entities = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
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

// Must match the build script's normaliseText exactly — the change baseline is a
// hash of the build's normalised text.
function normaliseText(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(buffer) {
  const directory = await mkdtemp(join(tmpdir(), "regmitra-monitor-"));
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

async function fetchText(url) {
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
  if (text.length < 80) throw new Error("no extractable text (bot challenge or scanned document?)");
  return text;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  const corpus = JSON.parse(await readFile(corpusPath, "utf8"));

  // Baseline: the build-time hash of the normalised official text (schema v2).
  // Sources built before officialTextHash existed fall back to "always changed",
  // which self-heals on the next corpus:build.
  const baseline = new Map();
  for (const source of corpus.sources ?? []) {
    baseline.set(source.id, {
      hash: source.officialTextHash ?? null,
      ingestionState: source.ingestionState,
    });
  }

  const checkedAt = new Date().toISOString();
  const entries = await mapWithConcurrency(registry.sources, 4, async (source) => {
    const urls = [source.canonicalUrl, ...(source.mirrorUrls ?? [])];
    for (const url of urls) {
      try {
        const text = await fetchText(url);
        const currentHash = hash(text);
        const previous = baseline.get(source.id);
        const changed = previous?.hash ? previous.hash !== currentHash : previous?.ingestionState === "full-text";
        return {
          id: source.id,
          authority: source.authority,
          status: changed ? "changed" : "unchanged",
          url,
          textLength: text.length,
        };
      } catch (error) {
        if (url === urls[urls.length - 1]) {
          return {
            id: source.id,
            authority: source.authority,
            status: "unreachable",
            url,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }
    return { id: source.id, authority: source.authority, status: "unreachable", url: source.canonicalUrl };
  });

  const changed = entries.filter((entry) => entry.status === "changed");
  const unreachable = entries.filter((entry) => entry.status === "unreachable");
  const report = {
    checkedAt,
    corpusGeneratedAt: corpus.generatedAt ?? null,
    totals: { sources: entries.length, changed: changed.length, unreachable: unreachable.length },
    changed,
    unreachable,
    nextSteps: changed.length || unreachable.length
      ? "Review each changed source, classify the change (new / amending / superseding), update source-registry.json (status, supersedes/amends, new entries), then run: npm run corpus:build && npm run rag:evaluate"
      : "No action needed.",
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  process.stdout.write(`Checked ${entries.length} sources at ${checkedAt}\n`);
  process.stdout.write(`Changed: ${changed.length}  Unreachable: ${unreachable.length}  Unchanged: ${entries.length - changed.length - unreachable.length}\n`);
  for (const entry of changed) process.stdout.write(`  CHANGED     ${entry.id} (${entry.url})\n`);
  for (const entry of unreachable) process.stdout.write(`  UNREACHABLE ${entry.id} — ${entry.error ?? ""}\n`);
  process.stdout.write(`Report written to ${reportPath}\n`);
  if (changed.length || unreachable.length) process.exitCode = 2;
}

await main();
