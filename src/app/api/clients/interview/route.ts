import { NextResponse } from "next/server";
import { gatewayGenerateContent, getGatewayConfig, safeModelName } from "@/lib/ai/gateway";
import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition } from "@/lib/radar/facts";
import { ASSISTANT_BURST, callerKey, checkRateLimit } from "@/lib/rate-limit";
import { getCurrentWorkspace } from "@/lib/workspace";

// A conversation that builds a client profile, one question at a time.
//
// A single "describe the client" box asks a CA to remember, unprompted, which
// of thirteen attributes matter — so it gets a sector and a state and stops.
// The interview knows what is still missing and asks for it: which is what
// actually fills a profile the radar can match against.
//
// Each turn returns the next question AND everything understood so far, so the
// profile visibly builds up beside the conversation and the CA can see exactly
// what is about to be recorded. Still a proposal until they press create.

export const runtime = "nodejs";

const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;

// Asked in this order when nothing else decides it: the attributes the most
// rules turn on come first, so a short conversation is still a useful profile.
const PRIORITY = [
  "company.sector",
  "company.entity_type",
  "company.registered_state",
  "company.annual_turnover_inr",
  "company.gst_registered",
  "company.gst_scheme",
  "company.deducts_tds",
  "company.employee_count",
];

type Turn = { role: "user" | "assistant"; content: string };

function coerce(raw: unknown): Record<string, string | number | boolean | string[]> {
  const out: Record<string, string | number | boolean | string[]> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const definition of DEFINITIONS) {
    const value = (raw as Record<string, unknown>)[definition.key];
    if (value === undefined || value === null || value === "") continue;
    switch (definition.valueType) {
      case "boolean":
        if (typeof value === "boolean") out[definition.key] = value;
        break;
      case "number": {
        const parsed = typeof value === "number" ? value : Number(String(value).replace(/[, ]/g, ""));
        if (Number.isFinite(parsed) && parsed >= 0) out[definition.key] = parsed;
        break;
      }
      case "string_list": {
        const list = (Array.isArray(value) ? value : String(value).split(","))
          .map((item) => String(item).trim().toUpperCase().replaceAll(" ", "_"))
          .filter(Boolean)
          .filter((item) => !definition.allowedValues || definition.allowedValues.includes(item));
        if (list.length) out[definition.key] = list;
        break;
      }
      default: {
        const text = String(value).trim();
        if (!text) break;
        if (definition.allowedValues) {
          const upper = text.toUpperCase().replaceAll(" ", "_");
          if (definition.allowedValues.includes(upper)) out[definition.key] = upper;
        } else out[definition.key] = text;
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production"
    && process.env.REGMITRA_ENABLE_LIVE_AI !== "true"
  ) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: "no_workspace" }, { status: 403 });

  const limited = checkRateLimit(callerKey(request, "interview"), ASSISTANT_BURST);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const config = getGatewayConfig();
  if (!config) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let turns: Turn[] = [];
  let known: Record<string, unknown> = {};
  try {
    const body = await request.json();
    turns = Array.isArray(body?.turns)
      ? body.turns.slice(-16).map((t: { role?: string; content?: unknown }) => ({
        role: t?.role === "assistant" ? "assistant" as const : "user" as const,
        content: String(t?.content ?? "").slice(0, 2000),
      }))
      : [];
    known = (body?.facts ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const missing = DEFINITIONS.filter((d) => known[d.key] === undefined);
  const missingByPriority = [
    ...PRIORITY.filter((key) => missing.some((d) => d.key === key)),
    ...missing.map((d) => d.key).filter((key) => !PRIORITY.includes(key)),
  ];

  const schema = DEFINITIONS.map((d) => {
    const allowed = d.allowedValues ? ` one of: ${d.allowedValues.join(", ")}` : ` (${d.valueType})`;
    return `- ${d.key}:${allowed} — ${d.question}`;
  }).join("\n");

  const instruction = [
    "You are onboarding a new client for an Indian chartered accountancy firm. You are talking to the CA,",
    "not to the client. Your job is to fill in a factual profile by asking about it.",
    "",
    "Rules for the conversation:",
    "- Ask ONE question per turn. Short, plain, no preamble, no lists of options unless genuinely needed.",
    "- Ask about what is still missing, most important first. Never re-ask something already known.",
    "- Accept vague answers. 'Around 40 crore' is fine. 'Not sure' is a real answer — record nothing",
    "  for that attribute, say you will leave it blank, and move on. Never press twice.",
    "- A CA is busy. Combine two closely related things in one question when natural",
    "  (GST registered and which scheme, for example).",
    "- When the important attributes are answered or the CA wants to stop, say the profile is ready",
    "  and set complete to true.",
    "",
    "Return JSON only, no prose outside it, with exactly these keys:",
    '  "reply": your next question, or the closing line — one or two sentences',
    '  "facts": an object of any attributes this latest answer established',
    '  "legal_name" and "display_name": strings, if named',
    '  "complete": boolean',
    "",
    "Only include a fact the CA actually stated. Never infer, never guess, never fill a default —",
    "a missing fact is expected, a wrong one is worse than nothing because a regulatory rule will be",
    "evaluated against it. Use each key only for what its own question asks;",
    "company.registered_state is an Indian state, never a GST scheme.",
    "Turnover is rupees as a plain number: '40 crore' is 400000000.",
    "",
    "Attributes:",
    schema,
    "",
    `Already known (do not ask again): ${Object.keys(known).length ? Object.keys(known).join(", ") : "nothing yet"}`,
    `Still missing, in priority order: ${missingByPriority.join(", ") || "nothing"}`,
  ].join("\n");

  const contents = turns.length
    ? turns.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] }))
    : [{ role: "user", parts: [{ text: "Start. Ask me about the client." }] }];

  try {
    const { status, payload } = await gatewayGenerateContent(
      config,
      safeModelName(process.env.REGMITRA_LLM_MODEL),
      {
        systemInstruction: { parts: [{ text: instruction }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 900, responseMimeType: "application/json" },
      },
      { timeoutMs: 30_000 },
    );

    if (status < 200 || status >= 300) {
      console.error("[interview] gateway responded", status, payload.error?.message);
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      reply: typeof parsed.reply === "string" ? parsed.reply.slice(0, 600) : "Tell me about the client.",
      facts: coerce(parsed.facts),
      legalName: typeof parsed.legal_name === "string" ? parsed.legal_name.trim().slice(0, 240) : "",
      displayName: typeof parsed.display_name === "string" ? parsed.display_name.trim().slice(0, 160) : "",
      complete: parsed.complete === true,
    });
  } catch (error) {
    console.error("[interview] threw", error);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
