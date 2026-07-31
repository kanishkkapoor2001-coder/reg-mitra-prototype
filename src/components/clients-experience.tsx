"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ClientEditorDialog, type ClientEditorValue } from "@/components/client-editor-dialog";
import { SearchIcon } from "@/components/icons";
import {
  createManagedClient,
  managedClientHref,
  readManagedClients,
  useManagedClients,
  writeManagedClients,
} from "@/lib/public-client-store";
import type { RiskLevel } from "@/lib/types";

export interface PortfolioClient {
  id: string;
  name: string;
  identifier: string;
  sector: string;
  risk: RiskLevel;
  pending: number;
  nextDeadline: string;
  sourceStatus: string;
}

type SortKey = "name" | "identifier" | "risk" | "nextDeadline" | "pending" | "sourceStatus";

const riskRank: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };

export function ClientsExperience({
  clients,
  mode,
}: Readonly<{
  clients: readonly PortfolioClient[];
  mode: "demo" | "public" | "product";
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const risk = searchParams.get("risk") ?? "all";
  const sort = (searchParams.get("sort") ?? "risk") as SortKey;
  const direction = searchParams.get("direction") === "asc" ? "asc" : "desc";
  const browserClients = useManagedClients();
  const [editorOpen, setEditorOpen] = useState(false);

  const sourceClients = useMemo(() => {
    if (mode !== "public") return clients;
    return browserClients
      .filter((client) => !client.archived)
      .map((client) => ({
        id: client.id,
        name: client.displayName,
        identifier: client.identifiers[0] ?? "Not recorded",
        sector: [client.sector, client.location || client.stateCode].filter(Boolean).join(" · ") || "Profile incomplete",
        risk: client.risk,
        pending: client.tasks.filter((task) => task.state !== "complete").length,
        nextDeadline: client.tasks.find((task) => task.state !== "complete")?.due ?? "No deadline",
        sourceStatus: client.source === "sample" ? "Sample record" : "Browser record",
      }));
  }, [browserClients, clients, mode]);

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    });
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`);
  }

  function changeSort(key: SortKey) {
    updateParams({
      sort: key,
      direction: sort === key && direction === "asc" ? "desc" : "asc",
    });
  }

  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...sourceClients]
      .filter((client) => risk === "all" || client.risk === risk)
      .filter((client) =>
        !normalized
        || `${client.name} ${client.identifier} ${client.sector}`.toLowerCase().includes(normalized),
      )
      .sort((left, right) => {
        const leftValue = sort === "risk" ? riskRank[left.risk] : left[sort];
        const rightValue = sort === "risk" ? riskRank[right.risk] : right[sort];
        const comparison = typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "en-IN", { numeric: true });
        return direction === "asc" ? comparison : -comparison;
      });
  }, [direction, query, risk, sort, sourceClients]);

  const highRiskCount = sourceClients.filter((client) => client.risk === "high").length;

  function savePublicClient(value: ClientEditorValue) {
    const next = [...(browserClients ?? readManagedClients()), createManagedClient(value)];
    writeManagedClients(next);
    setEditorOpen(false);
  }

  return (
    <>
      <header className="portfolio-hero">
        <div>
          <p className="eyebrow">Client workspace</p>
          <h1>Clients</h1>
          <p>
            {mode === "demo"
              ? "Sample client profiles demonstrate the review workflow."
              : "Review recorded client facts, possible regulatory impact, and open work."}
          </p>
        </div>
        <div className="portfolio-stat">
          <strong>{highRiskCount}</strong>
          <span>{highRiskCount === 1 ? "client with" : "clients with"} high-priority work</span>
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
        <label className="filter-label">
          <span className="sr-only">Filter by highest task priority</span>
          <select
            className="filter-select"
            onChange={(event) => updateParams({ risk: event.target.value })}
            value={risk}
          >
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
        </label>
        <span className="result-count">{visibleClients.length} {visibleClients.length === 1 ? "client" : "clients"}</span>
        {mode === "product" ? (
          <Link className="button primary" href="/clients/new">Add client</Link>
        ) : mode === "public" ? (
          <button className="button primary" onClick={() => setEditorOpen(true)} type="button">Add client</button>
        ) : null}
      </div>

      {visibleClients.length ? (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <SortableHeading active={sort} direction={direction} label="Client" onSort={changeSort} sortKey="name" />
                <SortableHeading active={sort} direction={direction} label="Primary identifier" onSort={changeSort} sortKey="identifier" />
                <SortableHeading active={sort} direction={direction} label="Highest task priority" onSort={changeSort} sortKey="risk" />
                <SortableHeading active={sort} direction={direction} label="Next deadline" onSort={changeSort} sortKey="nextDeadline" />
                <SortableHeading active={sort} direction={direction} label="Open work" numeric onSort={changeSort} sortKey="pending" />
                <SortableHeading active={sort} direction={direction} label="Impact review" onSort={changeSort} sortKey="sourceStatus" />
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((client) => (
                <tr key={client.id}>
                  <th scope="row">
                    <Link href={managedClientHref(client.id)}>{client.name}</Link>
                    <small>{client.sector}</small>
                  </th>
                  <td className="client-identifier">{client.identifier}</td>
                  <td><span className={`risk-chip ${client.risk}`}>{client.risk}</span></td>
                  <td>{client.nextDeadline}</td>
                  <td className="numeric">{client.pending}</td>
                  <td>{client.sourceStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="empty-state portfolio-empty">
          <SearchIcon />
          <h2>{sourceClients.length ? "No clients match" : "Add your first client"}</h2>
          <p>{sourceClients.length ? "Change the search or priority filter." : "Create a client profile before mapping regulatory impact or assigning work."}</p>
          {sourceClients.length ? (
            <button className="button" onClick={() => router.replace(pathname)} type="button">Clear filters</button>
          ) : mode === "product" ? (
            <Link className="button primary" href="/clients/new">Add client</Link>
          ) : mode === "public" ? (
            <button className="button primary" onClick={() => setEditorOpen(true)} type="button">Add client</button>
          ) : null}
        </section>
      )}
      {mode === "public" ? (
        <>
          <p className="browser-storage-note">
            Open-product client records stay in this browser. Use a firm workspace before adding confidential client information.
          </p>
          <ClientEditorDialog
            onClose={() => setEditorOpen(false)}
            onSave={savePublicClient}
            open={editorOpen}
          />
        </>
      ) : null}
    </>
  );
}

function SortableHeading({
  active,
  direction,
  label,
  numeric = false,
  onSort,
  sortKey,
}: Readonly<{
  active: SortKey;
  direction: "asc" | "desc";
  label: string;
  numeric?: boolean;
  onSort: (key: SortKey) => void;
  sortKey: SortKey;
}>) {
  const isActive = active === sortKey;
  return (
    <th
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={numeric ? "numeric" : undefined}
      scope="col"
    >
      <button onClick={() => onSort(sortKey)} type="button">
        {label}<span aria-hidden="true">{isActive ? (direction === "asc" ? " ↑" : " ↓") : ""}</span>
      </button>
    </th>
  );
}
