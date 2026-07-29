import { NextResponse } from "next/server";
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
  const { error } = await supabase.rpc("create_client", {
    target_workspace_id: workspace.id,
    legal_name: legalName,
    display_name: displayName,
    sector,
    state_code: stateCode,
  });

  if (error) {
    return NextResponse.redirect(new URL("/clients/new?error=unavailable", request.url), 303);
  }
  return NextResponse.redirect(new URL("/clients", request.url), 303);
}
