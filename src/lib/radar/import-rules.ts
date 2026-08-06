import "server-only";
import { collectAttributes, parseApplicabilityRule } from "@/lib/radar/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Pulls verified applicability rules from the newsletter and stores them for
// the matcher.
//
// Every rule is re-validated here against this codebase's own attribute
// registry. The newsletter is trusted to *extract* rules, not to know which
// attributes the product understands — a rule referencing an attribute we
// cannot evaluate is skipped with a reason rather than stored and silently
// producing "unknown" forever.

export type ImportOutcome = {
  ok: boolean;
  fetched: number;
  imported: number;
  skipped: Array<{ documentId: string; reason: string }>;
  cursor: string | null;
  hasMore: boolean;
  message?: string;
};

type ExportItem = {
  documentId: string;
  version: number;
  status: string;
  sourceCompleteness: string;
  root: unknown;
  evidence: unknown;
  createdAt: string;
  document: {
    title: string;
    canonicalUrl: string;
    refNo: string | null;
    publishedAt: string | null;
    authority: string;
    summary: string | null;
  };
};

function exportUrl(base: string, since: string | null, limit: number): string {
  const url = new URL("/api/export/rules", base);
  if (since) url.searchParams.set("since", since);
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

export async function importRules(options: { limit?: number } = {}): Promise<ImportOutcome> {
  const base = process.env.NEWSLETTER_BASE_URL?.trim();
  const secret = process.env.RULE_EXPORT_SECRET?.trim();
  const empty: ImportOutcome = {
    ok: false, fetched: 0, imported: 0, skipped: [], cursor: null, hasMore: false,
  };

  if (!base || !secret) {
    return { ...empty, message: "NEWSLETTER_BASE_URL or RULE_EXPORT_SECRET is not configured" };
  }

  const admin = createSupabaseAdminClient();

  const { data: state } = await admin
    .from("rule_import_state")
    .select("last_cursor")
    .eq("id", true)
    .maybeSingle();

  const since = state?.last_cursor ?? null;
  const limit = options.limit ?? 100;

  let payload: { items: ExportItem[]; cursor: string | null; hasMore: boolean };
  try {
    const response = await fetch(exportUrl(base, since, limit), {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return { ...empty, message: `Export responded ${response.status}` };
    }
    payload = await response.json();
  } catch (error) {
    return { ...empty, message: `Export unreachable: ${(error as Error).message}` };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const skipped: ImportOutcome["skipped"] = [];
  let imported = 0;

  for (const item of items) {
    const parsed = parseApplicabilityRule({
      version: item.version,
      status: item.status,
      sourceCompleteness: item.sourceCompleteness,
      root: item.root,
      evidence: item.evidence,
    });

    if (!parsed.rule) {
      skipped.push({ documentId: item.documentId, reason: parsed.errors.join("; ") });
      continue;
    }

    // The circular itself must exist before a rule can point at it.
    // `state: current` is honest here — a rule only reaches this import after
    // the newsletter's two independent extraction passes agreed on it against
    // the fetched source text.
    const { data: source, error: sourceError } = await admin
      .from("regulatory_sources")
      .upsert(
        {
          authority: item.document.authority,
          canonical_url: item.document.canonicalUrl,
          title: item.document.title,
          publication_reference: item.document.refNo,
          published_at: item.document.publishedAt,
          retrieved_at: item.createdAt,
          state: "current",
        },
        { onConflict: "canonical_url" },
      )
      .select("id")
      .single();

    if (sourceError || !source) {
      skipped.push({
        documentId: item.documentId,
        reason: `Source upsert failed: ${sourceError?.message ?? "unknown"}`,
      });
      continue;
    }

    const { error: ruleError } = await admin
      .from("regulatory_rules")
      .upsert(
        {
          regulatory_source_id: source.id,
          external_document_id: item.documentId,
          version: parsed.rule.version,
          status: parsed.rule.status,
          source_completeness: parsed.rule.sourceCompleteness,
          root_condition: parsed.rule.root,
          evidence: parsed.rule.evidence,
          attributes: collectAttributes(parsed.rule.root),
          active: true,
        },
        { onConflict: "external_document_id,version" },
      );

    if (ruleError) {
      skipped.push({ documentId: item.documentId, reason: ruleError.message });
      continue;
    }

    // Exactly one version of a document may be active at a time.
    const { error: activateError } = await admin.rpc("activate_latest_rule", {
      target_document_id: item.documentId,
    });
    if (activateError) {
      skipped.push({ documentId: item.documentId, reason: activateError.message });
      continue;
    }

    imported += 1;
  }

  // Only advance the cursor over records we actually handled; otherwise a
  // transient failure would permanently skip those rules.
  const cursor = imported > 0 || items.length === 0 ? payload.cursor ?? since : since;

  await admin
    .from("rule_import_state")
    .update({
      last_cursor: cursor,
      last_run_at: new Date().toISOString(),
      last_status: skipped.length ? "partial" : "ok",
      last_message: skipped.length ? `${skipped.length} skipped` : null,
      imported_count: imported,
    })
    .eq("id", true);

  return {
    ok: true,
    fetched: items.length,
    imported,
    skipped,
    cursor,
    hasMore: Boolean(payload.hasMore),
  };
}
