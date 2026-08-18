import { cookies } from "next/headers";
import { ClientsExperience } from "@/components/clients-experience";
import { TIERS, clientLimitFor } from "@/lib/billing/tiers";
import { readWorkspaceRadarSummary, type ClientRadarSummary } from "@/lib/radar/impacts";
import { ATTRIBUTE_DEFINITIONS } from "@/lib/radar/facts";
import { humanizeEnum } from "@/lib/format";
import { clients as demoClients } from "@/lib/demo-data";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients" };

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
          sector: client.sector,
          unanswered: 0,
          undecided: 0,
          pending: client.pending,
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

  // Profile completeness is what this page is for, so it is read here rather
  // than left to a per-client fetch on the detail page.
  const [radar, { data: factRows }] = await Promise.all([
    readWorkspaceRadarSummary(supabase, workspace.id).catch((radarError) => {
      console.error("[clients] radar summary unavailable", radarError);
      return new Map<string, ClientRadarSummary>();
    }),
    supabase
      .from("client_facts")
      .select("client_id, fact_key")
      .eq("workspace_id", workspace.id)
      .is("superseded_at", null),
  ]);

  const trackedKeys = new Set(ATTRIBUTE_DEFINITIONS.map((definition) => definition.key));
  const answeredByClient = new Map<string, Set<string>>();
  for (const row of factRows ?? []) {
    if (!trackedKeys.has(row.fact_key)) continue;
    const answered = answeredByClient.get(row.client_id) ?? new Set<string>();
    answered.add(row.fact_key);
    answeredByClient.set(row.client_id, answered);
  }

  const clients = (data ?? []).map((client) => {
    const openTasks = (client.tasks ?? []).filter(
      (task) => task.state !== "completed" && task.state !== "dismissed",
    );
    const summary = radar.get(client.id);

    return {
      id: client.id,
      name: client.display_name || client.legal_name,
      sector: [humanizeEnum(client.sector), client.state_code].filter(Boolean).join(" · ") || "Sector not recorded",
      unanswered: ATTRIBUTE_DEFINITIONS.length - (answeredByClient.get(client.id)?.size ?? 0),
      undecided: summary?.flagged ?? 0,
      pending: openTasks.length,
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
