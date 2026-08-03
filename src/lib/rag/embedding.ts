// Query embeddings for hybrid retrieval.
//
// The AI Gateway does not proxy embeddings, so these use the direct Google API.
// The key is optional: when GOOGLE_GENERATIVE_AI_API_KEY is absent, retrieval
// degrades to lexical-only (see rag/scoring). Any failure returns null rather
// than throwing, so a transient embedding error never breaks an answer.

interface EmbeddingResponse {
  embedding?: { values?: number[] };
  error?: { message?: string };
}

function safeEmbeddingModel(value: string | undefined) {
  const fallback = "gemini-embedding-2";
  return value && /^[a-zA-Z0-9._-]+$/.test(value) ? value : fallback;
}

export function getEmbeddingApiKey(): string | null {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || null;
}

export async function embedRegulatoryQuery(query: string, apiKey: string) {
  const model = safeEmbeddingModel(process.env.REGMITRA_EMBEDDING_MODEL);
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`;
  const requestBody = {
    model: `models/${model}`,
    content: {
      parts: [{ text: `task: question answering | query: ${query}` }],
    },
    outputDimensionality: 768,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = (await response.json()) as EmbeddingResponse;
    if (response.ok && Array.isArray(payload.embedding?.values)) {
      return payload.embedding.values;
    }
    return null;
  } catch {
    return null;
  }
}
