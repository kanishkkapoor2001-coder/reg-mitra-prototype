// Pre-flight computation pass.
//
// Before the answer streams, one fast gateway call decides whether the question
// needs a statutory computation and extracts its parameters. The arithmetic itself
// then runs in code (calculators.ts) and the verified working is injected into the
// answer prompt as evidence.
//
// Why not native tool-calling mid-stream: a round trip would stall the stream, and
// the model would still be free to restate the number. This way the figure the
// professional sees is the figure the code produced.

import {
  gatewayGenerateContent,
  type GatewayConfig,
} from "@/lib/ai/gateway";
import {
  calculatorDeclarations,
  formatComputation,
  isKnownCalculator,
  runCalculator,
  type ComputationOutcome,
} from "@/lib/tools/registry";

const PLAN_TIMEOUT_MS = 8_000;
const MAX_COMPUTATIONS = 3;

/** Cheap gate: skip the planning call entirely for questions with no numeric shape. */
export function mightNeedComputation(query: string): boolean {
  const normalised = query.toLowerCase();
  const hasComputeVerb = /\b(comput|calculat|work out|how much|what will|quantum|total|payable|liable to pay|arrive at)\w*\b/.test(normalised);
  const hasStatutoryHook = /\b(234a|234b|234c|234f|201\(1a\)|section 50|section 47|late fee|interest|penalty|due date|instal?ment|advance tax|deadline|by when)\b/.test(normalised);
  const hasFigureOrDate = /(₹|rs\.?\s*\d|\b\d{4,}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b)/.test(normalised);
  // "When is GSTR-3B due for the July quarter?" has neither a compute verb nor the
  // literal phrase "due date", but is squarely a due-date question.
  const asksWhenDue = /\b(when|last date|cut ?off)\b/.test(normalised)
    && /\b(due|file|filing|furnish|pay|deposit|deadline)\w*\b/.test(normalised);
  const namesAReturn = /\b(gstr[- ]?\d[ab]?|itr|form \d+[a-z]{0,2}|advance tax|tds return)\b/.test(normalised);
  return (hasComputeVerb && hasStatutoryHook)
    || (hasStatutoryHook && hasFigureOrDate)
    || asksWhenDue
    || (namesAReturn && /\b(due|deadline|when)\b/.test(normalised));
}

export interface ComputationPlan {
  outcomes: ComputationOutcome[];
  /** Evidence block for the answering model, or null when nothing was computed. */
  evidence: string | null;
}

const EMPTY_PLAN: ComputationPlan = { outcomes: [], evidence: null };

export async function planComputations(
  config: GatewayConfig,
  model: string,
  query: string,
  today: string,
  /** Practice/client facts, so a parameter the question omits but the roster holds
   *  (State, filing frequency, presumptive status) can still populate a calculator. */
  practiceContext?: string | null,
): Promise<ComputationPlan> {
  if (!mightNeedComputation(query)) return EMPTY_PLAN;

  try {
    const { status, payload } = await gatewayGenerateContent(config, model, {
      systemInstruction: {
        parts: [{
          text: [
            "You route Indian compliance questions to deterministic calculators. You never compute anything yourself.",
            `Today's date is ${today}. Convert every date to YYYY-MM-DD. Convert Indian number words: 1 lakh = 100000, 1 crore = 10000000.`,
            "Call a function ONLY when the question asks for a figure or date that a listed calculator produces AND the question supplies the required parameters.",
            "If a required parameter is missing or must be assumed, do NOT call the function — reply with the single word NONE so the assistant can ask for the missing fact.",
            "If the question is conceptual (what the rule is, whether something applies), reply NONE.",
            "Parameters may come from the question OR from the supplied client facts — a State, filing frequency or presumptive-taxation status on record is a known parameter, not an assumption.",
          ].join(" "),
        }],
      },
      contents: [{
        role: "user",
        parts: [{
          text: practiceContext
            ? `${query.slice(0, 2_000)}\n\n---\nKnown client facts on record:\n${practiceContext.slice(0, 1_500)}`
            : query.slice(0, 2_000),
        }],
      }],
      tools: [{ functionDeclarations: calculatorDeclarations }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 512,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }, { timeoutMs: PLAN_TIMEOUT_MS });

    if (status < 200 || status >= 300) return EMPTY_PLAN;

    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    const outcomes: ComputationOutcome[] = [];
    for (const part of parts) {
      const call = part.functionCall;
      if (!call?.name || !isKnownCalculator(call.name)) continue;
      outcomes.push(runCalculator(call.name, call.args ?? {}));
      if (outcomes.length >= MAX_COMPUTATIONS) break;
    }
    if (!outcomes.length) return EMPTY_PLAN;

    return {
      outcomes,
      evidence: outcomes.map(formatComputation).join("\n\n"),
    };
  } catch {
    // A planning failure must never block an answer — the assistant simply
    // answers without a computed figure.
    return EMPTY_PLAN;
  }
}
