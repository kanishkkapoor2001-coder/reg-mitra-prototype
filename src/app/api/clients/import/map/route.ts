import { NextResponse } from "next/server";
import { gatewayGenerateContent, getGatewayConfig, safeModelName } from "@/lib/ai/gateway";
import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition } from "@/lib/radar/facts";
import { ASSISTANT_BURST, callerKey, checkRateLimit } from "@/lib/rate-limit";
import { getCurrentWorkspace } from "@/lib/workspace";

// Works out what a spreadsheet's columns mean — once, for the whole file.
//
// Every firm's export is shaped differently: Tally writes one set of headers,
// Zoho another, and a partner's own Excel says "T/O (Cr)" and "GST Type". A
// fixed importer would need the CA to hand-map thirteen attributes before
// importing anything, which is the same wall that left client profiles empty.
//
// So the model reads the HEADER ROW plus two sample rows and returns a mapping.
// Rows are then parsed against that mapping deterministically in lib/clients/csv
// — one model call per file rather than per row, so a 500-client export costs
// the same as a 5-client one and every row is parsed identically.
//
// The mapping is shown to the CA before anything is imported. Guessing which
// column is turnover is a judgement; writing it into a client's profile is not.

export const runtime = "nodejs";

const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production"
    && process.env.REGMITRA_ENABLE_LIVE_AI !== "true"
  ) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: "no_workspace" }, { status: 403 });

  const limited = checkRateLimit(callerKey(request, "import-map"), ASSISTANT_BURST);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const config = getGatewayConfig();
  if (!config) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let headers: string[] = [];
  let samples: string[][] = [];
  try {
    const body = await request.json();
    headers = Array.isArray(body?.headers)
      ? body.headers.map((h: unknown) => String(h).slice(0, 120)).slice(0, 60)
      : [];
    samples = Array.isArray(body?.samples)
      ? body.samples.slice(0, 3).map((row: unknown) =>
        Array.isArray(row) ? row.map((c: unknown) => String(c).slice(0, 120)) : [])
      : [];
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!headers.length) return NextResponse.json({ error: "no_headers" }, { status: 400 });

  const targets = [
    '- "legal_name": the registered entity name',
    '- "display_name": the short name the firm uses',
    ...DEFINITIONS.map((d) => `- "${d.key}": ${d.question}`),
    '- "ignore": anything else — notes, balances, contact details, internal codes',
  ].join("\n");

  const instruction = [
    "You map the columns of an Indian accounting firm's client spreadsheet onto a fixed set of targets.",
    "",
    'Return JSON only: an object whose keys are the EXACT column headers given, and whose values are one target string.',
    'Every header must appear exactly once. Use "ignore" when a column is not one of the targets —',
    "that is the common case and it is the right answer, not a failure.",
    "",
    "Never map two columns to the same target. If two could fit, pick the better one and ignore the other.",
    "Judge by the header and the sample values together: a column called \"Type\" could be entity type or",
    "GST scheme, and only the samples say which.",
    "",
    "Targets:",
    targets,
  ].join("\n");

  const table = [
    `Headers: ${JSON.stringify(headers)}`,
    ...samples.map((row, index) => `Sample row ${index + 1}: ${JSON.stringify(row)}`),
  ].join("\n");

  try {
    const { status, payload } = await gatewayGenerateContent(
      config,
      safeModelName(process.env.REGMITRA_LLM_MODEL),
      {
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text: table }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1500, responseMimeType: "application/json" },
      },
      { timeoutMs: 30_000 },
    );

    if (status < 200 || status >= 300) {
      console.error("[import/map] gateway responded", status, payload.error?.message);
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    let proposed: Record<string, unknown>;
    try {
      proposed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    // Trust nothing: only real headers, only real targets, and never the same
    // target twice — two columns writing one fact is a silent overwrite.
    const validTargets = new Set(["legal_name", "display_name", "ignore", ...DEFINITIONS.map((d) => d.key)]);
    const used = new Set<string>();
    const mapping: Record<string, string> = {};

    for (const header of headers) {
      const raw = proposed[header];
      const target = typeof raw === "string" ? raw : "ignore";
      if (!validTargets.has(target) || target === "ignore") { mapping[header] = "ignore"; continue; }
      if (used.has(target)) { mapping[header] = "ignore"; continue; }
      used.add(target);
      mapping[header] = target;
    }

    return NextResponse.json({ mapping });
  } catch (error) {
    console.error("[import/map] threw", error);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
