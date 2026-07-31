import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return NextResponse.json({ error: "Client access is unavailable." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid client update." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (body.action === "archive") {
    const { error } = await supabase
      .from("clients")
      .update({ status: "archived", archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace.id)
      .eq("id", id);
    return error
      ? NextResponse.json({ error: "Client could not be archived." }, { status: 503 })
      : NextResponse.json({ ok: true });
  }

  const legalName = text(body.legalName, 240);
  const displayName = text(body.displayName, 160);
  if (!legalName || !displayName) {
    return NextResponse.json({ error: "Legal and working names are required." }, { status: 400 });
  }
  const { error } = await supabase
    .from("clients")
    .update({
      legal_name: legalName,
      display_name: displayName,
      sector: text(body.sector, 120) || null,
      state_code: text(body.stateCode, 20).toUpperCase() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .eq("status", "active");
  return error
    ? NextResponse.json({ error: "Client could not be updated." }, { status: 503 })
    : NextResponse.json({ ok: true });
}
