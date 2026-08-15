import { cookies } from "next/headers";
import { ClientsExperience } from "@/components/clients-experience";
import { TIERS, clientLimitFor } from "@/lib/billing/tiers";
import { readWorkspaceRadarSummary, type ClientRadarSummary } from "@/lib/radar/impacts";
import { humanizeEnum } from "@/lib/format";
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
  // Disambiguated embed — see the note in (app)/today/page.tsx. Unqualified,
  // this returned PGRST201 and the roster rendered as "no clients yet".
  const { data, error } = await supabase
    .from("clients")
    .select("id, legal_name, display_name, sector, state_code, tasks!tasks_client_id_fkey(priority, state, due_at)")
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .order("display_name");

  if (error) console.error("[clients] client query failed", error);

  const radar = await readWorkspaceRadarSummary(supabase, workspace.id).catch((radarError) => {
    console.error("[clients] radar summary unavailable", radarError);
    return new Map<string, ClientRadarSummary>();
  });

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
    const summary = radar.get(client.id);

    return {
      id: client.id,
      name: client.display_name || client.legal_name,
      identifier: "Protected",
      sector: [humanizeEnum(client.sector), client.state_code].filter(Boolean).join(" · ") || "Profile incomplete",
      risk: highestPriority >= 3 ? "high" as const : highestPriority === 2 ? "medium" as const : "low" as const,
      pending: openTasks.length,
      nextDeadline: deadlines[0]
        ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(deadlines[0]))
        : "No deadline",
      // Reads what the matcher actually found, rather than the old blanket
      // "Not assessed" that every client showed.
      sourceStatus: !summary
        ? "Not scanned yet"
        : summary.flagged > 0
          ? `${summary.flagged} to review`
          : summary.needsFacts > 0
            ? `${summary.needsFacts} need facts`
            : summary.approved > 0
              ? `${summary.approved} approved`
              : "Nothing outstanding",
    };
  });

  return (
    <ClientsExperience
      clients={clients}
      mode="product"
      planName={TIERS[workspace.tier].name}
      clientLimit={clientLimitFor(workspace.tier)}
    />
  );
}
