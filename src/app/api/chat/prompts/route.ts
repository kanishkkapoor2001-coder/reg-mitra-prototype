import { gatewayGenerateContent, getGatewayConfig, safeModelName } from "@/lib/ai/gateway";
import { ASSISTANT_BURST, callerKey, checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { todayInIST } from "@/lib/dates";

// Prompt generator.
//
// Apoorv's point on the 14 Aug review: a CA opening a blank assistant does not
// know what to ask it, so the box stays empty and the product never gets a
// chance to be useful. The fix is not a library of generic prompts — it is
// questions about THIS firm's clients, which is the one thing a generic tool
// cannot offer.
//
// So the model is given the real client book (names, sectors, states) plus any
// half-typed intent, and asked for questions that name those clients. With no
// workspace and no gateway it still returns something useful rather than
// failing: see FALLBACK_PROMPTS.

export const runtime = "nodejs";
export const maxDuration = 30;

const FALLBACK_PROMPTS = [
  "What changed in GST for my clients this month, and who does it affect?",
  "Which of my clients has a filing due in the next 14 days?",
  "Explain the latest RBI circular and tell me which clients it applies to.",
  "What do I need to verify before advising a client on a new registration?",
];

function sanitizeIntent(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 400) : "";
}

/** Model output is free text; keep only clean, question-shaped, deduped lines. */
function parsePrompts(text: string): string[] {
  const seen = new Set<string>();
  const prompts: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine
      .replace(/^\s*[-*•]\s*/, "")
      .replace(/^\s*\d+[.)]\s*/, "")
      .replace(/^["“]|["”]$/g, "")
      .trim();
    if (line.length < 12 || line.length > 220) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    prompts.push(line);
    if (prompts.length === 4) break;
  }
  return prompts;
}

export async function POST(request: Request) {
  const verdict = checkRateLimit(callerKey(request, "chat-prompts"), ASSISTANT_BURST);
  if (!verdict.allowed) {
    return Response.json({ prompts: FALLBACK_PROMPTS }, { status: 200 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const intent = sanitizeIntent((body as { intent?: unknown })?.intent);
  const mode = (body as { mode?: unknown })?.mode === "act" ? "act" : "ask";

  const gatewayConfig = getGatewayConfig();
  const liveAiReady = Boolean(gatewayConfig)
    && (process.env.NODE_ENV !== "production" || process.env.REGMITRA_ENABLE_LIVE_AI === "true");
  if (!gatewayConfig || !liveAiReady) {
    return Response.json({ prompts: FALLBACK_PROMPTS });
  }

  const workspace = await getCurrentWorkspace();
  let clientLines = "";
  if (workspace) {
    const supabase = await createSupabaseServerClient();
    const { data: clients } = await supabase
      .from("clients")
      .select("display_name, sector, state_code")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .limit(25);
    clientLines = (clients ?? [])
      .map((client) => `- ${client.display_name} (${client.sector ?? "sector unknown"}, ${client.state_code ?? "state unknown"})`)
      .join("\n");
  }

  const instruction = [
    "You help an Indian chartered accountant phrase a question for a compliance research assistant.",
    `Today is ${todayInIST()}.`,
    mode === "act"
      ? "Write requests to PREPARE something: a checklist, a client note, a filing plan."
      : "Write questions that ASK for a sourced explanation of law as it stands.",
    "",
    "Rules:",
    "- Return exactly 4 lines. One question per line. No numbering, no bullets, no preamble.",
    "- Each must be specific and answerable — name a statute, form, return, or deadline where you can.",
    clientLines
      ? "- Name real clients from the list below in at least two of them. Use their sector and state."
      : "- The firm has no clients recorded yet, so keep them general to Indian compliance practice.",
    "- Never invent a client, a circular number, a rate or a due date. Ask about them instead.",
    "",
    clientLines ? `The firm's clients:\n${clientLines}` : "",
    intent ? `\nThe CA has started typing this — sharpen it into 4 precise alternatives:\n"${intent}"` : "",
  ].filter(Boolean).join("\n");

  try {
    const { payload } = await gatewayGenerateContent(gatewayConfig, safeModelName(process.env.REGMITRA_LLM_MODEL), {
      systemInstruction: { parts: [{ text: instruction }] },
      contents: [{ role: "user", parts: [{ text: intent || "Suggest what I should ask." }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
    }, { timeoutMs: 20_000 });

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const prompts = parsePrompts(text);
    // A short or malformed answer is not worth showing; the fallback is always
    // a usable question.
    return Response.json({ prompts: prompts.length >= 2 ? prompts : FALLBACK_PROMPTS });
  } catch (error) {
    console.error("[chat/prompts] failed", (error as Error)?.message);
    return Response.json({ prompts: FALLBACK_PROMPTS });
  }
}
