// The registry of factual attributes a client company can have, and which
// regulatory rules are allowed to test against.
//
// Ported from `newsletter/src/radar/facts.ts`, which is canonical: the rules
// extracted by the newsletter's ingestion reference these keys by name, so a
// key renamed here silently stops matching. Add keys freely; never rename or
// repurpose one. Kept dependency-free (the newsletter version uses zod).
//
// Facts are recorded, never guessed. A fact is either confirmed by the CA or
// derived from a document the firm already holds — and anything the matcher
// cannot verify stays `unknown` rather than being assumed.

export type FactValue = string | number | boolean | string[] | null;
export type FactValueType = "string" | "number" | "boolean" | "string_list";

export type AttributeDefinition = {
  key: string;
  label: string;
  question: string;
  valueType: FactValueType;
  allowedValues?: readonly string[];
  /** null = does not go stale on its own. */
  expiresAfterDays: number | null;
  why: string;
  /** Grouping for the client profile form. */
  group: "identity" | "scale" | "activity" | "registrations";
};

const definition = <T extends AttributeDefinition>(value: T) => value;

export const ATTRIBUTE_DEFINITIONS = [
  // ---- shared with the newsletter registry: keys must not change ----
  definition({
    key: "company.sector",
    label: "Sector",
    question: "What is the company’s primary sector?",
    valueType: "string",
    allowedValues: [
      "FINANCIAL_SERVICES",
      "BANKING",
      "ENERGY",
      "MANUFACTURING",
      "TECHNOLOGY",
      "RETAIL",
      "FOOD",
      "HEALTHCARE",
      "CONSTRUCTION",
      "LOGISTICS",
      "PROFESSIONAL_SERVICES",
      "CHARITABLE",
      "OTHER",
    ],
    expiresAfterDays: 365,
    why: "Many circulars are addressed to a single sector.",
    group: "identity",
  }),
  definition({
    key: "company.entity_type",
    label: "Entity type",
    question: "What kind of legal entity is it?",
    valueType: "string",
    allowedValues: [
      "PRIVATE_LIMITED",
      "PUBLIC_LIMITED",
      "LLP",
      "PARTNERSHIP",
      "PROPRIETORSHIP",
      "TRUST",
      "SOCIETY",
      "SECTION_8",
      "OTHER",
    ],
    expiresAfterDays: null,
    why: "MCA and Companies Act obligations depend on the entity type.",
    group: "identity",
  }),
  definition({
    key: "company.regulated_entity_type",
    label: "Regulated institution type",
    question: "Is it a regulated institution of a specific kind?",
    valueType: "string",
    allowedValues: [
      "NOT_A_REGULATED_INSTITUTION",
      "COMMERCIAL_BANK",
      "SMALL_FINANCE_BANK",
      "PAYMENTS_BANK",
      "LOCAL_AREA_BANK",
      "URBAN_COOPERATIVE_BANK",
      "RURAL_COOPERATIVE_BANK",
      "REGIONAL_RURAL_BANK",
      "NBFC",
      "AIFI",
      "OTHER",
    ],
    expiresAfterDays: 180,
    why: "RBI circulars are usually addressed to a named class of institution.",
    group: "identity",
  }),
  definition({
    key: "company.registered_state",
    label: "Registered state",
    question: "Which state is the company registered in?",
    valueType: "string",
    expiresAfterDays: null,
    why: "State rules and state GST notifications apply by place of registration.",
    group: "identity",
  }),
  definition({
    key: "company.annual_turnover_inr",
    label: "Annual turnover",
    question: "What was turnover in the latest completed financial year (₹)?",
    valueType: "number",
    expiresAfterDays: 400,
    why: "Turnover thresholds decide GST schemes, audit and e-invoicing duties.",
    group: "scale",
  }),
  definition({
    key: "company.is_listed",
    label: "Listing status",
    question: "Is the company listed on a recognised stock exchange?",
    valueType: "boolean",
    expiresAfterDays: 90,
    why: "SEBI and LODR obligations apply only to listed entities.",
    group: "identity",
  }),
  definition({
    key: "company.regulated_activities",
    label: "Regulated activities",
    question: "Which regulated activities does the company perform?",
    valueType: "string_list",
    expiresAfterDays: 180,
    why: "What a company actually does decides more than its name or sector.",
    group: "activity",
  }),

  // ---- added for CA-firm client books ----
  definition({
    key: "company.gst_registered",
    label: "GST registered",
    question: "Is the company registered under GST?",
    valueType: "boolean",
    expiresAfterDays: null,
    why: "Most CBIC circulars apply only to registered persons.",
    group: "registrations",
  }),
  definition({
    key: "company.gst_scheme",
    label: "GST scheme",
    question: "Which GST scheme is it on?",
    valueType: "string",
    allowedValues: ["REGULAR", "COMPOSITION", "QRMP", "NOT_REGISTERED"],
    expiresAfterDays: 365,
    why: "Return calendars and eligibility differ sharply by scheme.",
    group: "registrations",
  }),
  definition({
    key: "company.employee_count",
    label: "Employees",
    question: "How many people does the company employ?",
    valueType: "number",
    expiresAfterDays: 365,
    why: "EPFO and ESIC coverage start at headcount thresholds.",
    group: "scale",
  }),
  definition({
    key: "company.has_import_export",
    label: "Imports or exports",
    question: "Does the company import or export?",
    valueType: "boolean",
    expiresAfterDays: 365,
    why: "Customs and DGFT notifications only reach traders across the border.",
    group: "activity",
  }),
  definition({
    key: "company.fssai_licensed",
    label: "FSSAI licence",
    question: "Does the company hold an FSSAI licence or registration?",
    valueType: "boolean",
    expiresAfterDays: 365,
    why: "FSSAI amendments apply to licensed food businesses.",
    group: "registrations",
  }),
  definition({
    key: "company.deducts_tds",
    label: "Deducts TDS",
    question: "Does the company deduct tax at source?",
    valueType: "boolean",
    expiresAfterDays: 365,
    why: "TDS rate and return changes only reach deductors.",
    group: "registrations",
  }),
] as const satisfies readonly AttributeDefinition[];

export type AttributeKey = (typeof ATTRIBUTE_DEFINITIONS)[number]["key"];

const definitionsByKey = new Map<string, AttributeDefinition>(
  ATTRIBUTE_DEFINITIONS.map((item) => [item.key, item]),
);

export function getAttributeDefinition(key: string): AttributeDefinition | null {
  return definitionsByKey.get(key) ?? null;
}

export type FactSource = "ca_confirmed" | "derived";

export type CompanyFact = {
  key: AttributeKey | string;
  value: FactValue;
  source: FactSource;
  observedAt: string;
  /** What the value describes, e.g. "FY 2025-26". */
  validForPeriod?: string;
  expiresAt?: string | null;
  /** Where a derived fact came from, e.g. "GSTIN on file". */
  derivedFrom?: string;
};

/** A fact past its expiry is not wrong — it is simply no longer evidence. */
export function isUsableFact(fact: CompanyFact | undefined, now = new Date()): fact is CompanyFact {
  if (!fact) return false;
  if (!fact.expiresAt) return true;
  const expiry = new Date(fact.expiresAt);
  return !Number.isNaN(expiry.getTime()) && expiry >= now;
}

export function isStale(fact: CompanyFact, now = new Date()): boolean {
  return Boolean(fact.expiresAt) && !isUsableFact(fact, now);
}

export function expiryFor(key: string, observedAt: Date): string | null {
  const definition = getAttributeDefinition(key);
  if (!definition || definition.expiresAfterDays === null) return null;
  return new Date(observedAt.getTime() + definition.expiresAfterDays * 86_400_000).toISOString();
}

export function validateFact(fact: CompanyFact): string[] {
  const definition = getAttributeDefinition(fact.key);
  if (!definition) return [`Unknown company fact: ${fact.key}`];
  if (fact.value === null) return [];

  const actualType = Array.isArray(fact.value) ? "string_list" : typeof fact.value;
  if (actualType !== definition.valueType) {
    return [`${fact.key} must be ${definition.valueType}`];
  }
  if (
    definition.allowedValues
    && typeof fact.value === "string"
    && !definition.allowedValues.includes(fact.value)
  ) {
    return [`${fact.key} has an unsupported value`];
  }
  if (definition.valueType === "string_list" && Array.isArray(fact.value)) {
    if (fact.value.some((item) => typeof item !== "string")) {
      return [`${fact.key} must be a list of text values`];
    }
  }
  return [];
}

/** Definitions in form order, grouped. */
export function definitionsByGroup(): Array<{
  group: AttributeDefinition["group"];
  title: string;
  definitions: AttributeDefinition[];
}> {
  const titles: Record<AttributeDefinition["group"], string> = {
    identity: "Identity",
    scale: "Scale",
    registrations: "Registrations",
    activity: "Activity",
  };
  const order: AttributeDefinition["group"][] = ["identity", "registrations", "scale", "activity"];
  return order.map((group) => ({
    group,
    title: titles[group],
    definitions: ATTRIBUTE_DEFINITIONS.filter((item) => item.group === group),
  }));
}
