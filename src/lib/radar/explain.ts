import { getAttributeDefinition } from "./facts.ts";
import type { PredicateRule, RuleNode } from "./rules.ts";

// Turns a validated rule into the sentence a CA reads, ported from
// `newsletter/src/radar/explain.ts` (canonical).
//
// No language model writes this text. The explanation is generated from the
// same structure the evaluator ran, so what the CA is told and what the machine
// actually checked cannot drift apart.

export type ApplicabilityExplanation = {
  statement: string;
  criteria: string[];
};

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: PredicateRule["value"]): string {
  if (Array.isArray(value)) return value.map(humanize).join(" or ");
  if (typeof value === "string") return humanize(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return "present";
}

function predicateText(predicate: PredicateRule): string {
  const label = getAttributeDefinition(predicate.attribute)?.label ?? humanize(predicate.attribute);
  const value = formatValue(predicate.value);
  const operator: Record<PredicateRule["operator"], string> = {
    equals: "is",
    not_equals: "is not",
    one_of: "is",
    contains_any: "includes",
    greater_than: "is above",
    greater_than_or_equal: "is at least",
    less_than: "is below",
    less_than_or_equal: "is no more than",
    exists: "is recorded",
  };
  return `${label} ${operator[predicate.operator]} ${value}`.trim();
}

function explainNode(node: RuleNode): string {
  if (node.type === "predicate") return predicateText(node);
  if (node.type === "not") return `not (${explainNode(node.child)})`;
  const conjunction = node.type === "all" ? " and " : " or ";
  return node.children.map((child) => explainNode(child)).join(conjunction);
}

function collectCriteria(node: RuleNode, target: string[]) {
  if (node.type === "predicate") target.push(predicateText(node));
  else if (node.type === "not") collectCriteria(node.child, target);
  else node.children.forEach((child) => collectCriteria(child, target));
}

/** Converts only a schema-validated, evidence-backed rule into reader copy. */
export function explainApplicabilityRule(root: RuleNode): ApplicabilityExplanation {
  const criteria: string[] = [];
  collectCriteria(root, criteria);
  return {
    statement: `Examine this circular if ${explainNode(root)}.`,
    criteria: [...new Set(criteria)],
  };
}
