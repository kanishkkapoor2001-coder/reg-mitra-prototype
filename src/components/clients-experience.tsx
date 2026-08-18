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
    <>
      <header className="portfolio-hero">
        <div>
          <p className="eyebrow">Client register</p>
          <h1>Clients</h1>
          {/* Says what the page is FOR. Without this the roster looks like a
              read-only report and nobody learns that the profile drives every
              match the product makes. */}
          <p>
            {mode === "demo"
              ? "Sample client profiles, showing the facts matching runs on."
              : incomplete
                ? `Reg Mitra matches circulars against what you record here. ${incomplete} ${incomplete === 1 ? "client is" : "clients are"} missing profile facts.`
                : "Reg Mitra matches circulars against what you record here."}
          </p>
        </div>
      </header>

      <div className="portfolio-controls">
        <label className="search-field">
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
        <span className="result-count">
          {visibleClients.length} {visibleClients.length === 1 ? "client" : "clients"}
        </span>
        {mode === "product" && clientLimit !== null ? (
          <span className={`plan-usage${clients.length >= clientLimit ? " is-full" : ""}`}>
            {clients.length} of {clientLimit} used{planName ? ` · ${planName}` : ""}
          </span>
        ) : null}
        {mode === "product" ? (
          clientLimit !== null && clients.length >= clientLimit ? (
            <Link className="button" href="/billing" title={`Your plan covers ${clientLimit} client companies`}>
              Plan full — upgrade
            </Link>
          ) : (
            <>
              <Link className="button primary" href="/clients/new">Add client</Link>
              <Link className="button" href="/clients/import">Import a spreadsheet</Link>
            </>
          )
        ) : null}
      </div>

      {visibleClients.length ? (
        <div className="roster">
          {visibleClients.map((client) => (
            <Link className="roster-row" href={`/clients/${client.id}`} key={client.id}>
              <span className="roster-name">
                <strong>{client.name}</strong>
                <small>{client.sector}</small>
              </span>

              {/* The page's own column: what it can fix. */}
              <span className={`roster-profile${client.unanswered ? " is-open" : ""}`}>
                {client.unanswered
                  ? `${client.unanswered} ${client.unanswered === 1 ? "question" : "questions"} unanswered`
                  : "Profile complete"}
              </span>

              <span className="roster-work">
                {client.undecided ? (
                  <span className="roster-flag">
                    {client.undecided} to decide
                  </span>
                ) : null}
                {client.pending
                  ? `${client.pending} open`
                  : <span className="roster-clear">Nothing open</span>}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="empty-state portfolio-empty">
          <SearchIcon />
          <h2>{clients.length ? "No clients match" : "Add your first client"}</h2>
          <p>
            {clients.length
              ? "Change the search."
              : "Record a client and their profile facts — matching runs on those facts."}
          </p>
          {clients.length ? (
            <button className="button" onClick={() => router.replace(pathname)} type="button">Clear search</button>
          ) : mode === "product" ? (
            <>
              <Link className="button primary" href="/clients/new">Add client</Link>
              <Link className="button" href="/clients/import">Import a spreadsheet</Link>
            </>
          ) : null}
        </section>
      )}
    </>
  );
}
