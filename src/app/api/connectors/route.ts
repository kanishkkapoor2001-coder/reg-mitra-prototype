import { NextResponse } from "next/server";
import { connectorSystems } from "@/lib/connectors/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: "workspace_required" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const [{ data: accounts, error: accountError }, { data: observations, error: observationError }] = await Promise.all([
    supabase
      .from("connector_accounts")
      .select("id, system, mode, status, display_name, scopes, last_checked_at, last_succeeded_at, last_error_code, connector_version")
      .eq("workspace_id", workspace.id)
      .order("system"),
    supabase
      .from("latest_connector_observations")
      .select("id, client_id, obligation_key, period_key, state, source_reference, receipt_reference, observed_at, fresh_until")
      .eq("workspace_id", workspace.id)
      .order("observed_at", { ascending: false })
      .limit(50),
  ]);

  if (accountError || observationError) {
    return NextResponse.json({ error: "connector_store_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ accounts: accounts ?? [], observations: observations ?? [] });
}

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace || !["owner", "admin"].includes(workspace.role)) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const value = body as Record<string, unknown>;
  const system = typeof value.system === "string" && connectorSystems.includes(value.system as never)
    ? value.system
    : null;
  const allowedModes = ["local_companion", "approved_api", "browser_bridge"];
  const mode = typeof value.mode === "string" && allowedModes.includes(value.mode) ? value.mode : null;
  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
  const status = value.status === "healthy" ? "healthy" : "pairing";
  if (!system || !mode || !displayName || displayName.length > 160) {
    return NextResponse.json({ error: "invalid_connector" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "session_required" }, { status: 401 });

  const { data, error } = await supabase
    .from("connector_accounts")
    .upsert({
      workspace_id: workspace.id,
      client_id: null,
      system,
      mode,
      status,
      display_name: displayName,
      scopes: system === "tally" ? ["company_list:read"] : [],
      last_checked_at: new Date().toISOString(),
      last_succeeded_at: status === "healthy" ? new Date().toISOString() : null,
      connector_version: typeof value.connectorVersion === "string"
        ? value.connectorVersion.slice(0, 40)
        : null,
      metadata: {
        company_count: typeof value.companyCount === "number"
          ? Math.max(0, Math.min(50, Math.trunc(value.companyCount)))
          : null,
      },
      created_by: userData.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,system" })
    .select("id, system, mode, status, display_name, last_checked_at, last_succeeded_at, connector_version")
    .single();

  if (error) return NextResponse.json({ error: "connector_save_failed" }, { status: 503 });
  return NextResponse.json({ account: data }, { status: 201 });
}
