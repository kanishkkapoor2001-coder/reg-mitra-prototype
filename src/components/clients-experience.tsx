"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SearchIcon } from "@/components/icons";

// The roster — the firm's register of who it acts for, and what Reg Mitra
// knows about each of them.
//
// This page used to be a six-column sortable table of workload: highest task
// priority, next deadline, open work, impact review. All of that is Today's
// job, and Today does it better, so the page read as a worse second copy of
// another screen. Its own job — the profile facts every match is computed
// from — was not even a column.
//
// So the columns are now: who they are, what we know about them, and how much
// work is open (a pointer back to Today, not a workload view of its own).

export interface PortfolioClient {
  id: string;
  name: string;
  sector: string;
  /** Profile questions still unanswered — what only this page can fix. */
  unanswered: number;
  /** Regulatory changes waiting on a decision for this client. */
  undecided: number;
  pending: number;
}

export function ClientsExperience({
  clients,
  mode,
  planName,
  clientLimit = null,
}: Readonly<{
  clients: readonly PortfolioClient[];
  mode: "demo" | "public" | "product";
  planName?: string;
  /** null means unlimited. */
  clientLimit?: number | null;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    });
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`);
  }

  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...clients]
      .filter((client) =>
        !normalized || `${client.name} ${client.sector}`.toLowerCase().includes(normalized),
      )
      // Clients the page can still do something about come first: an
      // undecided change, then an incomplete profile, then the rest by name.
      .sort((left, right) => {
        if (left.undecided !== right.undecided) return right.undecided - left.undecided;
        if (left.unanswered !== right.unanswered) return right.unanswered - left.unanswered;
        return left.name.localeCompare(right.name, "en-IN");
      });
  }, [clients, query]);

  const incomplete = clients.filter((client) => client.unanswered > 0).length;

  return (
    <div className="q">
      <header className="q-head">
        <p className="q-date">Client register</p>
        <h1 className="q-verdict">
          {incomplete
            ? `${incomplete} ${incomplete === 1 ? "client is" : "clients are"} missing facts`
            : "Clients"}
        </h1>
        <p className="q-sub">
          {mode === "demo"
            ? "Sample profiles, showing the facts matching runs on."
            : "Reg Mitra matches circulars against what you record here."}
        </p>
        <p className="q-head-links">
          {mode === "product" ? (
            clientLimit !== null && clients.length >= clientLimit ? (
              <Link className="text-link" href="/billing">Plan full — upgrade</Link>
            ) : (
              <>
                <Link className="text-link" href="/clients/new">Add client</Link>
                <Link className="text-link" href="/clients/import">Import a spreadsheet</Link>
              </>
            )
          ) : null}
        </p>
      </header>

      <label className="q-search">
        <SearchIcon />
        <span className="sr-only">Search clients</span>
        <input
          aria-label="Search clients"
          defaultValue={query}
          key={query}
          onChange={(event) => updateParams({ q: event.target.value || null })}
          placeholder="Find a client"
        />
      </label>

      {visibleClients.length ? (
        <div className="q-list">
          {visibleClients.map((client) => (
            <Link className="q-client-row" href={`/clients/${client.id}`} key={client.id}>
              <span className="q-client-name">{client.name}</span>
              <span className="q-client-sum">
                {[
                  client.undecided ? `${client.undecided} to decide` : "",
                  client.pending ? `${client.pending} open` : "",
                  client.unanswered ? `${client.unanswered} unanswered` : "",
                ].filter(Boolean).join(" · ") || "clear"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="q-empty">
          {clients.length ? (
            <>Nothing matches that search.</>
          ) : mode === "product" ? (
            <>No clients yet. <Link className="text-link" href="/clients/new">Add your first client</Link>.</>
          ) : "No clients."}
        </p>
      )}

      <p className="q-watch">
        {visibleClients.length} of {clients.length} {clients.length === 1 ? "client" : "clients"}
        {mode === "product" && clientLimit !== null
          ? ` · ${clients.length} of ${clientLimit} on ${planName ?? "your plan"}`
          : ""}
      </p>
    </div>
  );
}
