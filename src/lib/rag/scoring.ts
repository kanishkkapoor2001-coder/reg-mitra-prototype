import type { RegulatoryChunk } from "@/lib/rag/types";

const stopWords = new Set([
  "a", "about", "after", "all", "also", "an", "and", "any", "are", "as", "at", "be",
  "been", "before", "by", "can", "could", "date", "do", "does", "for", "from", "has",
  "have", "how", "i", "if", "in", "is", "it", "me", "my", "of", "on", "or", "our",
  "please", "should", "so", "that", "the", "their", "this", "to", "under", "was", "we",
  "what", "when", "where", "which", "who", "why", "will", "with", "would",
]);

const synonymGroups = [
  ["gst", "cgst", "gstr", "tax"],
  ["tds", "deductor", "deductee", "certificate"],
  ["epf", "epfo", "provident", "ecr"],
  ["rbi", "reserve", "bank", "nbfc"],
  ["mca", "company", "companies", "corporate"],
  ["fssai", "food", "safety", "fbo"],
  ["microfinance", "mfi", "qualifying", "assets"],
  ["fifo", "fefo", "storage", "inventory"],
  ["audit", "auditing", "assurance", "engagement"],
  ["sqm", "quality", "sqc"],
  ["din", "document", "identification"],
  ["rfn", "reference", "number"],
  ["condone", "condonation", "delay", "late"],
  ["circular", "notification", "announcement", "guidance"],
  ["appeal", "appellate", "review", "revision"],
];

const supportedRegulatorySignals = /\b(gst|gstr|cgst|cbic|gstn|din|rfn|dggi|income tax|tds|itr|cbdt|deductor|deductee|challan|advance tax|form 10a|form 10ab|section 12a|section 80g|charitable trust|sovereign wealth fund|audit|auditing|assurance|icai|sqm|sqc|accounting standard|sebi|securities|demat|dematerialisation|rta|epf|epfo|provident|ecr|mca|companies act|cin|llpin|rbi|nbfc|fssai|food safety|labour law|professional tax)\b/i;

export function hasSupportedRegulatorySignal(query: string) {
  return supportedRegulatorySignals.test(query);
}

function stem(token: string) {
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .match(/[a-z0-9]+/g)
    ?.map(stem)
    .filter((token) => token.length > 1 && !stopWords.has(token)) ?? [];
}

export function expandQueryTokens(query: string) {
  const base = new Set(tokenize(query));
  for (const group of synonymGroups) {
    if (group.some((token) => base.has(token))) {
      for (const token of group) base.add(token);
    }
  }
  return [...base];
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function authorityBoost(query: string, authority: string) {
  const normalised = query.toLowerCase();
  const target = authority.toLowerCase();
  if (normalised.includes(target)) return 0.14;
  if (/\b(gst|gstr|rfn|din|dggi|cgst)\b/.test(normalised) && /cbic|gstn/.test(target)) return 0.1;
  if (/\b(income tax|tds|12a|80g|10a|10ab|deductor)\b/.test(normalised)
    && /cbdt|income tax/.test(target)) return 0.1;
  if (/\b(audit|auditing|assurance|sqm|sqc|accounting standard)\b/.test(normalised)
    && target.includes("icai")) return 0.1;
  if (/\b(sebi|securities|demat|rta|mutual fund|aif)\b/.test(normalised)
    && target.includes("sebi")) return 0.1;
  if (/\b(epf|epfo|provident|ecr)\b/.test(normalised) && target.includes("epfo")) return 0.1;
  if (/\b(rbi|reserve bank|nbfc|microfinance|mfi|qualifying assets|chief compliance officer|cco)\b/.test(normalised)
    && target.includes("rbi")) return 0.1;
  if (/\b(mca|companies act|company law|cin|llpin|registrar of companies|roc)\b/.test(normalised)
    && target.includes("mca")) return 0.1;
  if (/\b(fssai|food safety|food business|fbo|street vendor|calcium carbide|ethylene|fifo|fefo)\b/.test(normalised)
    && target.includes("fssai")) return 0.1;
  return 0;
}

function metadataBoost(query: string, chunk: RegulatoryChunk) {
  const normalised = query.toLowerCase();
  const haystack = [
    chunk.documentNumber,
    chunk.title,
    chunk.applicability,
    ...chunk.topics,
  ].filter(Boolean).join(" ").toLowerCase();
  const queryTokens = tokenize(query);
  const metadataTokens = new Set(tokenize(haystack));
  const overlap = queryTokens.filter((token) => metadataTokens.has(token)).length;
  let score = Math.min(0.16, overlap * 0.025) + authorityBoost(query, chunk.authority);

  const circularNumber = normalised.match(/\b(?:circular\s*(?:no\.?)?\s*)?(\d{1,3})\s*\/\s*(\d{2,4})\b/);
  if (circularNumber && haystack.includes(`${circularNumber[1]}/${circularNumber[2]}`)) score += 0.32;
  if (normalised.includes(chunk.title.toLowerCase())) score += 0.2;

  const asksCurrent = /\b(current|currently|today|latest|now|effective|applicable)\b/.test(normalised);
  if (chunk.status === "active") score += asksCurrent ? 0.08 : 0.035;
  if (chunk.status === "historical") score += asksCurrent ? -0.16 : -0.035;
  if (chunk.status === "superseded") score -= 0.22;
  if (chunk.status === "index") score -= 0.1;
  if (chunk.sourceKind === "official-full-text") score += 0.045;
  if (chunk.sourceKind === "official-index-text") score -= 0.06;
  return score;
}

export function scoreRegulatoryChunks(
  query: string,
  chunks: readonly RegulatoryChunk[],
  queryEmbedding: readonly number[] | null,
) {
  const queryTokens = expandQueryTokens(query);
  const queryTermFrequency = new Map<string, number>();
  for (const token of queryTokens) {
    queryTermFrequency.set(token, (queryTermFrequency.get(token) ?? 0) + 1);
  }

  const documentTokens = chunks.map((chunk) => tokenize(
    `${chunk.title} ${chunk.documentNumber ?? ""} ${chunk.applicability} ${chunk.topics.join(" ")} ${chunk.content}`,
  ));
  const documentFrequency = new Map<string, number>();
  for (const tokens of documentTokens) {
    const unique = new Set(tokens);
    for (const token of unique) {
      if (queryTermFrequency.has(token)) {
        documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
      }
    }
  }

  const averageLength =
    documentTokens.reduce((total, tokens) => total + tokens.length, 0) / Math.max(1, chunks.length);
  const lexicalRaw = chunks.map((chunk, index) => {
    const tokens = documentTokens[index] ?? [];
    const frequencies = new Map<string, number>();
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    let score = 0;
    for (const token of queryTokens) {
      const frequency = frequencies.get(token) ?? 0;
      if (!frequency) continue;
      const idf = Math.log(1 + (chunks.length - (documentFrequency.get(token) ?? 0) + 0.5)
        / ((documentFrequency.get(token) ?? 0) + 0.5));
      const denominator = frequency + 1.2 * (0.25 + 0.75 * tokens.length / Math.max(1, averageLength));
      score += idf * (frequency * 2.2 / denominator);
    }
    return score;
  });
  const maxLexical = Math.max(...lexicalRaw, 0.0001);

  return chunks.map((chunk, index) => {
    const lexical = (lexicalRaw[index] ?? 0) / maxLexical;
    const rawSemantic = queryEmbedding && chunk.embedding.length === queryEmbedding.length
      ? cosineSimilarity(queryEmbedding, chunk.embedding)
      : 0;
    const semantic = Math.max(0, Math.min(1, (rawSemantic - 0.22) / 0.58));
    const metadata = metadataBoost(query, chunk);
    const score = queryEmbedding
      ? semantic * 0.52 + lexical * 0.34 + metadata
      : lexical * 0.82 + metadata;

    return {
      chunk,
      score: Math.max(0, score),
      lexical,
      semantic,
      metadata,
    };
  }).sort((left, right) => right.score - left.score);
}
