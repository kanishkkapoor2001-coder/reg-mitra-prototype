import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { DemoNotice } from "@/components/demo-notice";
import { DemoIntegrationCenter } from "@/components/demo-integration-center";
import { EvidencePanel } from "@/components/evidence-panel";
import { ReviewGate } from "@/components/review-gate";
import { PublicClientWorkspace } from "@/components/public-client-workspace";
import { ProductClientActions } from "@/components/product-client-actions";
import { clients, getClient, workItems } from "@/lib/demo-data";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace, type CurrentWorkspace } from "@/lib/workspace";
import type { EvidenceRecord } from "@/lib/types";

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return clients.map((client) => ({ id: client.id }));
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  const isDemo = (await cookies()).get("reg_mitra_session")?.value === "demo";
  const workspace = !isDemo && getSupabasePublicConfig()
    ? await getCurrentWorkspace()
    : null;

  if (workspace) {
    return <ProductClientPage id={id} workspace={workspace} />;
  }

  const client = getClient(id);
  if (!isDemo) {
    return <PublicClientWorkspace id={id} />;
  }
  if (!client) notFound();
  const items = workItems.filter((item) => item.client === client.shortName);
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
          <p className="eyebrow">Client profile</p>
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
      <section className="kpi-grid">
        <article className="kpi-card"><span className="kpi-label">Open work</span><div className="kpi-value">{client.pending}</div><div className="kpi-meta"><span>Needs review</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Items due this week</span><div className="kpi-value">{client.dueThisWeek}</div><div className="kpi-meta"><span>Sample dates</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Items marked complete</span><div className="kpi-value">{client.compliant}</div><div className="kpi-meta"><span>Sample status only</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Connection examples</span><div className="kpi-value">{client.id === "sharma" ? "4" : "0"}</div><div className="kpi-meta"><span>{client.id === "sharma" ? "Sample systems" : "Set up in Settings"}</span></div></article>
      </section>
      <section className="panel">
        <div className="panel-header"><div><h2>Open work</h2><p>Items associated with this client profile</p></div><Link className="button" href={`/assistant?prompt=${encodeURIComponent(`What needs attention for ${client.shortName}?`)}`}>Ask about client</Link></div>
        {items.length ? (
          <ul className="work-list">{items.map((item) => <li className="work-item" key={item.id}><i className={`urgency-dot ${item.urgency}`} /><div><p className="work-title">{item.title}</p><span className="work-meta">{item.authority} · {item.state.replace("-", " ")}</span></div><span className="due">{item.due}</span></li>)}</ul>
        ) : (
          <div className="empty-state"><h2>No actions listed</h2><p>Prepare a review path in Assistant, or attach an official source before tracking work.</p><Link className="button" href={`/assistant?prompt=${encodeURIComponent(`Prepare a compliance review for ${client.shortName}`)}`}>Prepare review</Link></div>
        )}
      </section>
      <div style={{ marginTop: 14 }}>
        <ReviewGate
          title="Professional review required before action"
          description="Confirm the source, period, client applicability, and filing position. Reg Mitra does not replace professional judgement or an official portal."
        >
          <div className="button-row">
            <Link className="button small" href={`/assistant?prompt=${encodeURIComponent(`Prepare a review checklist for ${client.shortName}`)}`}>Prepare review checklist</Link>
            <span className="locked-action">Approval unlocks after evidence and a reviewer are recorded.</span>
          </div>
        </ReviewGate>
      </div>
    </>
  );
}

async function ProductClientPage({
  id,
  workspace,
}: Readonly<{ id: string; workspace: CurrentWorkspace }>) {
  const supabase = await createSupabaseServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, display_name, sector, state_code, created_at, tasks(id, title, state, priority, due_at)")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  if (!client) notFound();

  const openTasks = (client.tasks ?? [])
    .filter((task) => task.state !== "completed" && task.state !== "dismissed")
    .sort((left, right) => right.priority - left.priority);
  const highPriorityTasks = openTasks.filter((task) => task.priority >= 3).length;
  const initials = client.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");

  return (
    <>
      <Link className="text-link" href="/clients">← All clients</Link>
      <section className="detail-hero" style={{ marginTop: 16 }}>
        <span className="detail-avatar">{initials || "CL"}</span>
        <div>
          <p className="eyebrow">Client profile</p>
          <h1>{client.display_name}</h1>
          <p className="page-subtitle">
            {[client.legal_name, client.sector, client.state_code].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ProductClientActions
            client={{
              id: client.id,
              legalName: client.legal_name,
              displayName: client.display_name,
              sector: client.sector ?? "",
              stateCode: client.state_code ?? "",
            }}
          />
        </div>
      </section>
      <div className="notice">
        <strong>This client profile needs more information.</strong>
        Add registrations and applicability facts before relying on client-specific regulatory conclusions.
      </div>
      <section className="kpi-grid">
        <article className="kpi-card"><span className="kpi-label">Open work</span><div className="kpi-value">{openTasks.length}</div><div className="kpi-meta"><span>Saved in this workspace</span></div></article>
        <article className="kpi-card"><span className="kpi-label">High priority</span><div className="kpi-value">{highPriorityTasks}</div><div className="kpi-meta"><span>Based on recorded task priority</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Identifiers</span><div className="kpi-value">—</div><div className="kpi-meta"><span>Not yet recorded</span></div></article>
        <article className="kpi-card"><span className="kpi-label">Source connections</span><div className="kpi-value">0</div><div className="kpi-meta"><span>No client portal connected</span></div></article>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div><h2>Open work</h2><p>Tasks recorded for this client</p></div>
          <Link className="button" href={`/assistant?client=${client.id}`}>Ask about client</Link>
        </div>
        {openTasks.length ? (
          <ul className="work-list">
            {openTasks.map((item) => (
              <li className="work-item" key={item.id}>
                <i className={`urgency-dot ${item.priority >= 3 ? "high" : item.priority === 2 ? "medium" : "low"}`} />
                <div>
                  <p className="work-title">{item.title}</p>
                  <span className="work-meta">{item.state.replaceAll("_", " ")}</span>
                </div>
                <span className="due">
                  {item.due_at
                    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(item.due_at))
                    : "No due date"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h2>No open work</h2>
            <p>Map a source-supported regulatory impact before creating a client action.</p>
            <Link className="button" href={`/assistant?client=${client.id}`}>Start a source review</Link>
          </div>
        )}
      </section>
      <div style={{ marginTop: 14 }}>
        <ReviewGate
          title="Professional review required before action"
          description="Confirm the official source, effective period, client facts, applicability, and filing position before advice or execution."
        />
      </div>
    </>
  );
}
