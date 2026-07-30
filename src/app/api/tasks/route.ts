import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

function textValue(formData: FormData, key: string, maxLength: number): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function fail(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/tasks/new?error=${error}`, request.url), 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const title = textValue(formData, "title", 280);
  const clientId = textValue(formData, "clientId", 64);
  const dueDate = textValue(formData, "dueDate", 10);
  const priorityRaw = textValue(formData, "priority", 1);

  if (!title) {
    return fail(request, "invalid_task");
  }

  const priority = priorityRaw === "3" ? 3 : priorityRaw === "1" ? 1 : 2;
  const dueAt = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ? `${dueDate}T12:00:00+05:30`
    : null;

  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.role === "viewer") {
    return fail(request, "unavailable");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL("/login?from=/tasks/new", request.url), 303);
  }

  // Validate the client belongs to this workspace before linking it.
  let linkedClientId: string | null = null;
  if (clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("id", clientId)
      .maybeSingle();
    linkedClientId = client?.id ?? null;
  }

  const { error } = await supabase.from("tasks").insert({
    workspace_id: workspace.id,
    client_id: linkedClientId,
    title,
    state: "open" as const,
    priority,
    due_at: dueAt,
    created_by: userData.user.id,
  });

  if (error) {
    return fail(request, "unavailable");
  }

  return NextResponse.redirect(new URL("/today", request.url), 303);
}
