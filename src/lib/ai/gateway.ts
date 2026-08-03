// AI Gateway transport (Vertex-proxied Gemini).
//
// Chat + streaming route through the DigitalOcean AI Gateway rather than calling
// Google directly. The gateway is a Vertex passthrough with two quirks discovered
// in testing: the method separator MUST be URL-encoded ("%3A", not ":"), and the
// project must be the provider key's service-account project. Embeddings are NOT
// proxied by the gateway — those still use the direct Google API (see rag/embedding).

export interface GatewayConfig {
  baseUrl: string;
  key: string;
  project: string;
  location: string;
}

export interface GeminiFunctionCall {
  name?: string;
  args?: Record<string, unknown>;
}

export interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
}

export interface GeminiCandidate {
  content?: { parts?: GeminiPart[]; role?: string };
  finishReason?: string;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; code?: number; status?: string };
}

export interface GeminiInlineData {
  mimeType: string;
  /** Base64-encoded bytes. */
  data: string;
}

export type GeminiContentPart =
  | { text: string }
  | { inlineData: GeminiInlineData };

export interface GeminiRequest {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: Array<{ role: string; parts: GeminiContentPart[] }>;
  generationConfig?: Record<string, unknown>;
  /** Function declarations the model may call. Execution always happens in our code. */
  tools?: Array<{ functionDeclarations: unknown[] }>;
  toolConfig?: Record<string, unknown>;
}

export interface StreamChunk {
  text: string;
  finishReason?: string;
  blockReason?: string;
}

const MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function safeModelName(value: string | undefined, fallback = "gemini-2.5-flash"): string {
  return value && MODEL_PATTERN.test(value) ? value : fallback;
}

export function getGatewayConfig(): GatewayConfig | null {
  const baseUrl = process.env.REGMITRA_AI_GATEWAY_URL?.trim().replace(/\/+$/, "");
  const key = process.env.REGMITRA_AI_GATEWAY_KEY?.trim();
  const project = process.env.REGMITRA_VERTEX_PROJECT?.trim();
  const location = process.env.REGMITRA_VERTEX_LOCATION?.trim() || "global";
  if (!baseUrl || !key || !project) return null;
  return { baseUrl, key, project, location };
}

type GatewayMethod = "generateContent" | "streamGenerateContent";

function buildGatewayUrl(config: GatewayConfig, model: string, method: GatewayMethod): string {
  const safeModel = encodeURIComponent(safeModelName(model));
  // The colon before the method is intentionally the literal "%3A": the gateway's
  // path parser mishandles a raw ":" and returns 404 "endpoint not supported".
  const path =
    `/v1/vertex/v1beta1/projects/${encodeURIComponent(config.project)}` +
    `/locations/${encodeURIComponent(config.location)}` +
    `/publishers/google/models/${safeModel}%3A${method}`;
  const query = method === "streamGenerateContent" ? "?alt=sse" : "";
  return `${config.baseUrl}${path}${query}`;
}

function authHeaders(config: GatewayConfig): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.key}`,
  };
}

/** Single-shot generation (used for short helper calls: query rewrite, titling). */
export async function gatewayGenerateContent(
  config: GatewayConfig,
  model: string,
  request: GeminiRequest,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ status: number; payload: GeminiResponse }> {
  const controller = options.signal ? null : new AbortController();
  const signal = options.signal ?? AbortSignal.timeout(options.timeoutMs ?? 30_000);
  const response = await fetch(buildGatewayUrl(config, model, "generateContent"), {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify(request),
    signal,
  });
  controller?.abort();
  const payload = (await response.json().catch(() => ({}))) as GeminiResponse;
  return { status: response.status, payload };
}

/**
 * Streaming generation. Yields text deltas as they arrive. The first thrown error
 * carries the upstream status/message so the caller can surface it to the client.
 */
export async function* streamGatewayContent(
  config: GatewayConfig,
  model: string,
  request: GeminiRequest,
  options: { signal?: AbortSignal } = {},
): AsyncGenerator<StreamChunk> {
  const response = await fetch(buildGatewayUrl(config, model, "streamGenerateContent"), {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify(request),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    const errorPayload = (await response.json().catch(() => ({}))) as GeminiResponse;
    const error = new Error(errorPayload.error?.message || `Gateway responded ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const rawLine = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!rawLine.startsWith("data:")) continue;
        const json = rawLine.slice(5).trim();
        if (!json || json === "[DONE]") continue;

        let parsed: GeminiResponse;
        try {
          parsed = JSON.parse(json) as GeminiResponse;
        } catch {
          continue;
        }
        const candidate = parsed.candidates?.[0];
        const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
        const blockReason = parsed.promptFeedback?.blockReason;
        if (text || candidate?.finishReason || blockReason) {
          yield { text, finishReason: candidate?.finishReason, blockReason };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
