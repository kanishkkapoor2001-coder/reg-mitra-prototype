// Presentation of machine vocabulary.
//
// Client facts store canonical enum values ("FINANCIAL_SERVICES",
// "PRIVATE_LIMITED") because the rule matcher compares them byte-for-byte.
// Screens were rendering those raw, so a client read as "FINANCIAL_SERVICES ·
// KA" beside a hand-typed "Pharma · MH". One function, used everywhere a
// sector or entity type is shown to a person.

const SPECIAL: Record<string, string> = {
  // Initialisms and names that sentence-casing would mangle.
  LLP: "LLP",
  NBFC: "NBFC",
  FOOD: "Food",
  OTHER: "Other",
};

export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "";
  // Already human text (has lowercase): leave it exactly as typed.
  if (/[a-z]/.test(value)) return value;
  if (SPECIAL[value]) return SPECIAL[value];
  const words = value.split(/[_\s]+/).filter(Boolean);
  return words
    .map((word, index) => {
      if (SPECIAL[word]) return SPECIAL[word];
      const lower = word.toLowerCase();
      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
}

/**
 * Rows arrive labelled — "GSTR-1 · Sharma Pharma" — which names a thing rather
 * than asking for an act. A queue is read fastest when every line starts with
 * the verb, so the eye can skim what to DO down the left edge.
 */
export function asInstruction(title: string, client: string): string {
  const head = title.split("·")[0]?.trim() ?? title;
  if (/^apply:/i.test(head)) return head.replace(/^apply:\s*/i, "Apply ");
  const verb = /statement|return|gstr|itr|form|tds\b/i.test(head)
    ? "File"
    : /deposit|payment|challan/i.test(head)
      ? "Pay"
      : /epf|esi|pf\b/i.test(head)
        ? "File"
        : "Complete";
  return client && client !== "Firm-wide" ? `${verb} ${head} — ${client}` : `${verb} ${head}`;
}
