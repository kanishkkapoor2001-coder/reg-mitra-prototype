import { cookies } from "next/headers";
import { TodayExperience } from "@/components/today-experience";
import { workItems } from "@/lib/demo-data";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function TodayPage() {
  const isDemo = (await cookies()).get("reg_mitra_session")?.value === "demo";

  const workspace = isDemo || !getSupabasePublicConfig()
    ? null
    : await getCurrentWorkspace();

  if (!workspace) {
    return (
      <TodayExperience
        items={workItems.map((item) => ({
          id: item.id,
          title: item.title,
          clientId: item.clientId,
          client: item.client,
          authority: item.authority,
          due: item.due,
          dueAt: null,
          urgency: item.urgency,
          needsDecision: item.state === "needs-review",
          evidenceState: "unverified",
        }))}
        mode="public"
        verifiedSourceCount={0}
      />
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, priority, due_at, state, reviewed_at, client_id, clients(display_name), client_regulatory_impacts(review_state, regulatory_sources(authority))")
    .eq("workspace_id", workspace.id)
    .is("reviewed_at", null)
    .not("state", "in", '("completed","dismissed")')
    .order("priority", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false });

  const items = (data ?? []).map((task) => {
    const clientValue = task.clients;
    const client = Array.isArray(clientValue) ? clientValue[0] : clientValue;
    const impactValue = task.client_regulatory_impacts;
    const impact = Array.isArray(impactValue) ? impactValue[0] : impactValue;
    const sourceValue = impact?.regulatory_sources;
    const source = Array.isArray(sourceValue) ? sourceValue[0] : sourceValue;

    return {
      id: task.id,
      title: task.title,
      clientId: task.client_id,
      client: client?.display_name ?? "Firm-wide",
      authority: source?.authority ?? "Source not attached",
      due: task.due_at
        ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(task.due_at))
        : "No due date",
      dueAt: task.due_at,
      urgency: task.priority >= 3 ? "high" as const : task.priority === 2 ? "medium" as const : "low" as const,
      needsDecision: !impact || impact.review_state !== "approved",
      evidenceState: impact?.review_state === "approved" ? "verified" as const : "unverified" as const,
    };
  });

  return (
    <TodayExperience
      items={items}
      mode="product"
      verifiedSourceCount={items.filter((item) => item.evidenceState === "verified").length}
    />
  );
}
