import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ClientProfile } from "@/components/client-profile";
import { ClientRadar } from "@/components/client-radar";
import { ClientWork } from "@/components/client-work";
import { DemoNotice } from "@/components/demo-notice";
import { DemoIntegrationCenter } from "@/components/demo-integration-center";
import { EvidencePanel } from "@/components/evidence-panel";
import { deriveFactsFromIdentifiers, readClientFactMap } from "@/lib/radar/client-facts";
import { readClientImpacts } from "@/lib/radar/impacts";
import { ATTRIBUTE_DEFINITIONS, type CompanyFact } from "@/lib/radar/facts";
import { clients, getClient, workItems } from "@/lib/demo-data";
import { asInstruction, humanizeEnum } from "@/lib/format";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { getCurrentWorkspace, type CurrentWorkspace } from "@/lib/workspace";
import type { EvidenceRecord } from "@/lib/types";

interface ClientPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
}

export function generateStaticParams() {
  return clients.map((client) => ({ id: client.id }));
}

// Sample-workspace profile, inferred from the demo client's own description.
// Only facts the sample data actually evidences are filled in — the rest stay
// unanswered, so the sample shows the same honest gaps a real book would.
function sampleFactsFor(
  sector: string,
  location: string,
  identifiers: readonly string[],
): Map<string, CompanyFact> {
  const observedAt = new Date().toISOString();
  const facts = new Map<string, CompanyFact>();
  const add = (key: string, value: CompanyFact["value"], derivedFrom?: string) => {
    facts.set(key, {
      key,
      value,
      source: derivedFrom ? "derived" : "ca_confirmed",
      observedAt,
      expiresAt: null,
      derivedFrom,
    });
  };

  const sectorKey = /pharma|manufact/i.test(sector)
    ? "MANUFACTURING"
    : /food/i.test(sector)
      ? "FOOD"
      : /tech|it\b/i.test(sector)
        ? "TECHNOLOGY"
        : /textile|retail|trading/i.test(sector)
          ? "RETAIL"
          : /trust|charit/i.test(sector)
            ? "CHARITABLE"
            : "OTHER";
  add("company.sector", sectorKey);

  const state = location.split(",").pop()?.trim();
  if (state) add("company.registered_state", state);

  if (identifiers.some((id) => id.startsWith("GSTIN"))) {
    add("company.gst_registered", true, "GSTIN on file");
  }
  if (identifiers.some((id) => id.startsWith("CIN"))) {
    add("company.entity_type", "PRIVATE_LIMITED");
  }
  return facts;
}

export default async function ClientPage({ params, searchParams }: ClientPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const isDemo = (await cookies()).get("reg_mitra_session")?.value === "demo";
  const workspace = !isDemo && getSupabasePublicConfig()
    ? await getCurrentWorkspace()
    : null;

  if (workspace) {
    return <ProductClientPage id={id} workspace={workspace} saved={query.saved === "1"} />;
  }

  const client = getClient(id);
  if (!client) notFound();
  const items = workItems.filter((item) => item.client === client.shortName);
  // Sample facts so a visitor can see what the matcher runs on. Read-only:
  // there is no workspace to record anything against.
  const sampleFacts = sampleFactsFor(client.sector, client.location, client.identifiers);
  const clientEvidence: EvidenceRecord = {
    state: "demo",
    source: null,
    applicability: `Sample profile for ${client.sector} workflows.`,
    reviewState: "not-reviewed",
    reviewedBy: null,
    caveat: "Identifiers, obligations, and statuses are sample data. Confirm against client records and official portals.",
  };

  return (
    <>
      <Link className="text-link" href="/clients">← All clients</Link>
      <section className="detail-hero" style={{ marginTop: 16 }}>
        <span className="detail-avatar">{client.initials}</span>
        <div>
          <h1>{client.name}</h1>
          <p className="page-subtitle">{client.sector} · {client.location}</p>
          <div className="identifier-list">{client.identifiers.map((identifier) => <span className="identifier" key={identifier}>{identifier}</span>)}</div>
        </div>
      </section>
      <DemoNotice />
      {client.id === "sharma" ? <DemoIntegrationCenter /> : null}
      <div style={{ marginBottom: 18 }}>
        <EvidencePanel evidence={clientEvidence} />
      </div>
      <ClientProfile clientId={client.id} facts={sampleFacts} editable={false} />
      <section className="client-section">
        <div className="client-section-head">
          <h2>Their work</h2>
          <p>Sample filings recorded against this profile.</p>
        </div>
        {items.length ? (
          <div className="client-work-list">
            {items.map((item) => (
              <div className="session-item" key={item.id}>
                <span className="session-item-copy">
                  <strong>{item.title}</strong>
                  <small>{item.authority}</small>
                </span>
                <span className={`decision-due ${item.urgency}`}>{item.due}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="client-section-empty">No sample work for this client.</p>
        )}
      </section>
    </>
  );
}

async function ProductClientPage({
  id,
  workspace,
  saved,
}: Readonly<{ id: string; workspace: CurrentWorkspace; saved: boolean }>) {
  const supabase = await createSupabaseServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, display_name, sector, state_code, created_at, tasks!tasks_client_id_fkey(id, title, state, priority, due_at, metadata, client_regulatory_impacts(regulatory_sources(authority)))")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  if (!client) notFound();

  // Impacts and the rule count depend on nothing below, so they run while the
  // fact derivation chain (which must stay ordered: derive, then read) does.
  const impactsPromise = readClientImpacts(supabase, client.id).catch((error) => {
    console.error("[client] impacts unavailable", error);
    return [];
  });
  const ruleCountPromise = supabase
    .from("regulatory_rules")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .then(({ count }) => count ?? 0);

  // Facts the firm already proved by holding a document cost the CA nothing to
  // confirm, so they are recorded before the profile is rendered.
  const user = await getServerUser();
  if (user) {
    try {
      await deriveFactsFromIdentifiers(supabase, {
        workspaceId: workspace.id,
        clientId: client.id,
        recordedBy: user.id,
      });
    } catch (error) {
      console.error("[client] fact derivation failed", error);
    }
  }
  const facts = await readClientFactMap(supabase, client.id);

  const [impacts, ruleCount] = await Promise.all([impactsPromise, ruleCountPromise]);

  const openTasks = (client.tasks ?? [])
    .filter((task) => task.state !== "completed" && task.state !== "dismissed")
    .sort((left, right) => right.priority - left.priority);
  const answeredFacts = ATTRIBUTE_DEFINITIONS.filter((d) => facts.has(d.key)).length;
  const initials = client.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");

  const profileIncomplete = answeredFacts < ATTRIBUTE_DEFINITIONS.length;
  const startOfToday = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
  const weekOut = new Date(startOfToday);
  weekOut.setDate(weekOut.getDate() + 7);

  // The first line of the page answers the only question a CA opens a client
  // file with: where do they stand. Everything below is the detail of that
  // answer — never a questionnaire. The profile stays last, always: asking
  // before telling was what made this page read as pointless.
  const overdueCount = openTasks.filter((task) => task.due_at && new Date(task.due_at) < startOfToday).length;
  const weekCount = openTasks.filter((task) => {
    if (!task.due_at) return false;
    const due = new Date(task.due_at);
    return due >= startOfToday && due <= weekOut;
  }).length;
  const undecidedCount = impacts.filter((impact) => impact.reviewState === "not_reviewed").length;
  const standing = [
    overdueCount ? `${overdueCount} ${overdueCount === 1 ? "filing" : "filings"} overdue` : "",
    weekCount ? `${weekCount} due this week` : "",
    undecidedCount ? `${undecidedCount} ${undecidedCount === 1 ? "change" : "changes"} waiting on your decision` : "",
  ].filter(Boolean).join(" · ")
    || (openTasks.length ? `Nothing urgent — ${openTasks.length} scheduled later` : "All clear — nothing open");

  return (
    <div className="q">
      <p className="q-back"><Link className="text-link" href="/clients">← All clients</Link></p>

      {/* Class 1: where they stand. The identity line is metadata above it,
          and the profile gap is a link, not a banner. */}
      <header className="q-head">
        <p className="q-date">
          {[client.legal_name, humanizeEnum(client.sector), client.state_code].filter(Boolean).join(" · ")}
        </p>
        <h1 className="q-verdict">{client.display_name}</h1>
        <p className={`q-sub${overdueCount ? " late" : ""}`}>{standing}</p>
        {profileIncomplete ? (
          <p className="q-head-links">
            <a className="text-link" href="#profile">
              {ATTRIBUTE_DEFINITIONS.length - answeredFacts} profile{" "}
              {ATTRIBUTE_DEFINITIONS.length - answeredFacts === 1 ? "question" : "questions"} unanswered
            </a>
          </p>
        ) : null}
      </header>

      <ClientRadar
        impacts={impacts}
        editable={workspace.role !== "viewer"}
        hasRules={ruleCount > 0}
      />

      {/* Their work — the same rows and buttons as Today, so a filing can be
          recorded from wherever the CA happens to be looking. */}
      <ClientWork
        clientName={client.display_name}
        editable={workspace.role !== "viewer"}
        items={openTasks.map((task) => {
          const impactValue = task.client_regulatory_impacts;
          const impact = Array.isArray(impactValue) ? impactValue[0] : impactValue;
          const sourceValue = impact?.regulatory_sources;
          const source = Array.isArray(sourceValue) ? sourceValue[0] : sourceValue;
          const metadata = (task.metadata ?? {}) as { authority?: string };
          return {
          id: task.id,
          // The client's name is the page title; repeating it on every row
          // ("EPF · Anna Foods", on Anna Foods' own page) is noise.
          title: asInstruction(task.title, ""),
          authority: source?.authority ?? metadata.authority ?? "Scheduled obligation",
          due: task.due_at
            ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(task.due_at))
            : "No due date",
          dueAt: task.due_at,
          overdue: Boolean(task.due_at && new Date(task.due_at) < startOfToday),
          };
        })}
      />

      <ClientProfile
        clientId={client.id}
        facts={facts}
        editable={workspace.role !== "viewer"}
        saved={saved}
      />
    </div>
  );
}
