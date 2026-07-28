import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { clients, workItems } from "@/lib/demo-data";

export const maxDuration = 30;
export const runtime = "nodejs";

type ChatRole = "user" | "assistant";

interface IncomingMessage {
  role: ChatRole;
  content: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
}

const SYSTEM_INSTRUCTIONS = `You are Reg Mitra, an India-focused compliance preparation assistant for professional firms.

Your job is to help a qualified professional understand a question, identify what must be verified, and prepare the next actions. You do not replace legal, tax, accounting, or regulatory judgement.

Rules:
- Treat the supplied workspace data as illustrative demo context only.
- Never claim that a filing, notice response, communication, or approval has been completed.
- Never invent a circular, section, notification, effective date, deadline, or authoritative source.
- If the user asks what the current law is, say that the conclusion must be checked against the issuing authority's current publication.
- Clearly distinguish workspace facts from assumptions.
- Keep answers concise, practical, and under 450 words.
- Use plain text with these exact sections: CONCLUSION, WHAT TO VERIFY, NEXT STEPS, SOURCE STATUS.
- NEXT STEPS should be a short numbered list.
- SOURCE STATUS must state whether an authoritative source was supplied.`;

const WORKSPACE_CONTEXT = JSON.stringify({
  notice: "Illustrative local demo data; no portal or client system is connected.",
  clients: clients.map((client) => ({
    id: client.id,
    name: client.shortName,
    sector: client.sector,
    risk: client.risk,
    pending: client.pending,
    dueThisWeek: client.dueThisWeek,
  })),
  workItems: workItems.map((item) => ({
    title: item.title,
    client: item.client,
    authority: item.authority,
    due: item.due,
    state: item.state,
  })),
});

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" || candidate.role === "assistant")
    && typeof candidate.content === "string"
    && candidate.content.trim().length > 0
    && candidate.content.length <= 6_000
  );
}

function safeModelName(value: string | undefined): string {
  const fallback = "gemini-3.6-flash";
  return value && /^[a-zA-Z0-9._-]+$/.test(value) ? value : fallback;
}

async function callGemini(
  endpoint: string,
  apiKey: string,
  requestBody: unknown,
): Promise<{ status: number; payload: GeminiResponse }> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json() as GeminiResponse;

  if (response.status !== 401) {
    return { status: response.status, payload };
  }

  // AI Studio auth keys can be rejected by Node's HTTP stack on some macOS
  // configurations while succeeding through the system transport.
  const directory = await mkdtemp(join(tmpdir(), "regmitra-chat-"));
  const configPath = join(directory, "curl.conf");
  const requestPath = join(directory, "request.json");
  const responsePath = join(directory, "response.json");

  try {
    await writeFile(requestPath, JSON.stringify(requestBody), { mode: 0o600 });
    await writeFile(
      configPath,
      [
        `url = "${endpoint}"`,
        'request = "POST"',
        'header = "Content-Type: application/json"',
        `header = "x-goog-api-key: ${apiKey}"`,
        `data-binary = "@${requestPath}"`,
        `output = "${responsePath}"`,
        'write-out = "%{http_code}"',
        "silent",
        "show-error",
      ].join("\n"),
      { mode: 0o600 },
    );
    const { stdout } = await promisify(execFile)("curl", ["--config", configPath], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    const fallbackPayload = JSON.parse(
      await readFile(responsePath, "utf8"),
    ) as GeminiResponse;
    return { status: Number(stdout.trim()), payload: fallbackPayload };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI assistance is not configured for this workspace." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request could not be read." }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(rawMessages) || !rawMessages.length || !rawMessages.every(isIncomingMessage)) {
    return Response.json({ error: "Enter a valid compliance question." }, { status: 400 });
  }

  const messages = rawMessages.slice(-10);
  const model = safeModelName(process.env.REGMITRA_LLM_MODEL);
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const geminiResponse = await callGemini(endpoint, apiKey, {
      systemInstruction: {
        parts: [{
          text: `${SYSTEM_INSTRUCTIONS}\n\nLOCAL WORKSPACE CONTEXT:\n${WORKSPACE_CONTEXT}`,
        }],
      },
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1_800,
      },
    });

    if (geminiResponse.status < 200 || geminiResponse.status >= 300) {
      const status = geminiResponse.status === 429 ? 429 : 502;
      return Response.json(
        {
          error: status === 429
            ? "AI assistance is at its current usage limit. Please try again shortly."
            : "Reg Mitra could not prepare an answer. Please try again.",
        },
        { status },
      );
    }

    const payload = geminiResponse.payload;
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      return Response.json(
        {
          error: payload.promptFeedback?.blockReason
            ? "Reg Mitra could not answer that request safely. Try rephrasing it."
            : "Reg Mitra returned an empty answer. Please try again.",
        },
        { status: 502 },
      );
    }

    return Response.json({ text, model });
  } catch {
    return Response.json(
      { error: "AI assistance took too long to respond. Please try again." },
      { status: 504 },
    );
  }
}
