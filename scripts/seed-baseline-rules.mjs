// Baseline applicability rules for the everyday-CA regulators, authored from
// the indexed corpus with verbatim evidence.
//
// The radar shipped knowing only 17 RBI banking rules, so a normal book —
// traders, food businesses, IT companies — matched nothing and the wedge sat
// idle. These rules cover the obligations every practice actually touches
// (GSTR-3B, GSTR-1, TDS, FSSAI licensing), and they hold themselves to the
// pipeline's own bar: every evidence quote must be a verbatim substring of the
// indexed document text or the script refuses to insert it. EPF was considered
// and dropped — the indexed EPFO pages nowhere state the 20-employee threshold,
// and a rule whose evidence does not say what the rule claims is exactly what
// this product exists to prevent.
//
// Idempotent: a source row is keyed by canonical_url, a rule by its source;
// re-running updates nothing and duplicates nothing.
//
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-baseline-rules.mjs

import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...HEADERS, ...init.headers } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const corpus = JSON.parse(readFileSync(join(process.cwd(), "data/regulatory/corpus.json"), "utf8"));
const chunks = corpus.chunks ?? [];

/** All indexed text for a document title, for verbatim-quote verification. */
function documentText(titleFragment) {
  const matching = chunks.filter((chunk) => (chunk.title ?? "").includes(titleFragment));
  if (!matching.length) throw new Error(`No corpus chunks found for "${titleFragment}"`);
  return { text: matching.map((chunk) => chunk.content ?? "").join("\n"), first: matching[0] };
}

const e = () => randomUUID();

const RULES = [
  {
    doc: "FAQs on Form GSTR-3B",
    authority: "GSTN",
    quotes: [{
      id: e(),
      quote: "normal taxpayers and casual taxpayers are required to file Form GSTR-3B.",
      location: "FAQ 2 — Who needs to file Form GSTR-3B?",
    }],
    condition: (ids) => ({
      type: "predicate",
      attribute: "company.gst_registered",
      operator: "equals",
      value: true,
      evidenceIds: [ids[0]],
    }),
    attributes: ["company.gst_registered"],
  },
  {
    doc: "Form GSTR-1 user manual",
    authority: "GSTN",
    quotes: [
      {
        id: e(),
        quote: "Form GSTR-1 is a monthly/quarterly Statement of Outward Supplies to be furnished by all normal and casual registered taxpayers making outward supplies of goods and services or both",
        location: "Para 1 — What is Form GSTR-1?",
      },
      {
        id: e(),
        quote: "Every registered taxable person, other than an input service distributor/ composition taxpayer/ persons liable to deduct tax u/s 51 / persons liable to collect tax u/s 52 is required to file Form GSTR-1",
        location: "Para 1 — Who is required to file Form GSTR-1?",
      },
    ],
    condition: (ids) => ({
      type: "all",
      children: [
        { type: "predicate", attribute: "company.gst_registered", operator: "equals", value: true, evidenceIds: [ids[0]] },
        { type: "predicate", attribute: "company.gst_scheme", operator: "not_equals", value: "COMPOSITION", evidenceIds: [ids[1]] },
      ],
    }),
    attributes: ["company.gst_registered", "company.gst_scheme"],
  },
  {
    doc: "FAQs on Tax Deducted at Source (TDS)",
    authority: "Income Tax Department",
    quotes: [{
      id: e(),
      quote: "the payer has to deduct tax at source on the payments made by him\nand he has to deposit the tax deducted by him to the credit of the Government.",
      location: "Q1 — What is TDS?",
    }],
    condition: (ids) => ({
      type: "predicate",
      attribute: "company.deducts_tds",
      operator: "equals",
      value: true,
      evidenceIds: [ids[0]],
    }),
    attributes: ["company.deducts_tds"],
  },
  {
    doc: "Food Safety and Standards (Licensing and Registration of Food Businesses) Amendment Regulations",
    authority: "FSSAI",
    quotes: [{
      id: e(),
      quote: "food business operator, who manufactures or sells any article of\nfood himself or a petty retailer, street food vendor, hawker, itinerant vendor or temporary stall holder or\nfood truck or distributes foods",
      location: "Para 3 — definition of Petty Food Business Operator",
    }],
    condition: (ids) => ({
      type: "any",
      children: [
        { type: "predicate", attribute: "company.fssai_licensed", operator: "equals", value: true, evidenceIds: [ids[0]] },
        { type: "predicate", attribute: "company.sector", operator: "equals", value: "FOOD", evidenceIds: [ids[0]] },
      ],
    }),
    attributes: ["company.fssai_licensed", "company.sector"],
  },
];

const existingSources = await rest("/rest/v1/regulatory_sources?select=id,canonical_url");
const byUrl = new Map(existingSources.map((row) => [row.canonical_url, row.id]));

let inserted = 0;
for (const rule of RULES) {
  const { text, first } = documentText(rule.doc);

  // The bar: a quote that is not verbatim in the indexed text does not ship.
  for (const evidence of rule.quotes) {
    if (!text.includes(evidence.quote)) {
      throw new Error(`Quote is NOT verbatim in "${rule.doc}" — refusing to seed:\n${evidence.quote}`);
    }
  }

  let sourceId = byUrl.get(first.canonicalUrl);
  if (!sourceId) {
    const [source] = await rest("/rest/v1/regulatory_sources", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        authority: first.authority,
        title: first.title,
        canonical_url: first.canonicalUrl,
        published_at: first.publishedAt ?? null,
        state: "current",
        content_sha256: createHash("sha256").update(text).digest("hex"),
        retrieved_at: first.checkedAt ?? new Date().toISOString(),
        metadata: { seeded: "baseline-rules", corpusDocument: rule.doc },
      }),
    });
    sourceId = source.id;
    byUrl.set(first.canonicalUrl, sourceId);
    console.log(`source + ${first.authority} · ${first.title.slice(0, 60)}`);
  }

  const existingRule = await rest(`/rest/v1/regulatory_rules?select=id&regulatory_source_id=eq.${sourceId}&limit=1`);
  if (existingRule.length) {
    console.log(`rule  = already present for ${rule.doc.slice(0, 50)}`);
    continue;
  }

  const ids = rule.quotes.map((quote) => quote.id);
  await rest("/rest/v1/regulatory_rules", {
    method: "POST",
    body: JSON.stringify({
      regulatory_source_id: sourceId,
      external_document_id: randomUUID(),
      version: 1,
      status: "verified",
      source_completeness: "complete",
      root_condition: rule.condition(ids),
      evidence: rule.quotes.map((quote) => ({ id: quote.id, marker: "1", quote: quote.quote, location: quote.location })),
      attributes: rule.attributes,
      active: true,
    }),
  });
  inserted += 1;
  console.log(`rule  + ${rule.doc.slice(0, 60)}`);
}

console.log(`done — ${inserted} rules inserted`);
