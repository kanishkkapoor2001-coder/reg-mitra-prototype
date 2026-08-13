import { NextResponse } from "next/server";
import { clientLimitFor } from "@/lib/billing/tiers";
import { applyMapping, type ColumnMapping } from "@/lib/clients/csv";
import { recordClientFact } from "@/lib/radar/client-facts";
import { matchWorkspace } from "@/lib/radar/match";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

// Creates the clients a CA confirmed on the import preview.
//
// Rows arrive already parsed and shown on screen; this re-parses them from the
// raw cells rather than trusting what the browser posts, so what lands in the
// database is what the mapping produces, not what a page said it would.

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ROWS = 500;

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return NextResponse.json({ error: "no_workspace" }, { status: 403 });
  }

  let headers: string[] = [];
  let rows: string[][] = [];
  let mapping: ColumnMapping = {};
  try {
    const body = await request.json();
    headers = (body?.headers ?? []).map((h: unknown) => String(h));
    rows = (body?.rows ?? []).slice(0, MAX_ROWS)
      .map((r: unknown) => (Array.isArray(r) ? r.map((c: unknown) => String(c)) : []));
    mapping = (body?.mapping ?? {}) as ColumnMapping;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!headers.length || !rows.length) {
    return NextResponse.json({ error: "nothing_to_import" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const recordedBy = userData.user?.email ?? "import";

  // Existing names, so a second import of the same export does not duplicate a
  // book. Matched on display name, which is what a spreadsheet actually repeats.
  const { data: existing } = await supabase
    .from("clients")
    .select("display_name")
    .eq("workspace_id", workspace.id);
  const taken = new Set((existing ?? []).map((c) => c.display_name?.trim().toLowerCase()));

  const limit = clientLimitFor(workspace.tier);
  const { count: activeCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("status", "active");

  let remaining = limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - (activeCount ?? 0));

  const created: string[] = [];
  const skipped: { name: string; reason: string }[] = [];
  let factsWritten = 0;

  for (const cells of rows) {
    const parsed = applyMapping(headers, cells, mapping);
    if (!parsed.legalName) {
      skipped.push({ name: cells[0] ?? "(blank row)", reason: "no name column" });
      continue;
    }
    if (taken.has(parsed.displayName.trim().toLowerCase())) {
      skipped.push({ name: parsed.displayName, reason: "already in this workspace" });
      continue;
    }
    if (remaining <= 0) {
      skipped.push({ name: parsed.displayName, reason: "plan limit reached" });
      continue;
    }

    const { error } = await supabase.rpc("create_client", {
      target_workspace_id: workspace.id,
      legal_name: parsed.legalName,
      display_name: parsed.displayName,
      sector: parsed.sector,
      state_code: parsed.stateCode,
    });

    if (error) {
      skipped.push({
        name: parsed.displayName,
        reason: error.message?.includes("client_limit_reached") ? "plan limit reached" : "could not create",
      });
      if (error.message?.includes("client_limit_reached")) remaining = 0;
      continue;
    }

    taken.add(parsed.displayName.trim().toLowerCase());
    remaining -= 1;
    created.push(parsed.displayName);

    const factKeys = Object.keys(parsed.facts);
    if (!factKeys.length) continue;

    const { data: row } = await supabase
      .from("clients")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("legal_name", parsed.legalName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row?.id) continue;

    for (const [key, value] of Object.entries(parsed.facts)) {
      const outcome = await recordClientFact(supabase, {
        workspaceId: workspace.id,
        clientId: row.id,
        key,
        value,
        recordedBy,
      });
      if (outcome.ok) factsWritten += 1;
    }
  }

  // One rematch for the whole import rather than one per client.
  if (created.length) {
    await matchWorkspace(workspace.id).catch((error) => {
      console.error("[import] rematch failed", error);
    });
  }

  return NextResponse.json({ created: created.length, factsWritten, skipped });
}
