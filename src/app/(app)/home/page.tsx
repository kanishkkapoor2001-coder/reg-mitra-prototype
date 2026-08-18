import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { HomeChat } from "@/components/home-chat";
import { getCorpusHealth } from "@/lib/rag/corpus";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home" };

// The front door. Signing in used to drop a CA straight into the middle of a
// work queue — no greeting, no sense of what the product had been doing for
// them overnight, no place to just ask a question. This page is a morning
// brief: where the practice stands, what is waiting on a decision, what Reg
// Mitra is watching — and one input. It is deliberately not a dashboard; the
// numbers live where the work lives.

function istNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

export default async function HomePage() {
  const isDemo = (await cookies()).get("reg_mitra_session")?.value === "demo";
  const workspace = isDemo || !getSupabasePublicConfig()
    ? null
    : await getCurrentWorkspace();

  // The sample experience already has a home: Today's worked example.
  if (!workspace) redirect("/today");

  const supabase = await createSupabaseServerClient();
  const [{ data: tasks }, { count: clientCount }, { count: ruleCount }, { data: recentSources }] = await Promise.all([
    supabase
      .from("tasks")
      .select("due_at, client_id, clients!tasks_client_id_fkey(display_name)")
      .eq("workspace_id", workspace.id)
      .is("reviewed_at", null)
      .not("state", "in", '("completed","dismissed")'),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "active"),
    supabase
      .from("regulatory_rules")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("regulatory_sources")
      .select("id, authority, title, canonical_url, published_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(12),
  ]);

  // The workspace's read of each recent change: which clients it matched and
  // where the decision stands. This is the sentence the page exists for.
  const sourceIds = (recentSources ?? []).map((source) => source.id);
  const { data: sourceImpacts } = sourceIds.length
    ? await supabase
        .from("client_regulatory_impacts")
        .select("source_id, client_id, review_state, decision, clients!client_regulatory_impacts_client_id_fkey(display_name)")
        .eq("workspace_id", workspace.id)
        .in("source_id", sourceIds)
    : { data: [] };

  type SourceRead = { pending: string[]; pendingClientId: string | null; approved: string[]; needsFacts: boolean; reviewed: boolean };
  const readBySource = new Map<string, SourceRead>();
  for (const impact of sourceImpacts ?? []) {
    const read = readBySource.get(impact.source_id)
      ?? { pending: [], pendingClientId: null, approved: [], needsFacts: false, reviewed: false };
    const clientValue = impact.clients;
    const clientName = (Array.isArray(clientValue) ? clientValue[0] : clientValue)?.display_name ?? "a client";
    if (impact.decision === "more_information_needed") read.needsFacts = true;
    else if (impact.decision !== "no_detected_connection") {
      if (impact.review_state === "approved") read.approved.push(clientName);
      else if (impact.review_state === "rejected") read.reviewed = true;
      else {
        read.pending.push(clientName);
        read.pendingClientId ??= impact.client_id;
      }
    }
    readBySource.set(impact.source_id, read);
  }

  const brief = (recentSources ?? []).map((source) => {
    const read = readBySource.get(source.id);
    const verdict = read?.pending.length
      ? { text: `may apply to ${read.pending[0]}${read.pending.length > 1 ? ` +${read.pending.length - 1}` : ""} — decide`, kind: "act" as const }
      : read?.approved.length
        ? { text: `applies to ${read.approved[0]}${read.approved.length > 1 ? ` +${read.approved.length - 1}` : ""}`, kind: "done" as const }
        : read?.needsFacts
          ? { text: "needs a client fact", kind: "quiet" as const }
          : read?.reviewed
            ? { text: "reviewed — not applicable", kind: "quiet" as const }
            : { text: "doesn’t affect your clients", kind: "quiet" as const };
    return {
      id: source.id,
      publishedAt: source.published_at ?? "",
      clientHref: read?.pendingClientId ? `/clients/${read.pendingClientId}` : null,
      authority: source.authority,
      title: source.title,
      url: source.canonical_url,
      date: source.published_at
        ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(source.published_at))
        : "",
      verdict,
    };
  })
    .sort((a, b) => {
      const rank = { act: 0, done: 1, quiet: 2 } as const;
      if (rank[a.verdict.kind] !== rank[b.verdict.kind]) return rank[a.verdict.kind] - rank[b.verdict.kind];
      return b.publishedAt.localeCompare(a.publishedAt);
    })
    .slice(0, 5);

  const now = istNow();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const open = tasks ?? [];
  const overdue = open.filter((task) => task.due_at && new Date(task.due_at) < startOfToday);
  const clientsInTrouble = new Set(overdue.map((task) => task.client_id ?? "firm")).size;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLine = new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  }).format(now);

  const actionable = brief.filter((item) => item.verdict.kind === "act");
  const headline = actionable.length
    ? `${actionable.length === 1 ? "One new change" : `${actionable.length} new changes`} may touch your clients`
    : "Nothing new touches your clients";

  const standing = overdue.length
    ? `${clientsInTrouble} ${clientsInTrouble === 1 ? "client needs" : "clients need"} you — ${overdue.length} ${overdue.length === 1 ? "filing is" : "filings are"} past due.`
    : open.length
      ? `Nothing overdue. ${open.length} ${open.length === 1 ? "filing is" : "filings are"} scheduled ahead.`
      : "Nothing overdue and nothing scheduled.";

  const lastChecked = new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", timeZone: "Asia/Kolkata",
  }).format(new Date(getCorpusHealth().generatedAt));


  return (
    <div className="home q">
      <header className="q-head">
        <p className="q-date">{dateLine} · {greeting}</p>
        <h1 className="q-verdict">{headline}</h1>
        {/* Proof of work even when the answer is "nothing": the reason a firm
            keeps paying is knowing the checking happened. */}
        <p className="q-sub">
          {standing} Watching {ruleCount ?? 0} rules for your {clientCount ?? 0}{" "}
          {(clientCount ?? 0) === 1 ? "client" : "clients"}; sources last checked {lastChecked}.
        </p>
      </header>

      <HomeChat />

      <section className="q-section">
        <h2 className="q-section-head">
          From the regulators
          <span>latest changes, read against your book</span>
        </h2>
        <div className="q-list home-brief-list">
          {brief.map((item) => (
            <a
              className="q-client-row"
              href={item.verdict.kind === "act" && item.clientHref ? item.clientHref : item.url}
              key={item.id}
              rel={item.verdict.kind === "act" ? undefined : "noreferrer"}
              target={item.verdict.kind === "act" ? undefined : "_blank"}
            >
              <span className="home-brief-copy">
                <span className="home-brief-authority">{item.authority}</span>
                <span className="q-line-main">{item.title}</span>
              </span>
              <span className={`q-client-sum home-verdict-${item.verdict.kind}`}>
                {item.verdict.text}{item.date && item.verdict.kind === "quiet" ? ` · ${item.date}` : ""}
              </span>
            </a>
          ))}
          {!brief.length ? (
            <p className="q-empty">No regulatory changes recorded yet.</p>
          ) : null}
        </div>
      </section>

      <p className="q-actions home-foot">
        <Link className="q-act strong" href="/today">Open Today — {standing.toLowerCase()}</Link>
        <Link className="q-act" href="/regulations">All updates</Link>
      </p>
    </div>
  );
}
