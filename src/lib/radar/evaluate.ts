import type { CompanyFact, FactValue } from "./facts.ts";
import { getAttributeDefinition, isUsableFact } from "./facts.ts";
import type { ApplicabilityRule, PredicateRule, RuleNode } from "./rules.ts";

// Deterministic applicability evaluation, ported from
// `newsletter/src/radar/evaluate.ts` (canonical). No language model runs here:
// the model's only job was extracting the rule, and a rule that failed
// verification never reaches this code.
//
// Three-valued on purpose. "unknown" is a first-class answer — a fact we were
// never told is not the same as a fact that is false, and conflating them is
// how a matcher starts inventing applicability.

export type TruthValue = "true" | "false" | "unknown";

export type RadarDecision =
  | "direct_relevance"
  | "possible_relevance"
  | "more_information_needed"
  | "no_detected_connection"
  | "unable_to_determine_safely";

export type DecisionTrace = {
  result: TruthValue;
  node: RuleNode;
  children?: DecisionTrace[];
  fact?: CompanyFact;
  reason: string;
};

export type RadarEvaluation = {
  decision: RadarDecision;
  trace: DecisionTrace | null;
  missingAttributes: string[];
  evidenceIds: string[];
  reason: string;
};

export function evaluateApplicability(
  rule: ApplicabilityRule,
  facts: CompanyFact[],
  now = new Date(),
): RadarEvaluation {
  if (rule.status !== "verified" || rule.sourceCompleteness !== "complete") {
    return {
      decision: "unable_to_determine_safely",
      trace: null,
      missingAttributes: [],
      evidenceIds: [],
      reason:
        rule.sourceCompleteness === "complete"
          ? "The automated verification passes did not agree, so no applicability conclusion is shown."
          : "The official circular or its referenced material is incomplete, so no applicability conclusion is shown.",
    };
  }

  const factsByKey = new Map(
    facts.filter((fact) => isUsableFact(fact, now)).map((fact) => [fact.key, fact]),
  );
  const trace = evaluateNode(rule.root, factsByKey);
  const missingAttributes = [...collectMissing(trace)];
  const evidenceIds = [...collectEvidence(rule.root)];

  if (trace.result === "true") {
    return {
      decision: "direct_relevance",
      trace,
      missingAttributes,
      evidenceIds,
      reason: "The confirmed company facts satisfy every required condition in the verified rule.",
    };
  }
  if (trace.result === "false") {
    return {
      decision: "no_detected_connection",
      trace,
      missingAttributes,
      evidenceIds,
      reason: "A confirmed company fact conflicts with a required condition in the verified rule.",
    };
  }
  return {
    decision: "more_information_needed",
    trace,
    missingAttributes,
    evidenceIds,
    reason: "One or more decisive company facts are missing or expired.",
  };
}

function evaluateNode(node: RuleNode, facts: Map<string, CompanyFact>): DecisionTrace {
  if (node.type === "predicate") return evaluatePredicate(node, facts.get(node.attribute));

  if (node.type === "not") {
    const child = evaluateNode(node.child, facts);
    return {
      result: child.result === "true" ? "false" : child.result === "false" ? "true" : "unknown",
      node,
      children: [child],
      reason: `Negated condition is ${child.result}.`,
    };
  }

  const children = node.children.map((child) => evaluateNode(child, facts));
  if (node.type === "all") {
    // One false sinks the group even if others are unknown; all must be true
    // to pass. Anything else is unknown.
    const result: TruthValue = children.some((child) => child.result === "false")
      ? "false"
      : children.every((child) => child.result === "true")
        ? "true"
        : "unknown";
    return { result, node, children, reason: `All-of group evaluated to ${result}.` };
  }

  const result: TruthValue = children.some((child) => child.result === "true")
    ? "true"
    : children.every((child) => child.result === "false")
      ? "false"
      : "unknown";
  return { result, node, children, reason: `Any-of group evaluated to ${result}.` };
}

function evaluatePredicate(node: PredicateRule, fact: CompanyFact | undefined): DecisionTrace {
  if (!fact || fact.value === null) {
    return {
      result: "unknown",
      node,
      reason: `${getAttributeDefinition(node.attribute)?.label ?? node.attribute} is not known.`,
    };
  }

  const result = compare(fact.value, node.operator, node.value);
  return {
    result,
    node,
    fact,
    reason:
      result === "unknown"
        ? "The confirmed fact cannot be compared safely with this condition."
        : `The confirmed fact ${result === "true" ? "matches" : "does not match"} this condition.`,
  };
}

function compare(
  actual: FactValue,
  operator: PredicateRule["operator"],
  expected: PredicateRule["value"],
): TruthValue {
  if (operator === "exists") return actual === null ? "false" : "true";
  if (expected === undefined || actual === null) return "unknown";
  if (operator === "equals") return Object.is(actual, expected) ? "true" : "false";
  if (operator === "not_equals") return Object.is(actual, expected) ? "false" : "true";
  if (operator === "one_of") {
    return Array.isArray(expected) && typeof actual === "string"
      ? expected.includes(actual)
        ? "true"
        : "false"
      : "unknown";
  }
  if (operator === "contains_any") {
    return Array.isArray(actual) && Array.isArray(expected)
      ? actual.some((item) => expected.includes(item))
        ? "true"
        : "false"
      : "unknown";
  }
  // Comparing a non-number against a threshold is a category error, not a
  // "false" — say unknown rather than quietly clearing the client.
  if (typeof actual !== "number" || typeof expected !== "number") return "unknown";
  if (operator === "greater_than") return actual > expected ? "true" : "false";
  if (operator === "greater_than_or_equal") return actual >= expected ? "true" : "false";
  if (operator === "less_than") return actual < expected ? "true" : "false";
  if (operator === "less_than_or_equal") return actual <= expected ? "true" : "false";
  return "unknown";
}

function collectMissing(trace: DecisionTrace): Set<string> {
  const values = new Set<string>();
  if (trace.result === "unknown" && trace.node.type === "predicate") {
    values.add(trace.node.attribute);
  }
  trace.children?.forEach((child) => collectMissing(child).forEach((item) => values.add(item)));
  return values;
}

function collectEvidence(node: RuleNode): Set<string> {
  const values = new Set<string>();
  if (node.type === "predicate") node.evidenceIds.forEach((item) => values.add(item));
  else if (node.type === "not") collectEvidence(node.child).forEach((item) => values.add(item));
  else node.children.forEach((child) => collectEvidence(child).forEach((item) => values.add(item)));
  return values;
}

/**
 * Which unanswered facts would resolve the most undecided checks — so the CA
 * is asked the two questions that matter, not all thirteen.
 */
export function rankAdaptiveQuestions(evaluations: RadarEvaluation[], limit = 3) {
  const scores = new Map<string, number>();
  for (const evaluation of evaluations) {
    if (evaluation.decision !== "more_information_needed") continue;
    for (const attribute of evaluation.missingAttributes) {
      scores.set(attribute, (scores.get(attribute) ?? 0) + 1);
    }
  }
  return [...scores]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, resolves]) => ({
      key,
      resolves,
      definition: getAttributeDefinition(key),
    }));
}
