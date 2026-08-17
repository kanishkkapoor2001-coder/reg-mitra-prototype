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

  // Close the loop. "Applies" is a finding, not an outcome — the outcome is the
  // work it creates. Approving spawns one tracked task for that client;
  // reversing the decision dismisses that task rather than deleting it (tasks
  // deliberately have no delete policy — the trail stays auditable), and only
  // when it is still open and still ours (metadata.auto), so work someone has
  // started or wrote by hand is never touched by an Undo. Re-approving reopens
  // the dismissed task instead of minting a duplicate.
  try {
    if (state === "approved") {
      const { data: existing } = await supabase
        .from("tasks")
        .select("id, state, metadata")
        .eq("workspace_id", workspace.id)
        .eq("impact_id", impactId)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        const { data: impact } = await supabase
          .from("client_regulatory_impacts")
          .select("client_id, regulatory_sources(title, authority)")
          .eq("workspace_id", workspace.id)
          .eq("id", impactId)
          .maybeSingle();
        const sourceValue = impact?.regulatory_sources;
        const source = Array.isArray(sourceValue) ? sourceValue[0] : sourceValue;
        if (impact?.client_id && source) {
          const title = `Apply: ${source.title}`.slice(0, 240);
          await supabase.from("tasks").insert({
            workspace_id: workspace.id,
            client_id: impact.client_id,
            impact_id: impactId,
            title,
            description:
              "You approved this change as applicable. Confirm the official text, decide the client action, and record it.",
            state: "open",
            priority: 3,
            created_by: userData.user.id,
            metadata: { auto: "impact_approval", authority: source.authority ?? null },
          });
        }
      } else if (
        existing.state === "dismissed"
        && (existing.metadata as { auto?: string } | null)?.auto === "impact_approval"
      ) {
        await supabase
          .from("tasks")
          .update({ state: "open", updated_at: new Date().toISOString() })
          .eq("workspace_id", workspace.id)
          .eq("id", existing.id);
      }
    } else {
      await supabase
        .from("tasks")
        .update({ state: "dismissed", updated_at: new Date().toISOString() })
        .eq("workspace_id", workspace.id)
        .eq("impact_id", impactId)
        .eq("state", "open")
        .eq("metadata->>auto", "impact_approval");
    }
  } catch (taskError) {
    // The decision recorded; the follow-up task is best-effort and must not
    // turn a saved review into a visible failure.
    console.error("[impacts/review] task sync failed", (taskError as Error)?.message);
  }

  return wantsJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(`${safeReturn}?reviewed=1`, request.url), 303);
}
