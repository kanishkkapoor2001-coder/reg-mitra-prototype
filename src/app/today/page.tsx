import { cookies } from "next/headers";
import { TodayExperience } from "@/components/today-experience";
import { workItems } from "@/lib/demo-data";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const generatedNotices: Record<string, string> = {
  no_clients: "Add a client first — then build the queue from the statutory calendar.",
  denied: "You do not have access to build the queue in this workspace.",
  error: "The queue could not be built. Please try again.",
  "0": "Your queue is already up to date — no new statutory items to add.",
};

function noticeForGenerated(value: string | undefined): string {
  if (!value) return "";
  if (generatedNotices[value]) return generatedNotices[value];
  const count = Number(value);
  if (Number.isFinite(count) && count > 0) {
    return `Added ${count} ${count === 1 ? "item" : "items"} to your queue from the statutory calendar. Confirm applicability before acting.`;
  }
  return "";
}

export default async function TodayPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ generated?: string }> }>) {
  const params = await searchParams;
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
        hasClients
      />
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data }, { count: clientCount }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, priority, due_at, state, reviewed_at, client_id, metadata, clients(display_name), client_regulatory_impacts(review_state, regulatory_sources(authority))")
      .eq("workspace_id", workspace.id)
      .is("reviewed_at", null)
      .not("state", "in", '("completed","dismissed")')
      .order("priority", { ascending: false })
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "active"),
  ]);

  const items = (data ?? []).map((task) => {
    const clientValue = task.clients;
    const client = Array.isArray(clientValue) ? clientValue[0] : clientValue;
    const impactValue = task.client_regulatory_impacts;
    const impact = Array.isArray(impactValue) ? impactValue[0] : impactValue;
    const sourceValue = impact?.regulatory_sources;
    const source = Array.isArray(sourceValue) ? sourceValue[0] : sourceValue;
    const metadata = (task.metadata ?? {}) as { authority?: string };

    return {
      id: task.id,
      title: task.title,
      clientId: task.client_id,
      client: client?.display_name ?? "Firm-wide",
      authority: source?.authority ?? metadata.authority ?? "Source not attached",
      due: task.due_at
        ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(task.due_at))
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
      hasClients={(clientCount ?? 0) > 0}
      notice={noticeForGenerated(params.generated)}
    />
  );
}
