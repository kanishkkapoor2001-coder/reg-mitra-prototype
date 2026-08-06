import { NextResponse } from "next/server";
import { ATTRIBUTE_DEFINITIONS, type FactValue, getAttributeDefinition } from "@/lib/radar/facts";
import { readClientFactMap, recordClientFact } from "@/lib/radar/client-facts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

// Saves the company profile. Only keys in the registry are accepted, and a
// blank answer is left unanswered rather than stored as a value — the matcher
// must be able to tell "no" from "not told".

function parseValue(raw: string, key: string): FactValue | undefined {
  const definition = getAttributeDefinition(key);
  if (!definition) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;

  switch (definition.valueType) {
    case "boolean":
      if (trimmed !== "true" && trimmed !== "false") return undefined;
      return trimmed === "true";
    case "number": {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }
    case "string_list":
      return trimmed
        .split(",")
        .map((item) => item.trim().toUpperCase().replaceAll(" ", "_"))
        .filter(Boolean);
    default:
      return trimmed;
  }
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) {
    return NextResponse.redirect(new URL("/clients", request.url), 303);
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return NextResponse.redirect(new URL(`/clients/${clientId}?error=unavailable`, request.url), 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL(`/clients/${clientId}?error=unavailable`, request.url), 303);
  }

  // Confirm the client belongs to this workspace before writing anything.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!client) {
    return NextResponse.redirect(new URL("/clients", request.url), 303);
  }

  const existing = await readClientFactMap(supabase, clientId);

  for (const definition of ATTRIBUTE_DEFINITIONS) {
    const raw = formData.get(definition.key);
    if (typeof raw !== "string") continue;

    const value = parseValue(raw, definition.key);
    if (value === undefined) continue;

    // Skip writes that change nothing, so the history stays meaningful.
    const current = existing.get(definition.key);
    if (current && JSON.stringify(current.value) === JSON.stringify(value)) continue;

    const result = await recordClientFact(supabase, {
      workspaceId: workspace.id,
      clientId,
      key: definition.key,
      value,
      recordedBy: userId,
    });
    if (!result.ok) {
      console.error("[clients/facts] rejected", definition.key, result.errors);
    }
  }

  return NextResponse.redirect(new URL(`/clients/${clientId}?saved=1#profile`, request.url), 303);
}
