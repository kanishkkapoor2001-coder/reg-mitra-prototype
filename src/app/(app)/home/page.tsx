import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { HomeChat } from "@/components/home-chat";
import { readPendingDecisions } from "@/lib/radar/impacts";
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
  const [{ data: tasks }, { count: clientCount }, { count: ruleCount }, pending] = await Promise.all([
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
    readPendingDecisions(supabase, workspace.id).catch((error) => {
      console.error("[home] pending decisions unavailable", error);
      return [];
    }),
  ]);

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

  const standing = overdue.length
    ? `${clientsInTrouble} ${clientsInTrouble === 1 ? "client needs" : "clients need"} you — ${overdue.length} ${overdue.length === 1 ? "filing is" : "filings are"} past due.`
    : open.length
      ? `Nothing overdue. ${open.length} ${open.length === 1 ? "filing is" : "filings are"} scheduled ahead.`
      : "Nothing overdue and nothing scheduled.";

  const lastChecked = new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", timeZone: "Asia/Kolkata",
  }).format(new Date(getCorpusHealth().generatedAt));

  const firstDecision = pending[0];

  return (
    <div className="home">
      <header className="home-hero">
        <p className="eyebrow">{dateLine}</p>
        <h1>{greeting}</h1>
      </header>

      <HomeChat />

      <div className="home-brief">
        {/* Where the practice stands — one sentence, one door. */}
        <Link className="home-line" href="/today">
          <span className={`home-line-copy${overdue.length ? " is-late" : ""}`}>{standing}</span>
          <span className="home-line-go">Open Today →</span>
        </Link>

        {/* What is waiting on a human. */}
        {pending.length ? (
          <Link className="home-line" href={firstDecision ? `/clients/${firstDecision.clientId}` : "/today"}>
            <span className="home-line-copy">
              {pending.length === 1 && firstDecision
                ? `One regulatory change is waiting on your decision — does it apply to ${firstDecision.clientName}?`
                : `${pending.length} regulatory changes are waiting on your decision.`}
            </span>
            <span className="home-line-go">Decide →</span>
          </Link>
        ) : null}

        {/* What the product is doing while nobody watches. */}
        <p className="home-watching">
          Watching {ruleCount ?? 0} rules for your {clientCount ?? 0}{" "}
          {(clientCount ?? 0) === 1 ? "client" : "clients"} · sources last checked {lastChecked} ·{" "}
          <Link className="text-link" href="/regulations">see what changed</Link>
        </p>
      </div>
    </div>
  );
}
