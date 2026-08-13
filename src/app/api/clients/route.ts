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

  // Facts the CA confirmed on the create form, recorded against the new client.
  //
  // The form collects two of the thirteen attributes rules are written against,
  // so a client created here was almost unmatchable until someone went back and
  // filled the profile in — which is why every impact sat unreviewed. These
  // arrive already reviewed on screen, so they are a recorded answer, not a
  // guess. create_client returns void, hence the read-back for the id.
  const facts = textValue(formData, "facts", 4000);
  if (facts) {
    try {
      const parsed = JSON.parse(facts) as Record<string, unknown>;
      const { data: created } = await supabase
        .from("clients")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("legal_name", legalName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (created?.id) {
        const { recordClientFact } = await import("@/lib/radar/client-facts");
        const { getAttributeDefinition } = await import("@/lib/radar/facts");
        const { data: userData } = await supabase.auth.getUser();
        const recordedBy = userData.user?.email ?? "unknown";
        for (const [key, value] of Object.entries(parsed)) {
          if (!getAttributeDefinition(key) || value === null || value === "") continue;
          await recordClientFact(supabase, {
            workspaceId: workspace.id,
            clientId: created.id,
            key,
            value: value as string | number | boolean | string[],
            recordedBy,
          });
        }
        // Re-run matching so the radar reflects the new profile immediately
        // rather than at the next nightly rematch.
        const { matchWorkspace } = await import("@/lib/radar/match");
        await matchWorkspace(workspace.id).catch((matchError) => {
          console.error("[clients] rematch after create failed", matchError);
        });
      }
    } catch (factError) {
      // The client exists and that is the thing they asked for — losing the
      // profile is recoverable from the client page, failing the create is not.
      console.error("[clients] could not record facts on create", factError);
    }
  }

  return NextResponse.redirect(new URL("/clients", request.url), 303);
}
