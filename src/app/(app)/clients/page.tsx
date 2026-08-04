import { cookies } from "next/headers";
import { ClientsExperience } from "@/components/clients-experience";
import { clients as demoClients } from "@/lib/demo-data";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function ClientsPage() {
  const isDemo = (await cookies()).get("reg_mitra_session")?.value === "demo";

  const workspace = isDemo || !getSupabasePublicConfig()
    ? null
    : await getCurrentWorkspace();

  if (!workspace) {
    return (
      <ClientsExperience
        clients={demoClients.map((client) => ({
          id: client.id,
          name: client.shortName,
          identifier: client.identifiers[0] ?? "Not recorded",
          sector: client.sector,
          risk: client.risk,
          pending: client.pending,
          nextDeadline: client.dueThisWeek ? "This week" : "No deadline",
          sourceStatus: "Sample data",
        }))}
        mode="public"
      />
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("id, legal_name, display_name, sector, state_code, tasks(priority, state, due_at), client_regulatory_impacts(review_state)")
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .order("display_name");

  const clients = (data ?? []).map((client) => {
    const openTasks = (client.tasks ?? []).filter(
      (task) => task.state !== "completed" && task.state !== "dismissed",
    );
    const highestPriority = openTasks.reduce(
      (highest, task) => Math.max(highest, task.priority),
      0,
    );
    const deadlines = openTasks
      .map((task) => task.due_at)
      .filter((value): value is string => Boolean(value))
      .sort();
    const impacts = client.client_regulatory_impacts ?? [];
    const reviewed = impacts.length > 0 && impacts.every((impact) => impact.review_state === "approved");

    return {
      id: client.id,
      name: client.display_name || client.legal_name,
      identifier: "Protected",
      sector: [client.sector, client.state_code].filter(Boolean).join(" · ") || "Profile incomplete",
      risk: highestPriority >= 3 ? "high" as const : highestPriority === 2 ? "medium" as const : "low" as const,
      pending: openTasks.length,
      nextDeadline: deadlines[0]
        ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(deadlines[0]))
        : "No deadline",
      sourceStatus: impacts.length === 0 ? "Not assessed" : reviewed ? "Reviewed" : "Needs review",
    };
  });

  return <ClientsExperience clients={clients} mode="product" />;
}
