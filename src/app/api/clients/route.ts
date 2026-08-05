import { NextResponse } from "next/server";
import { clientLimitFor } from "@/lib/billing/tiers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

function textValue(formData: FormData, key: string, maxLength: number): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const legalName = textValue(formData, "legalName", 240);
  const displayName = textValue(formData, "displayName", 160);
  const sector = textValue(formData, "sector", 120);
  const stateCode = textValue(formData, "stateCode", 12).toUpperCase();

  if (!legalName || !displayName) {
    return NextResponse.redirect(new URL("/clients/new?error=invalid_client", request.url), 303);
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return NextResponse.redirect(new URL("/clients/new?error=unavailable", request.url), 303);
  }

  const supabase = await createSupabaseServerClient();

  // Checked here for a useful message; the database trigger is the actual
  // guarantee, so a caller that bypasses this route is still capped.
  const limit = clientLimitFor(workspace.tier);
  if (limit !== null) {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "active");

    if ((count ?? 0) >= limit) {
      return NextResponse.redirect(new URL("/clients/new?error=limit_reached", request.url), 303);
    }
  }

  const { error } = await supabase.rpc("create_client", {
    target_workspace_id: workspace.id,
    legal_name: legalName,
    display_name: displayName,
    sector,
    state_code: stateCode,
  });

  if (error) {
    const reason = error.message?.includes("client_limit_reached") ? "limit_reached" : "unavailable";
    return NextResponse.redirect(new URL(`/clients/new?error=${reason}`, request.url), 303);
  }
  return NextResponse.redirect(new URL("/clients", request.url), 303);
}
