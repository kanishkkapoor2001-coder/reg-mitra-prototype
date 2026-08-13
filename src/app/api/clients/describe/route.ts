import { NextResponse } from "next/server";
import { gatewayGenerateContent, getGatewayConfig, safeModelName } from "@/lib/ai/gateway";
import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition } from "@/lib/radar/facts";
import { ASSISTANT_BURST, callerKey, checkRateLimit } from "@/lib/rate-limit";
import { getCurrentWorkspace } from "@/lib/workspace";

// Turns a sentence about a client into the facts the matcher can act on.
//
// The create form collects two of the thirteen attributes rules are written
// against, and the other eleven decide most applicability — turnover for a
// threshold, GST scheme for a return, entity type for a filing. Asking a CA to
// fill thirteen typed fields before they have a client is the reason they stay
// empty; describing the client in a sentence is not.
//
// This only ever PROPOSES. Nothing is saved here: the extracted values go back
// to the form for the CA to correct and submit. facts.ts is explicit that facts
// are recorded, never guessed, and a model reading prose is a guess until a
// person confirms it.

export const runtime = "nodejs";

type Extracted = Record<string, string | number | boolean | string[]>;

// The registry is declared with a helper that preserves literal types, so
// `allowedValues` is absent from the members that do not set it. Reading it
// through the declared interface makes it uniformly optional.
const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;

function schemaForPrompt(): string {
  return DEFINITIONS.map((definition) => {
    const allowed = definition.allowedValues
      ? ` one of: ${definition.allowedValues.join(", ")}`
      : ` (${definition.valueType})`;
    return `- ${definition.key}:${allowed} — ${definition.question}`;
  }).join("\n");
}

/** Drops anything the model invented, mistyped, or answered outside the registry. */
function coerce(raw: unknown): Extracted {
  const out: Extracted = {};
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
        } else {
          out[definition.key] = text;
        }
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: "no_workspace" }, { status: 403 });

  // Same burst cap as the assistant: this is a gateway call behind a text box.
  const limited = checkRateLimit(callerKey(request, "describe"), ASSISTANT_BURST);
  if (!limited.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const config = getGatewayConfig();
  if (!config) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let description = "";
  try {
    const body = await request.json();
    description = typeof body?.description === "string" ? body.description.trim().slice(0, 4000) : "";
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (description.length < 10) return NextResponse.json({ error: "too_short" }, { status: 400 });

  const instruction = [
    "You read a short description of an Indian accounting client and extract only the facts it states.",
    "",
    "Return JSON only — no prose, no code fence. One key per fact you are confident the text states.",
    "OMIT any key the text does not clearly state. Never infer, never guess, never fill a default.",
    "A missing fact is correct and expected; a wrong one is worse than nothing, because a",
    "regulatory rule will be evaluated against it.",
    "",
    // Without these two lines the model filed the GST scheme under the state:
    // registered_state has no allowed values, so nothing downstream would have
    // caught it, and state notifications would then be matched on "REGULAR".
    "Use each key only for what its own question asks. Never put one attribute's value under another key.",
    "company.registered_state is an Indian state name or two-letter code, never a GST scheme.",
    "",
    "Turnover is in rupees as a plain number: '40 crore' is 400000000, '25 lakh' is 2500000.",
    "",
    "Attributes:",
    schemaForPrompt(),
    "",
    "Also return \"display_name\" and \"legal_name\" as plain strings if the text names the client.",
  ].join("\n");

  try {
    const { status, payload } = await gatewayGenerateContent(
      config,
      safeModelName(process.env.REGMITRA_LLM_MODEL),
      {
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text: description }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1200, responseMimeType: "application/json" },
      },
      { timeoutMs: 30_000 },
    );

    if (status < 200 || status >= 300) {
      console.error("[describe] gateway responded", status, payload.error?.message);
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[describe] model did not return JSON");
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    const record = (parsed ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      facts: coerce(record),
      legalName: typeof record.legal_name === "string" ? record.legal_name.trim().slice(0, 160) : "",
      displayName: typeof record.display_name === "string" ? record.display_name.trim().slice(0, 120) : "",
    });
  } catch (error) {
    console.error("[describe] threw", error);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
