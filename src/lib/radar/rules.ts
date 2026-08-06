import { getAttributeDefinition } from "./facts.ts";

// The applicability rule language, ported from `newsletter/src/radar/rules.ts`
// (canonical). The newsletter *extracts* rules; the product only *consumes*
// them, so this file carries the types plus a strict parser for JSON arriving
// over the export API. Nothing is trusted because it came from our own service:
// a malformed rule is rejected rather than evaluated.
//
// The newsletter version uses zod; the product has no zod dependency, so the
// validation is hand-written and must be kept behaviourally identical.

export const RULE_OPERATORS = [
  "equals",
  "not_equals",
  "one_of",
  "contains_any",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "exists",
] as const;

export type RuleOperator = (typeof RULE_OPERATORS)[number];

export type PredicateValue = string | number | boolean | string[];

export type PredicateRule = {
  type: "predicate";
  attribute: string;
  operator: RuleOperator;
  value?: PredicateValue;
  /** Every predicate must point at the quote that justifies it. */
  evidenceIds: string[];
};

export type RuleNode =
  | PredicateRule
  | { type: "all" | "any"; children: RuleNode[] }
  | { type: "not"; child: RuleNode };

export type Evidence = {
  id: string;
  marker: string;
  quote: string;
  location: string;
};

export type ApplicabilityRule = {
  version: number;
  status: "verified" | "withheld";
  sourceCompleteness: "complete" | "incomplete" | "unknown";
  root: RuleNode;
  evidence: Evidence[];
};

const NUMERIC_OPERATORS: RuleOperator[] = [
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseNode(value: unknown, errors: string[], depth = 0): RuleNode | null {
  // A hostile or corrupt payload must not blow the stack.
  if (depth > 24) {
    errors.push("Rule nesting is too deep");
    return null;
  }
  if (!isRecord(value)) {
    errors.push("Rule node must be an object");
    return null;
  }

  if (value.type === "predicate") {
    if (typeof value.attribute !== "string" || !value.attribute) {
      errors.push("Predicate is missing an attribute");
      return null;
    }
    if (!RULE_OPERATORS.includes(value.operator as RuleOperator)) {
      errors.push(`Unsupported operator on ${value.attribute}`);
      return null;
    }
    if (!isStringArray(value.evidenceIds) || value.evidenceIds.length === 0) {
      errors.push(`${value.attribute} cites no evidence`);
      return null;
    }
    const raw = value.value;
    if (
      raw !== undefined
      && typeof raw !== "string"
      && typeof raw !== "number"
      && typeof raw !== "boolean"
      && !isStringArray(raw)
    ) {
      errors.push(`${value.attribute} has an unsupported comparison value`);
      return null;
    }
    return {
      type: "predicate",
      attribute: value.attribute,
      operator: value.operator as RuleOperator,
      value: raw as PredicateValue | undefined,
      evidenceIds: value.evidenceIds,
    };
  }

  if (value.type === "all" || value.type === "any") {
    if (!Array.isArray(value.children) || value.children.length === 0) {
      errors.push(`${value.type} group needs at least one child`);
      return null;
    }
    const children: RuleNode[] = [];
    for (const child of value.children) {
      const parsed = parseNode(child, errors, depth + 1);
      if (!parsed) return null;
      children.push(parsed);
    }
    return { type: value.type, children };
  }

  if (value.type === "not") {
    const child = parseNode(value.child, errors, depth + 1);
    return child ? { type: "not", child } : null;
  }

  errors.push("Unknown rule node type");
  return null;
}

function collectPredicates(node: RuleNode, target: PredicateRule[]) {
  if (node.type === "predicate") target.push(node);
  else if (node.type === "not") collectPredicates(node.child, target);
  else node.children.forEach((child) => collectPredicates(child, target));
}

function valueMatchesType(value: PredicateValue, type: string): boolean {
  if (type === "string_list") return isStringArray(value);
  return typeof value === type;
}

function valuesAllowed(value: PredicateValue, allowedValues: readonly string[]): boolean {
  const values = Array.isArray(value) ? value : [value];
  return values.every((item) => typeof item !== "string" || allowedValues.includes(item));
}

/**
 * Semantic checks against the attribute registry. Mirrors the newsletter's
 * `validateApplicabilityRule` minus the source-quote check, which cannot run
 * here because the product does not hold the full source text.
 */
export function validateRuleAgainstRegistry(rule: ApplicabilityRule): string[] {
  const errors: string[] = [];
  const evidenceIds = new Set(rule.evidence.map((item) => item.id));

  const predicates: PredicateRule[] = [];
  collectPredicates(rule.root, predicates);

  for (const predicate of predicates) {
    const definition = getAttributeDefinition(predicate.attribute);
    if (!definition) {
      errors.push(`Unknown attribute ${predicate.attribute}`);
      continue;
    }
    for (const id of predicate.evidenceIds) {
      if (!evidenceIds.has(id)) errors.push(`Predicate references missing evidence ${id}`);
    }
    if (predicate.operator !== "exists" && predicate.value === undefined) {
      errors.push(`${predicate.attribute} requires a comparison value`);
      continue;
    }
    if (predicate.value === undefined) continue;

    if (
      NUMERIC_OPERATORS.includes(predicate.operator)
      && (definition.valueType !== "number" || typeof predicate.value !== "number")
    ) {
      errors.push(`${predicate.attribute} requires a numeric threshold comparison`);
    }
    if (
      predicate.operator === "contains_any"
      && (definition.valueType !== "string_list" || !isStringArray(predicate.value))
    ) {
      errors.push(`${predicate.attribute} requires a string-list comparison`);
    }
    if (
      predicate.operator === "one_of"
      && (definition.valueType !== "string" || !isStringArray(predicate.value))
    ) {
      errors.push(`${predicate.attribute} requires a list of allowed string values`);
    }
    if (
      (predicate.operator === "equals" || predicate.operator === "not_equals")
      && !valueMatchesType(predicate.value, definition.valueType)
    ) {
      errors.push(`${predicate.attribute} comparison value has the wrong type`);
    }
    if (definition.allowedValues && !valuesAllowed(predicate.value, definition.allowedValues)) {
      errors.push(`${predicate.attribute} uses a value outside the registered vocabulary`);
    }
  }

  if (rule.sourceCompleteness !== "complete" && rule.status === "verified") {
    errors.push("An incomplete source cannot be verified");
  }
  return [...new Set(errors)];
}

/** Parses and validates untrusted JSON into a rule, or explains why not. */
export function parseApplicabilityRule(
  value: unknown,
): { rule: ApplicabilityRule; errors: [] } | { rule: null; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(value)) return { rule: null, errors: ["Rule must be an object"] };

  if (typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1) {
    errors.push("Rule version must be a positive integer");
  }
  if (value.status !== "verified" && value.status !== "withheld") {
    errors.push("Rule status must be verified or withheld");
  }
  if (
    value.sourceCompleteness !== "complete"
    && value.sourceCompleteness !== "incomplete"
    && value.sourceCompleteness !== "unknown"
  ) {
    errors.push("Rule sourceCompleteness is invalid");
  }

  const evidence: Evidence[] = [];
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    errors.push("Rule must carry at least one evidence quote");
  } else {
    for (const item of value.evidence) {
      if (
        !isRecord(item)
        || typeof item.id !== "string" || !item.id
        || typeof item.marker !== "string" || !item.marker
        || typeof item.quote !== "string" || item.quote.length < 4
        || typeof item.location !== "string" || !item.location
      ) {
        errors.push("An evidence entry is malformed");
        continue;
      }
      evidence.push({
        id: item.id,
        marker: item.marker,
        quote: item.quote,
        location: item.location,
      });
    }
  }

  const root = parseNode(value.root, errors);
  if (!root || errors.length) return { rule: null, errors };

  const rule: ApplicabilityRule = {
    version: value.version as number,
    status: value.status as ApplicabilityRule["status"],
    sourceCompleteness: value.sourceCompleteness as ApplicabilityRule["sourceCompleteness"],
    root,
    evidence,
  };

  const semantic = validateRuleAgainstRegistry(rule);
  if (semantic.length) return { rule: null, errors: semantic };
  return { rule, errors: [] };
}

export function collectAttributes(node: RuleNode): string[] {
  const predicates: PredicateRule[] = [];
  collectPredicates(node, predicates);
  return [...new Set(predicates.map((predicate) => predicate.attribute))];
}
