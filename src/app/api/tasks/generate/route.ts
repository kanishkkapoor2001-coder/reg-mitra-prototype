import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateCandidateTasks, type SeedClient } from "@/lib/task-generation";
import { getCurrentWorkspace } from "@/lib/workspace";

function back(request: Request, query: string) {
  return NextResponse.redirect(new URL(`/today?${query}`, request.url), 303);
}

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return back(request, "generated=denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL("/login?from=/today", request.url), 303);
  }

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, display_name, sector, state_code")
    .eq("workspace_id", workspace.id)
    .eq("status", "active");

  const clients: SeedClient[] = (clientRows ?? []).map((client) => ({
    id: client.id,
    displayName: client.display_name,
    sector: client.sector,
    stateCode: client.state_code,
  }));

  if (!clients.length) {
    return back(request, "generated=no_clients");
  }

  const candidates = generateCandidateTasks(clients, new Date());
  if (!candidates.length) {
    return back(request, "generated=0");
  }

  // Idempotent: skip candidates whose seedKey already exists in the workspace.
  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("metadata")
    .eq("workspace_id", workspace.id);

  const existingSeedKeys = new Set(
    (existingTasks ?? [])
      .map((task) => (task.metadata as { seedKey?: string } | null)?.seedKey)
      .filter((value): value is string => Boolean(value)),
  );

  const rows = candidates
    .filter((candidate) => !existingSeedKeys.has(candidate.seedKey))
    .map((candidate) => ({
      workspace_id: workspace.id,
      client_id: candidate.clientId,
      title: candidate.title,
      description: candidate.description,
      state: "open" as const,
      priority: candidate.priority,
      due_at: candidate.dueAt,
      metadata: candidate.metadata,
      created_by: userData.user.id,
    }));

  if (!rows.length) {
    return back(request, "generated=0");
  }

  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert(rows)
    .select("id");

  if (error) {
    return back(request, "generated=error");
  }

  return back(request, `generated=${inserted?.length ?? 0}`);
}
