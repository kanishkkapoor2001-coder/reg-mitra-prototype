import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";

// Records that a filing was actually done — or that it did not arise for this
// client this period. The older /review route stamps "a reviewer looked at
// this", which is a different act and stays where it is.

const OUTCOMES = new Set(["filed", "not_applicable"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid task." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { outcome?: unknown };
  const outcome = typeof body.outcome === "string" ? body.outcome : "filed";
  if (!OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: "Unsupported outcome." }, { status: 400 });
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_task", {
    target_task_id: id,
    target_outcome: outcome,
  });
  if (error) {
    console.error("[tasks/complete] failed", error.message);
    return NextResponse.json({ error: "Could not record that." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
