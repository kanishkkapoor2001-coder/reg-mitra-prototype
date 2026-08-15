import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

// Records a CA's decision on a proposed match. This is the step that makes a
// machine proposal count for anything.

const ALLOWED = new Set(["approved", "rejected", "not_reviewed"]);

export async function POST(request: Request) {
  // Optimistic clients say so and get JSON; a plain form post gets the
  // original redirect flow. Same route, so the decision logic cannot drift.
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");

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

  const fail = (status: number) =>
    wantsJson
      ? NextResponse.json({ ok: false }, { status })
      : NextResponse.redirect(new URL(`${safeReturn}?error=unavailable`, request.url), 303);

  if (!impactId || !ALLOWED.has(state)) {
    return wantsJson
      ? NextResponse.json({ ok: false }, { status: 400 })
      : NextResponse.redirect(new URL(safeReturn, request.url), 303);
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return fail(403);
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return fail(401);
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
    return fail(500);
  }

  return wantsJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(`${safeReturn}?reviewed=1`, request.url), 303);
}
