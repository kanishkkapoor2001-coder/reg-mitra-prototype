import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readClientFacts } from "@/lib/radar/client-facts";
import { evaluateApplicability, type RadarDecision } from "@/lib/radar/evaluate";
import { explainApplicabilityRule } from "@/lib/radar/explain";
import type { CompanyFact } from "@/lib/radar/facts";
import { parseApplicabilityRule, type ApplicabilityRule } from "@/lib/radar/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Runs every active rule against every active client and records the result.
//
// The machine only ever *proposes*. A flagged match lands as `not_reviewed`
// for a CA to approve or dismiss; approving is the only thing that makes a
// match count. A re-run never overwrites a decision a person made — see
// record_client_impact.

// Rough confidence, used only for ordering the review queue. It is not a
// probability: the evaluation itself is deterministic, so a flagged match is
// flagged because the facts satisfied the rule, not because a model was
// confident.
const CONFIDENCE: Partial<Record<RadarDecision, number>> = {
  direct_relevance: 0.95,
  possible_relevance: 0.6,
  more_information_needed: 0.3,
  no_detected_connection: 0.05,
};

export type MatchSummary = {
  clientsScanned: number;
  rulesEvaluated: number;
  flagged: number;
  cleared: number;
  needFacts: number;
  undetermined: number;
  preserved: number;
  errors: string[];
};

type StoredRule = {
  id: string;
  regulatory_source_id: string;
  version: number;
  status: string;
  source_completeness: string;
  root_condition: unknown;
  evidence: unknown;
};

function toRule(row: StoredRule): ApplicabilityRule | null {
  const parsed = parseApplicabilityRule({
    version: row.version,
    status: row.status,
    sourceCompleteness: row.source_completeness,
    root: row.root_condition,
    evidence: row.evidence,
  });
  return parsed.rule;
}

async function loadActiveRules(admin: SupabaseClient): Promise<Array<{ row: StoredRule; rule: ApplicabilityRule }>> {
  const { data, error } = await admin
    .from("regulatory_rules")
    .select("id, regulatory_source_id, version, status, source_completeness, root_condition, evidence")
    .eq("active", true);

  if (error) throw error;

  const rules: Array<{ row: StoredRule; rule: ApplicabilityRule }> = [];
  for (const row of (data ?? []) as StoredRule[]) {
    const rule = toRule(row);
    // A stored rule that no longer parses (registry changed under it) is
    // skipped rather than evaluated on a guess.
    if (rule) rules.push({ row, rule });
  }
  return rules;
}

/**
 * Matches one workspace's client book against every active rule.
 *
 * Safe to re-run: results are keyed on (workspace, client, source), so a second
 * pass updates rather than duplicates.
 */
export async function matchWorkspace(
  workspaceId: string,
  options: { clientId?: string } = {},
): Promise<MatchSummary> {
  const admin = createSupabaseAdminClient();
  const summary: MatchSummary = {
    clientsScanned: 0, rulesEvaluated: 0, flagged: 0, cleared: 0,
    needFacts: 0, undetermined: 0, preserved: 0, errors: [],
  };

  const rules = await loadActiveRules(admin);
  if (!rules.length) return summary;

  let clientQuery = admin
    .from("clients")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (options.clientId) clientQuery = clientQuery.eq("id", options.clientId);

  const { data: clients, error: clientError } = await clientQuery;
  if (clientError) throw clientError;

  const now = new Date();

  for (const client of (clients ?? []) as Array<{ id: string }>) {
    let facts: CompanyFact[];
    try {
      facts = await readClientFacts(admin, client.id, workspaceId);
    } catch (error) {
      summary.errors.push(`facts ${client.id}: ${(error as Error).message}`);
      continue;
    }

    summary.clientsScanned += 1;

    for (const { row, rule } of rules) {
      const evaluation = evaluateApplicability(rule, facts, now);
      summary.rulesEvaluated += 1;

      switch (evaluation.decision) {
        case "direct_relevance": summary.flagged += 1; break;
        case "no_detected_connection": summary.cleared += 1; break;
        case "more_information_needed": summary.needFacts += 1; break;
        default: summary.undetermined += 1;
      }

      const explanation = explainApplicabilityRule(rule.root);
      // Only the quotes the evaluated predicates actually cited — not every
      // quote attached to the circular.
      const cited = new Set(evaluation.evidenceIds);
      const evidence = rule.evidence.filter((item) => cited.has(item.id));

      const { data: outcome, error } = await admin.rpc("record_client_impact", {
        target_workspace_id: workspaceId,
        target_client_id: client.id,
        target_source_id: row.regulatory_source_id,
        target_rule_id: row.id,
        target_rule_version: rule.version,
        target_decision: evaluation.decision,
        target_applicability: explanation.statement,
        target_evidence: evidence,
        target_trace: { reason: evaluation.reason, criteria: explanation.criteria },
        target_missing: evaluation.missingAttributes,
        target_confidence: CONFIDENCE[evaluation.decision] ?? null,
      });

      if (error) {
        summary.errors.push(`impact ${client.id}/${row.id}: ${error.message}`);
        continue;
      }
      if (outcome === "preserved") summary.preserved += 1;
    }
  }

  return summary;
}

/** Re-matches every workspace. Used by the nightly safety net and after an import. */
export async function matchAllWorkspaces(): Promise<{ workspaces: number; totals: MatchSummary }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("workspaces").select("id");
  if (error) throw error;

  const totals: MatchSummary = {
    clientsScanned: 0, rulesEvaluated: 0, flagged: 0, cleared: 0,
    needFacts: 0, undetermined: 0, preserved: 0, errors: [],
  };

  const workspaces = (data ?? []) as Array<{ id: string }>;
  for (const workspace of workspaces) {
    try {
      const summary = await matchWorkspace(workspace.id);
      totals.clientsScanned += summary.clientsScanned;
      totals.rulesEvaluated += summary.rulesEvaluated;
      totals.flagged += summary.flagged;
      totals.cleared += summary.cleared;
      totals.needFacts += summary.needFacts;
      totals.undetermined += summary.undetermined;
      totals.preserved += summary.preserved;
      totals.errors.push(...summary.errors);
    } catch (error) {
      // One broken workspace must not stop the rest of the book being matched.
      totals.errors.push(`workspace ${workspace.id}: ${(error as Error).message}`);
    }
  }

  return { workspaces: workspaces.length, totals };
}
