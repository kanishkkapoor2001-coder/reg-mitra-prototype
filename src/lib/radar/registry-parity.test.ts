import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { ATTRIBUTE_DEFINITIONS } from "./facts.ts";

// Guards the one coupling that can break the wedge silently.
//
// The newsletter extracts rules against its own attribute registry. If this
// registry drops a key or narrows a vocabulary, rules still import cleanly and
// then match nothing — no error anywhere, just a product that quietly stops
// finding affected clients. That already happened once: AIFI here vs
// ALL_INDIA_FINANCIAL_INSTITUTION there rejected every RBI rule.
//
// Skips (rather than fails) when the newsletter checkout is absent, so CI
// without both repos stays green.

const NEWSLETTER_FACTS = path.resolve(
  import.meta.dirname,
  "../../../../newsletter/src/radar/facts.ts",
);

function readCanonical(): string | null {
  try {
    return readFileSync(NEWSLETTER_FACTS, "utf8");
  } catch {
    return null;
  }
}

function canonicalAttribute(source: string, key: string): { found: boolean; values: string[] } {
  const start = source.indexOf(`key: "${key}"`);
  if (start === -1) return { found: false, values: [] };
  const segment = source.slice(start, start + 900);
  const match = /allowedValues:\s*\[(.*?)\]/s.exec(segment);
  if (!match) return { found: true, values: [] };
  return { found: true, values: [...match[1]!.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]!) };
}

test("product registry keeps every attribute key the newsletter can emit", (t) => {
  const source = readCanonical();
  if (!source) return t.skip("newsletter checkout not present");

  const canonicalKeys = [...source.matchAll(/key: "(company\.[a-z_]+)"/g)].map((m) => m[1]!);
  assert.ok(canonicalKeys.length > 0, "could not read canonical keys");

  const ours = new Set(ATTRIBUTE_DEFINITIONS.map((d) => d.key));
  const missing = canonicalKeys.filter((key) => !ours.has(key));
  assert.deepEqual(missing, [], `missing attribute keys: ${missing.join(", ")}`);
});

test("product vocabularies are a superset of the newsletter's", (t) => {
  const source = readCanonical();
  if (!source) return t.skip("newsletter checkout not present");

  const problems: string[] = [];
  for (const definition of ATTRIBUTE_DEFINITIONS) {
    const canonical = canonicalAttribute(source, definition.key);
    if (!canonical.found || canonical.values.length === 0) continue;

    const ours = new Set("allowedValues" in definition ? definition.allowedValues : []);
    const missing = canonical.values.filter((value) => !ours.has(value));
    if (missing.length) problems.push(`${definition.key}: missing ${missing.join(", ")}`);
  }
  assert.deepEqual(problems, [], problems.join(" | "));
});
