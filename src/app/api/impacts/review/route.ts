import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

// Records a CA's decision on a proposed match. This is the step that makes a
// machine proposal count for anything.

const ALLOWED = new Set(["approved", "rejected", "not_reviewed"]);

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const impactId = String(formData.get("impactId") ?? "");
  const state = String(formData.get("state") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/today");
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/today";

  if (!impactId || !ALLOWED.has(state)) {
    return NextResponse.redirect(new URL(safeReturn, request.url), 303);
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return NextResponse.redirect(new URL(`${safeReturn}?error=unavailable`, request.url), 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL(`${safeReturn}?error=unavailable`, request.url), 303);
  }

  // The workspace id is passed to the function, which scopes the update — a
  // guessed impact id from another firm cannot be decided from here.
  const { data, error } = await supabase.rpc("review_client_impact", {
    target_impact_id: impactId,
    target_workspace_id: workspace.id,
    target_state: state,
    target_user_id: userData.user.id,
  });

  if (error || data === false) {
    console.error("[impacts/review] failed", error?.message);
    return NextResponse.redirect(new URL(`${safeReturn}?error=unavailable`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`${safeReturn}?reviewed=1`, request.url), 303);
}
