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
