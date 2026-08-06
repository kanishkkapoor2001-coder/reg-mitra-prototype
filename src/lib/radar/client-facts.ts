import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CompanyFact,
  type FactValue,
  expiryFor,
  getAttributeDefinition,
  validateFact,
} from "@/lib/radar/facts";

// Reads and writes the recorded facts a client company is matched on.
//
// `client_facts` is append-only: a correction supersedes the previous row
// rather than overwriting it, so a past applicability decision can always be
// re-examined against the facts that were true when it was made.

type FactRow = {
  fact_key: string;
  value: FactValue;
  valid_from: string | null;
  valid_to: string | null;
  source_label: string | null;
  source_url: string | null;
  recorded_at: string;
};

function toCompanyFact(row: FactRow): CompanyFact {
  const derived = row.source_label?.startsWith("derived:") ?? false;
  return {
    key: row.fact_key,
    value: row.value,
    source: derived ? "derived" : "ca_confirmed",
    observedAt: row.recorded_at,
    validForPeriod: row.valid_from ?? undefined,
    expiresAt: row.valid_to ?? null,
    derivedFrom: derived ? row.source_label!.slice("derived:".length) : undefined,
  };
}

/** Current (non-superseded) facts for one client. */
export async function readClientFacts(
  supabase: SupabaseClient,
  clientId: string,
): Promise<CompanyFact[]> {
  const { data, error } = await supabase
    .from("client_facts")
    .select("fact_key, value, valid_from, valid_to, source_label, source_url, recorded_at")
    .eq("client_id", clientId)
    .is("superseded_at", null)
    .order("recorded_at", { ascending: false });

  if (error) throw error;

  // Defensive: one current row per key. If duplicates ever slip through, the
  // newest wins rather than the matcher seeing a contradiction.
  const seen = new Set<string>();
  const facts: CompanyFact[] = [];
  for (const row of (data ?? []) as FactRow[]) {
    if (seen.has(row.fact_key)) continue;
    seen.add(row.fact_key);
    facts.push(toCompanyFact(row));
  }
  return facts;
}

export async function readClientFactMap(
  supabase: SupabaseClient,
  clientId: string,
): Promise<Map<string, CompanyFact>> {
  const facts = await readClientFacts(supabase, clientId);
  return new Map(facts.map((fact) => [fact.key, fact]));
}

export type RecordFactInput = {
  workspaceId: string;
  clientId: string;
  key: string;
  value: FactValue;
  recordedBy: string;
  validForPeriod?: string | null;
  /** Set for machine-derived facts, e.g. "GSTIN on file". */
  derivedFrom?: string | null;
  sourceUrl?: string | null;
};

/**
 * Supersedes the current value of a fact and records the new one.
 *
 * Returns the validation errors instead of throwing when the value does not
 * fit the registry, so a form can show them.
 */
export async function recordClientFact(
  supabase: SupabaseClient,
  input: RecordFactInput,
): Promise<{ ok: boolean; errors: string[] }> {
  const definition = getAttributeDefinition(input.key);
  if (!definition) return { ok: false, errors: [`Unknown company fact: ${input.key}`] };

  const observedAt = new Date();
  const errors = validateFact({
    key: input.key,
    value: input.value,
    source: input.derivedFrom ? "derived" : "ca_confirmed",
    observedAt: observedAt.toISOString(),
  });
  if (errors.length) return { ok: false, errors };

  const { error: supersedeError } = await supabase
    .from("client_facts")
    .update({ superseded_at: observedAt.toISOString() })
    .eq("client_id", input.clientId)
    .eq("fact_key", input.key)
    .is("superseded_at", null);

  if (supersedeError) return { ok: false, errors: [supersedeError.message] };

  const { error: insertError } = await supabase.from("client_facts").insert({
    workspace_id: input.workspaceId,
    client_id: input.clientId,
    fact_key: input.key,
    value: input.value,
    valid_from: input.validForPeriod ?? null,
    valid_to: expiryFor(input.key, observedAt),
    source_label: input.derivedFrom ? `derived:${input.derivedFrom}` : "ca_confirmed",
    source_url: input.sourceUrl ?? null,
    recorded_by: input.recordedBy,
  });

  if (insertError) return { ok: false, errors: [insertError.message] };
  return { ok: true, errors: [] };
}

/**
 * Facts the firm has already proved by holding a document.
 *
 * Only the *kind* of identifier is used — the values are stored encrypted and
 * are never read here. Presence of a TAN means the client deducts TDS; an
 * FSSAI licence means it is a licensed food business. These are recorded as
 * `derived` and a CA can always override them with a confirmed answer.
 */
export async function deriveFactsFromIdentifiers(
  supabase: SupabaseClient,
  input: { workspaceId: string; clientId: string; recordedBy: string },
): Promise<string[]> {
  const { data, error } = await supabase
    .from("client_identifiers")
    .select("kind")
    .eq("client_id", input.clientId);

  if (error) throw error;
  const kinds = new Set((data ?? []).map((row: { kind: string }) => row.kind));

  const derivations: Array<{ key: string; value: FactValue; from: string }> = [];
  if (kinds.has("gstin")) {
    derivations.push({ key: "company.gst_registered", value: true, from: "GSTIN on file" });
  }
  if (kinds.has("fssai")) {
    derivations.push({ key: "company.fssai_licensed", value: true, from: "FSSAI licence on file" });
  }
  if (kinds.has("tan")) {
    derivations.push({ key: "company.deducts_tds", value: true, from: "TAN on file" });
  }
  if (kinds.has("llpin")) {
    derivations.push({ key: "company.entity_type", value: "LLP", from: "LLPIN on file" });
  }
  // A CIN proves incorporation but not whether it is private or public, so it
  // is deliberately not derived into entity_type.

  const existing = await readClientFactMap(supabase, input.clientId);
  const applied: string[] = [];

  for (const derivation of derivations) {
    // Never overwrite an answer a person gave.
    const current = existing.get(derivation.key);
    if (current && current.source === "ca_confirmed") continue;
    if (current && current.value === derivation.value) continue;

    const result = await recordClientFact(supabase, {
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      key: derivation.key,
      value: derivation.value,
      recordedBy: input.recordedBy,
      derivedFrom: derivation.from,
    });
    if (result.ok) applied.push(derivation.key);
  }

  return applied;
}
